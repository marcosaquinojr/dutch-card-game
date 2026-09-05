import { GameRoom, CardModel, ClientGameState, RoomState } from './types';
import { createDeck, shuffleDeck, dealCards } from './deck';

export class GameEngine {
  /**
   * No Dutch clássico, o jogador olha 2 de suas 4 cartas no início por 5s.
   * Por padrão, olha as duas cartas da frente/baixo (índices 2 e 3 em grade 2x2, ou 0 e 1).
   */
  static getInitialVisibleIndices(cardsPerPlayer: number): number[] {
    if (cardsPerPlayer >= 4) {
      return [2, 3]; // As duas cartas inferiores da grade 2x2
    }
    return [0, 1];
  }

  /**
   * Inicia uma nova rodada: embaralha, distribui 4 cartas em grade, define fase 'memorize'
   */
  static startRound(room: GameRoom): void {
    const deck = shuffleDeck(createDeck(room.settings.specialCards));
    const cardsPerPlayer = room.settings.cardsPerPlayer || 4;
    const { hands, remainingDeck } = dealCards(deck, room.players.length, cardsPerPlayer);

    room.deck = remainingDeck;

    // Configura primeira carta no topo do monte de descarte
    const firstDiscard = room.deck.pop();
    if (firstDiscard) {
      room.discardPile = [firstDiscard];
    }

    const initialVisible = this.getInitialVisibleIndices(cardsPerPlayer);

    room.players.forEach((player, i) => {
      player.hand = hands[i];
      player.knownCards = [...initialVisible];
    });

    room.phase = 'memorize';
    room.dutchCallerId = null;
    room.drawnCard = null;
    room.lockedPlayerIds = [];
    room.pendingEffect = null;
    room.round += 1;
    room.currentTurnIndex = (room.round - 1) % room.players.length;
  }

  /**
   * Transição memorize -> playing após timeout de 5 segundos.
   * As cartas vistas inicialmente são viradas de volta para baixo.
   */
  static endMemorize(room: GameRoom): void {
    if (room.phase === 'memorize') {
      room.phase = 'playing';
      room.turnStartedAt = Date.now();
      room.players.forEach((p) => {
        p.knownCards = [];
      });
    }
  }

  /**
   * Verifica se é o turno do jogador
   */
  static isPlayerTurn(room: GameRoom, playerId: string): boolean {
    return room.players[room.currentTurnIndex]?.id === playerId;
  }

  /**
   * Jogador compra carta do monte. Retorna a carta comprada.
   */
  static drawFromDeck(room: GameRoom, playerId: string): CardModel | null {
    if (!this.isPlayerTurn(room, playerId)) return null;
    if (room.phase !== 'playing' && room.phase !== 'dutch-called') return null;
    if (room.drawnCard) return room.drawnCard; // já comprou

    let card = room.deck.pop();
    if (!card && room.discardPile.length > 1) {
      // Re-embaralha o descarte (menos o topo) se o baralho acabar
      const topDiscard = room.discardPile.pop()!;
      room.deck = shuffleDeck([...room.discardPile]);
      room.discardPile = [topDiscard];
      card = room.deck.pop();
    }

    if (card) {
      room.drawnCard = card;
    }

    return card || null;
  }

  /**
   * Cartas descartadas são permanentes — não é possível comprar do descarte.
   */
  static drawFromDiscard(room: GameRoom, playerId: string): CardModel | null {
    return null;
  }

  /**
   * Descarta a carta que acabou de comprar do monte.
   * Verifica se ativa efeito de descarte especial:
   * - Dama (Q) -> espiar carta própria
   * - Valete (J) -> trocar 2 cartas na mesa
   */
  static discardDrawnCard(room: GameRoom, playerId: string): {
    card: CardModel | null;
    effect: 'queen-peek' | 'jack-swap' | null;
  } {
    if (!this.isPlayerTurn(room, playerId)) return { card: null, effect: null };
    if (!room.drawnCard) return { card: null, effect: null };

    const card = room.drawnCard;
    room.drawnCard = null;
    room.discardPile.push(card);

    let effect: 'queen-peek' | 'jack-swap' | null = null;
    if (card.value === 'Q') {
      effect = 'queen-peek';
      room.pendingEffect = { effect: 'queen-peek', playerId };
    } else if (card.value === 'J') {
      effect = 'jack-swap';
      room.pendingEffect = { effect: 'jack-swap', playerId };
    }

    return { card, effect };
  }

  /**
   * Troca a carta comprada por uma carta da mão na grade.
   * A carta antiga vai para o topo do descarte e pode ativar efeito especial (Q ou J).
   */
  static swapDrawnWithHand(room: GameRoom, playerId: string, handIndex: number): {
    oldCard: CardModel | null;
    effect: 'queen-peek' | 'jack-swap' | null;
  } {
    if (!this.isPlayerTurn(room, playerId)) return { oldCard: null, effect: null };
    if (!room.drawnCard) return { oldCard: null, effect: null };

    const player = room.players.find((p) => p.id === playerId);
    if (!player || handIndex < 0 || handIndex >= player.hand.length) {
      return { oldCard: null, effect: null };
    }

    const oldCard = player.hand[handIndex];
    player.hand[handIndex] = room.drawnCard;
    room.drawnCard = null;

    // A carta vai para a grade VIRADA PARA BAIXO na mesa!
    player.knownCards = player.knownCards.filter((idx) => idx !== handIndex);

    room.discardPile.push(oldCard);

    let effect: 'queen-peek' | 'jack-swap' | null = null;
    if (oldCard.value === 'Q') {
      effect = 'queen-peek';
      room.pendingEffect = { effect: 'queen-peek', playerId };
    } else if (oldCard.value === 'J') {
      effect = 'jack-swap';
      room.pendingEffect = { effect: 'jack-swap', playerId };
    }

    return { oldCard, effect };
  }

  /**
   * Habilidade da Dama (Rainha): espiar uma de suas próprias cartas viradas para baixo.
   * Fica visível para o jogador por 5 segundos e depois vira de volta.
   */
  static queenPeek(room: GameRoom, playerId: string, cardIndex: number): {
    success: boolean;
    card?: CardModel;
  } {
    const player = room.players.find((p) => p.id === playerId);
    if (!player || cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false };
    }

    if (!player.knownCards.includes(cardIndex)) {
      player.knownCards.push(cardIndex);
    }

    setTimeout(() => {
      const idx = player.knownCards.indexOf(cardIndex);
      if (idx !== -1) {
        player.knownCards.splice(idx, 1);
      }
    }, 5000);

    room.pendingEffect = null;
    return { success: true, card: player.hand[cardIndex] };
  }

  /**
   * Habilidade do Valete: trocar quaisquer 2 cartas que estejam na mesa
   * (seja uma sua com a de outro jogador, ou entre dois outros jogadores).
   * REGRA IMPORTANTE: cartas de quem já bateu (chamou Dutch) estão TRAVADAS e não podem ser trocadas!
   */
  static jackSwap(
    room: GameRoom,
    playerId: string,
    p1Id: string,
    cardIndex1: number,
    p2Id: string,
    cardIndex2: number,
  ): { success: boolean; message?: string } {
    // Valida se algum dos jogadores envolvidos na troca está com a mão travada
    if (room.lockedPlayerIds.includes(p1Id) || room.lockedPlayerIds.includes(p2Id)) {
      return { success: false, message: 'Cartas de quem chamou Dutch estão travadas e não podem ser trocadas!' };
    }

    const player1 = room.players.find((p) => p.id === p1Id);
    const player2 = room.players.find((p) => p.id === p2Id);

    if (!player1 || !player2) return { success: false, message: 'Jogadores não encontrados' };
    if (cardIndex1 < 0 || cardIndex1 >= player1.hand.length) return { success: false, message: 'Índice da carta 1 inválido' };
    if (cardIndex2 < 0 || cardIndex2 >= player2.hand.length) return { success: false, message: 'Índice da carta 2 inválido' };

    // Realiza a troca física das duas cartas
    const temp = player1.hand[cardIndex1];
    player1.hand[cardIndex1] = player2.hand[cardIndex2];
    player2.hand[cardIndex2] = temp;

    // Reseta conhecimento do índice se for de jogadores diferentes (já que as cartas mudaram)
    if (p1Id !== p2Id) {
      player1.knownCards = player1.knownCards.filter((i) => i !== cardIndex1);
      player2.knownCards = player2.knownCards.filter((i) => i !== cardIndex2);
    }

    room.pendingEffect = null;
    return { success: true };
  }

  /**
   * Mecânica de Descarte Igual (Snap):
   * Se um jogador sabe que tem uma carta virada para baixo igual ao topo do descarte,
   * ele pode descartá-la sobre ela a qualquer momento (mesmo fora do seu turno!).
   * - Se ACERTAR: a carta é removida da mão (o jogador passa a ter menos cartas!).
   * - Se ERRAR: penalidade! Mantém a carta e recebe +1 carta extra do monte.
   */
  static matchDiscard(
    room: GameRoom,
    playerId: string,
    handIndex: number,
  ): {
    success: boolean;
    card?: CardModel;
    topDiscard?: CardModel;
    penaltyCard?: CardModel;
    message: string;
    newCount: number;
  } {
    const player = room.players.find((p) => p.id === playerId);
    if (!player || handIndex < 0 || handIndex >= player.hand.length) {
      return { success: false, message: 'Carta inválida', newCount: player?.hand.length || 0 };
    }

    const topDiscard = room.discardPile[room.discardPile.length - 1];
    if (!topDiscard) {
      return { success: false, message: 'Não há carta no descarte para parear', newCount: player.hand.length };
    }

    const card = player.hand[handIndex];

    if (card.value === topDiscard.value) {
      // ACERTOU! Remove a carta da mão e descarta
      player.hand.splice(handIndex, 1);
      room.discardPile.push(card);

      // Ajusta os índices conhecidos
      player.knownCards = player.knownCards
        .filter((idx) => idx !== handIndex)
        .map((idx) => (idx > handIndex ? idx - 1 : idx));

      // Se o jogador descartou todas as cartas, encerra a rodada imediatamente!
      if (player.hand.length === 0) {
        room.phase = 'round-end';
      }

      return {
        success: true,
        card,
        topDiscard,
        message: player.hand.length === 0
          ? `🏆 Parabéns! Você descartou todas as suas cartas e venceu a rodada!`
          : `Acertou o par! Sua carta era ${card.value}${card.suit} e foi descartada. Você agora tem ${player.hand.length} carta(s)!`,
        newCount: player.hand.length,
      };
    } else {
      // ERROU! Penalidade: compra +1 carta do monte
      let penaltyCard = room.deck.pop();
      if (!penaltyCard && room.discardPile.length > 1) {
        const top = room.discardPile.pop()!;
        room.deck = shuffleDeck([...room.discardPile]);
        room.discardPile = [top];
        penaltyCard = room.deck.pop();
      }

      if (penaltyCard) {
        player.hand.push(penaltyCard);
      }

      // Vira a carta errada para cima por 6 segundos para o jogador ver e memorizar
      if (!player.knownCards.includes(handIndex)) {
        player.knownCards.push(handIndex);
        setTimeout(() => {
          const idx = player.knownCards.indexOf(handIndex);
          if (idx !== -1) {
            player.knownCards.splice(idx, 1);
          }
        }, 6000);
      }

      return {
        success: false,
        card,
        topDiscard,
        penaltyCard,
        message: `Errou! Sua carta era ${card.value}${card.suit} e o descarte é ${topDiscard.value}${topDiscard.suit}. Você comprou +1 carta de penalidade do monte!`,
        newCount: player.hand.length,
      };
    }
  }

  /**
   * Jogador bate na mesa / chama Dutch em vez de comprar uma carta.
   * Suas cartas ficam TRAVADAS (não podem ser trocadas por Valete).
   * Todos os outros jogadores têm exatamente mais um turno.
   */
  static callDutch(room: GameRoom, playerId: string): boolean {
    if (!this.isPlayerTurn(room, playerId)) return false;
    if (room.phase !== 'playing') return false;
    if (room.dutchCallerId !== null) return false;
    if (room.drawnCard !== null) return false; // Deve bater em vez de comprar

    room.phase = 'dutch-called';
    room.dutchCallerId = playerId;
    if (!room.lockedPlayerIds.includes(playerId)) {
      room.lockedPlayerIds.push(playerId);
    }

    // Avança para o próximo jogador imediatamente
    this.nextTurn(room);
    return true;
  }

  /**
   * Avança para o próximo turno
   */
  static nextTurn(room: GameRoom): void {
    room.drawnCard = null;
    room.pendingEffect = null;
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    room.turnStartedAt = Date.now();

    if (room.phase === 'dutch-called') {
      const currentPlayer = room.players[room.currentTurnIndex];
      if (currentPlayer.id === room.dutchCallerId) {
        // Todos já jogaram sua última rodada! Acaba a rodada.
        room.phase = 'round-end';
      }
    }
  }

  /**
   * Retorna o estado do jogo personalizado para um jogador específico
   * CRÍTICO: não revelar cartas secretas de outros jogadores
   */
  static getClientState(room: GameRoom, playerId: string): ClientGameState {
    const player = room.players.find((p) => p.id === playerId);
    const isTurn = room.players[room.currentTurnIndex]?.id === playerId;

    // Calcula tempo restante real do turno
    let turnTimeRemaining = room.settings.turnTimeSeconds;
    if (room.turnStartedAt) {
      const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
      turnTimeRemaining = Math.max(0, room.settings.turnTimeSeconds - elapsed);
    }

    // Monta a mão do jogador, escondendo cartas desconhecidas
    const yourHand = player
      ? player.hand.map((card, idx) => {
          if (player.knownCards.includes(idx) || room.phase === 'round-end' || room.phase === 'game-end') {
            return card;
          }
          return {
            id: card.id,
            value: '?' as any,
            suit: '?' as any,
            points: 0,
          } as CardModel;
        })
      : [];

    return {
      phase: room.phase,
      currentTurnPlayerId: room.players[room.currentTurnIndex]?.id || '',
      turnTimeRemaining,
      deckCount: room.deck.length,
      discardTop: room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null,
      drawnCard: isTurn ? room.drawnCard : null,
      lockedPlayerIds: room.lockedPlayerIds || [],
      pendingEffect:
        room.pendingEffect && room.pendingEffect.playerId === playerId
          ? { effect: room.pendingEffect.effect, cardValue: room.pendingEffect.effect === 'queen-peek' ? 'Q' : 'J' }
          : null,
      dutchCallerId: room.dutchCallerId,
      round: room.round,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        ready: p.ready,
        isBot: p.isBot || false,
        cardsCount: p.hand.length,
        score: p.score,
        connected: p.connected,
        isLocked: room.lockedPlayerIds?.includes(p.id) || false,
      })),
      yourHand,
      yourKnownCards: player?.knownCards || [],
    };
  }

  /**
   * Retorna o estado da sala (lobby)
   */
  static getRoomState(room: GameRoom): RoomState {
    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      hasPassword: !!room.password,
      settings: room.settings,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        ready: p.ready,
        isBot: p.isBot || false,
        cardsCount: p.hand.length,
        score: p.score,
        connected: p.connected,
        isLocked: room.lockedPlayerIds?.includes(p.id) || false,
      })),
      phase: room.phase,
    };
  }
}
