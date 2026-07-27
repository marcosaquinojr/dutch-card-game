import { GameRoom, CardModel, ClientGameState, RoomState } from './types';
import { createDeck, shuffleDeck, dealCards } from './deck';

export class GameEngine {
  /**
   * Calcula cartas visíveis iniciais baseado em cardsPerPlayer
   */
  static getInitialVisibleCount(cardsPerPlayer: number): number {
    // Exemplo: 4 cartas = vê 2; 6 cartas = vê 2 ou 3?
    // Regra simples: metade das cartas arredondado para baixo
    return Math.floor(cardsPerPlayer / 2);
  }

  /**
   * Inicia uma nova rodada: embaralha, distribui, define fase 'memorize'
   */
  static startRound(room: GameRoom): void {
    const deck = shuffleDeck(createDeck(room.settings.specialCards));
    const { hands, remainingDeck } = dealCards(deck, room.players.length, room.settings.cardsPerPlayer);
    
    room.deck = remainingDeck;
    
    // Configura primeira carta no descarte
    const firstDiscard = room.deck.pop();
    if (firstDiscard) {
      room.discardPile = [firstDiscard];
    }
    
    const visibleCount = this.getInitialVisibleCount(room.settings.cardsPerPlayer);
    const visibleIndices = Array.from({ length: visibleCount }, (_, i) => i);
    
    room.players.forEach((player, i) => {
      player.hand = hands[i];
      player.knownCards = [...visibleIndices];
    });
    
    room.phase = 'memorize';
    room.dutchCallerId = null;
    room.round += 1;
    room.currentTurnIndex = (room.round - 1) % room.players.length; // O primeiro jogador alterna a cada rodada
  }
  
  /**
   * Transição memorize -> playing após timeout
   */
  static endMemorize(room: GameRoom): void {
    if (room.phase === 'memorize') {
      room.phase = 'playing';
      room.turnStartedAt = Date.now();
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
    
    const card = room.deck.pop();
    if (!card && room.discardPile.length > 1) {
      // Re-embaralha o descarte (menos o topo) se o baralho acabar
      const topDiscard = room.discardPile.pop()!;
      room.deck = shuffleDeck([...room.discardPile]);
      room.discardPile = [topDiscard];
      return room.deck.pop() || null;
    }
    
    return card || null;
  }
  
  /**
   * Jogador compra carta do descarte. Retorna a carta.
   */
  static drawFromDiscard(room: GameRoom, playerId: string): CardModel | null {
    if (!this.isPlayerTurn(room, playerId)) return null;
    if (room.phase !== 'playing' && room.phase !== 'dutch-called') return null;
    if (room.discardPile.length === 0) return null;
    
    return room.discardPile.pop() || null;
  }
  
  /**
   * Jogador descarta a carta que acabou de comprar
   */
  static discardDrawnCard(room: GameRoom, playerId: string, drawnCard: CardModel): void {
    if (!this.isPlayerTurn(room, playerId)) return;
    room.discardPile.push(drawnCard);
  }
  
  /**
   * Jogador troca carta da mão pela que comprou
   */
  static swapWithHand(room: GameRoom, playerId: string, handIndex: number, drawnCard: CardModel): CardModel {
    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error("Jogador não encontrado");
    
    const oldCard = player.hand[handIndex];
    player.hand[handIndex] = drawnCard;
    
    // A carta no índice agora é conhecida pelo jogador
    if (!player.knownCards.includes(handIndex)) {
      player.knownCards.push(handIndex);
    }
    
    room.discardPile.push(oldCard);
    return oldCard;
  }
  
  /**
   * Usa habilidade especial. Retorna a carta afetada se aplicável
   */
  static useSpecial(room: GameRoom, playerId: string, kind: string, targetPlayerId?: string, targetCardIndex?: number): { success: boolean; card?: CardModel } {
    if (!this.isPlayerTurn(room, playerId)) return { success: false };
    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    switch (kind) {
      case 'peek': {
        // Olhar uma de suas próprias cartas
        if (targetCardIndex === undefined || targetCardIndex < 0 || targetCardIndex >= player.hand.length) {
          return { success: false };
        }
        if (!player.knownCards.includes(targetCardIndex)) {
          player.knownCards.push(targetCardIndex);
        }
        return { success: true, card: player.hand[targetCardIndex] };
      }

      case 'swap': {
        // Trocar uma carta sua com a carta de outro jogador
        const target = room.players.find(p => p.id === targetPlayerId);
        if (!target || targetCardIndex === undefined) return { success: false };
        // Precisa de dois índices: o do jogador e o do alvo
        // Usamos targetCardIndex para a carta do alvo, e o jogador escolhe a sua depois
        // Simplificação: troca carta 0 do jogador com targetCardIndex do alvo
        const playerCardIdx = 0; // Em uma implementação real, seria um parâmetro adicional
        const tempCard = player.hand[playerCardIdx];
        player.hand[playerCardIdx] = target.hand[targetCardIndex];
        target.hand[targetCardIndex] = tempCard;
        // Atualiza conhecimento: ambos agora conhecem a carta recebida
        if (!player.knownCards.includes(playerCardIdx)) {
          player.knownCards.push(playerCardIdx);
        }
        return { success: true, card: player.hand[playerCardIdx] };
      }

      case 'reveal': {
        // Ver uma carta de outro jogador (sem trocar)
        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer || targetCardIndex === undefined) return { success: false };
        if (targetCardIndex < 0 || targetCardIndex >= targetPlayer.hand.length) {
          return { success: false };
        }
        return { success: true, card: targetPlayer.hand[targetCardIndex] };
      }

      case 'steal': {
        // Roubar uma carta de outro jogador e dar uma sua
        const victim = room.players.find(p => p.id === targetPlayerId);
        if (!victim || targetCardIndex === undefined) return { success: false };
        if (targetCardIndex < 0 || targetCardIndex >= victim.hand.length) {
          return { success: false };
        }
        // Rouba a carta do alvo e dá a última carta da própria mão
        const stolenCard = victim.hand[targetCardIndex];
        const givenCard = player.hand[player.hand.length - 1];
        victim.hand[targetCardIndex] = givenCard;
        player.hand[player.hand.length - 1] = stolenCard;
        // Jogador agora conhece a carta roubada
        if (!player.knownCards.includes(player.hand.length - 1)) {
          player.knownCards.push(player.hand.length - 1);
        }
        return { success: true, card: stolenCard };
      }

      default:
        return { success: false };
    }
  }
  
  /**
   * Jogador chama Dutch
   */
  static callDutch(room: GameRoom, playerId: string): boolean {
    if (!this.isPlayerTurn(room, playerId)) return false;
    if (room.phase !== 'playing') return false;
    if (room.dutchCallerId !== null) return false;
    
    room.phase = 'dutch-called';
    room.dutchCallerId = playerId;
    
    return true;
  }
  
  /**
   * Avança para o próximo turno
   */
  static nextTurn(room: GameRoom): void {
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    room.turnStartedAt = Date.now();
    
    if (room.phase === 'dutch-called') {
      const currentPlayer = room.players[room.currentTurnIndex];
      if (currentPlayer.id === room.dutchCallerId) {
        // A volta completou, acaba a rodada
        room.phase = 'round-end';
      }
    }
  }
  
  /**
   * Retorna o estado do jogo personalizado para um jogador específico
   * CRÍTICO: não revelar cartas secretas de outros jogadores
   */
  static getClientState(room: GameRoom, playerId: string): ClientGameState {
    const player = room.players.find(p => p.id === playerId);

    // Calcula tempo restante real do turno
    let turnTimeRemaining = room.settings.turnTimeSeconds;
    if (room.turnStartedAt) {
      const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
      turnTimeRemaining = Math.max(0, room.settings.turnTimeSeconds - elapsed);
    }

    // Monta a mão do jogador, escondendo cartas desconhecidas
    const yourHand = player ? player.hand.map((card, idx) => {
      if (player.knownCards.includes(idx) || room.phase === 'round-end' || room.phase === 'game-end') {
        return card; // Carta conhecida ou rodada acabou — revela
      }
      // Carta escondida — envia apenas o ID para referência, sem valor real
      return {
        id: card.id,
        value: '?' as any,
        suit: '?' as any,
        points: 0,
      } as CardModel;
    }) : [];

    return {
      phase: room.phase,
      currentTurnPlayerId: room.players[room.currentTurnIndex]?.id || '',
      turnTimeRemaining,
      deckCount: room.deck.length,
      discardTop: room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null,
      dutchCallerId: room.dutchCallerId,
      round: room.round,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        ready: p.ready,
        cardsCount: p.hand.length,
        score: p.score,
        connected: p.connected,
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
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        ready: p.ready,
        cardsCount: p.hand.length,
        score: p.score,
        connected: p.connected
      })),
      phase: room.phase
    };
  }
}
