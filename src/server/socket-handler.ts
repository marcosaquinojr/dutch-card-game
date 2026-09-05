import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameRoom,
  ChatMessage,
} from '../game/types';
import { RoomManager } from './room-manager';
import { GameEngine } from '../game/engine';
import { calculateRoundResults, checkGameEnd } from '../game/scoring';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Emite estado do jogo personalizado para cada jogador na sala */
function emitGameStateToAll(io: TypedServer, room: GameRoom): void {
  for (const player of room.players) {
    if (player.connected) {
      const state = GameEngine.getClientState(room, player.id);
      io.to(player.socketId).emit('game:state', state);
    }
  }
}

/** Emite estado da sala (lobby) para todos */
function emitRoomStateToAll(io: TypedServer, room: GameRoom): void {
  const state = GameEngine.getRoomState(room);
  io.to(room.code).emit('room:state', state);
}

const botMatchTimers = new Map<string, NodeJS.Timeout[]>();

function clearBotMatchTimers(roomCode: string): void {
  const timers = botMatchTimers.get(roomCode);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    botMatchTimers.delete(roomCode);
  }
}

/** Verifica se bots têm cartas iguais à do descarte para descartar fora do turno (Snap) */
function triggerBotMatchDiscards(io: TypedServer, room: GameRoom): void {
  if (room.phase !== 'playing' && room.phase !== 'dutch-called') return;
  if (!room.settings.simultaneousDiscard) return;

  clearBotMatchTimers(room.code);

  const topDiscard = room.discardPile[room.discardPile.length - 1];
  if (!topDiscard) return;

  const roomTimers: NodeJS.Timeout[] = [];

  for (const bot of room.players) {
    if (!bot.isBot || room.lockedPlayerIds.includes(bot.id) || bot.hand.length === 0) continue;

    // Encontra cartas com o mesmo valor que a do descarte
    const matchingIndices: number[] = [];
    bot.hand.forEach((card, idx) => {
      if (card.value === topDiscard.value) {
        matchingIndices.push(idx);
      }
    });

    if (matchingIndices.length === 0) continue;

    // Prioriza cartas que o bot já conhece (memorizadas no início ou reveladas)
    const knownMatch = matchingIndices.find((idx) => bot.knownCards.includes(idx));
    let chosenIndex: number | undefined = knownMatch;

    // Se não conhece, tem 20% de chance de arriscar (comportamento humano realista)
    if (chosenIndex === undefined && Math.random() < 0.20) {
      chosenIndex = matchingIndices[0];
    }

    if (chosenIndex === undefined) continue;

    // Tempo de reação humano simulado: 1.4s a 2.8s
    const reactionDelay = 1400 + Math.random() * 1400;

    const timer = setTimeout(() => {
      if (room.phase !== 'playing' && room.phase !== 'dutch-called') return;
      if (room.lockedPlayerIds.includes(bot.id)) return;

      const currentTop = room.discardPile[room.discardPile.length - 1];
      if (!currentTop || currentTop.id !== topDiscard.id) return; // Topo já mudou
      if (chosenIndex! >= bot.hand.length || bot.hand[chosenIndex!].value !== currentTop.value) return;

      const result = GameEngine.matchDiscard(room, bot.id, chosenIndex!);
      if (result.success && result.card && result.topDiscard) {
        io.to(room.code).emit('game:match-result', {
          playerId: bot.id,
          playerName: bot.name,
          handIndex: chosenIndex!,
          success: true,
          message: `${bot.name} (Bot) descartou uma carta igual (${result.card.value}${result.card.suit})!`,
        });

        const matchMsg: ChatMessage = {
          id: crypto.randomUUID(),
          author: 'Sistema',
          text: `⚡ ${bot.name} (Bot) ACERTOU o descarte igual (${result.card.value}${result.card.suit}) e agora tem ${result.newCount} carta(s)!`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          system: true,
        };
        io.to(room.code).emit('chat:new', matchMsg);

        if (result.newCount === 0 || (room.phase as string) === 'round-end') {
          const winMsg: ChatMessage = {
            id: crypto.randomUUID(),
            author: 'Sistema',
            text: `🏆 ${bot.name} DESCARTOU TODAS AS SUAS CARTAS E VENCEU A RODADA COM 0 PONTOS!`,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            system: true,
          };
          io.to(room.code).emit('chat:new', winMsg);

          handleRoundEnd(io, room, {
            winnerId: bot.id,
            winnerName: bot.name,
            reason: `${bot.name} descartou todas as cartas e venceu a rodada com 0 pontos!`,
          });
          return;
        }

        emitGameStateToAll(io, room);
        triggerBotMatchDiscards(io, room);
      }
    }, reactionDelay);

    roomTimers.push(timer);
  }

  if (roomTimers.length > 0) {
    botMatchTimers.set(room.code, roomTimers);
  }
}

/** IA / Jogada Simulada do Bot */
function checkBotTurn(io: TypedServer, room: GameRoom): void {
  if (room.phase !== 'playing' && room.phase !== 'dutch-called') return;

  const currentP = room.players[room.currentTurnIndex];
  if (!currentP || !currentP.isBot) return;

  clearTurnTimer(room);

  // Aguarda 1.6 segundos para simular ação humana
  setTimeout(() => {
    if (room.phase !== 'playing' && room.phase !== 'dutch-called') return;
    if (room.players[room.currentTurnIndex]?.id !== currentP.id) return;

    // 1. Decisão de Bater na Mesa (DUTCH):
    const totalHandPoints = currentP.hand.reduce((acc, c) => acc + (c?.points || 0), 0);
    const shouldCallDutch =
      room.phase === 'playing' &&
      room.dutchCallerId === null &&
      totalHandPoints <= 6 &&
      Math.random() < 0.75;

    if (shouldCallDutch) {
      const success = GameEngine.callDutch(room, currentP.id);
      if (success) {
        io.to(room.code).emit('game:dutch-called', {
          playerId: currentP.id,
          playerName: currentP.name,
        });
        const dutchMsg: ChatMessage = {
          id: crypto.randomUUID(),
          author: 'Sistema',
          text: `🚩 ${currentP.name} (Bot) BATEU NA MESA E CHAMOU DUTCH! As cartas dele estão travadas 🔒.`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          system: true,
        };
        io.to(room.code).emit('chat:new', dutchMsg);

        if ((room.phase as string) === 'round-end') {
          handleRoundEnd(io, room);
        } else {
          emitGameStateToAll(io, room);
          startTurnTimer(io, room);
        }
        return;
      }
    }

    // 2. Comprar do Monte
    const drawn = GameEngine.drawFromDeck(room, currentP.id);
    if (!drawn) {
      GameEngine.nextTurn(room);
      emitGameStateToAll(io, room);
      startTurnTimer(io, room);
      return;
    }

    emitGameStateToAll(io, room);

    // Aguarda 1.3s após comprar para decidir trocar ou descartar
    setTimeout(() => {
      if (room.players[room.currentTurnIndex]?.id !== currentP.id) return;

      const isGoodCard = drawn.points <= 5; // A, 2, 3, 4, 5, ou Rei Preto (-1)

      if (isGoodCard && currentP.hand.length > 0) {
        // Encontra a carta da mão com maior pontuação para trocar
        let chosenIdx = 0;
        for (let i = 1; i < currentP.hand.length; i++) {
          if (currentP.hand[i].points > currentP.hand[chosenIdx].points) {
            chosenIdx = i;
          }
        }

        const { effect } = GameEngine.swapDrawnWithHand(room, currentP.id, chosenIdx);

        if (effect === 'queen-peek') {
          const unknownIdx = currentP.hand.findIndex((_, i) => !currentP.knownCards.includes(i));
          if (unknownIdx !== -1) GameEngine.queenPeek(room, currentP.id, unknownIdx);
        } else if (effect === 'jack-swap') {
          const other = room.players.find((p) => p.id !== currentP.id && !room.lockedPlayerIds.includes(p.id));
          if (other && other.hand.length > 0) {
            GameEngine.jackSwap(room, currentP.id, currentP.id, 0, other.id, 0);
          }
        }
      } else {
        // Descarta direto sem trocar
        const { effect } = GameEngine.discardDrawnCard(room, currentP.id);
        if (effect === 'queen-peek') {
          const unknownIdx = currentP.hand.findIndex((_, i) => !currentP.knownCards.includes(i));
          if (unknownIdx !== -1) GameEngine.queenPeek(room, currentP.id, unknownIdx);
        } else if (effect === 'jack-swap') {
          const other = room.players.find((p) => p.id !== currentP.id && !room.lockedPlayerIds.includes(p.id));
          if (other && other.hand.length > 0) {
            GameEngine.jackSwap(room, currentP.id, currentP.id, 0, other.id, 0);
          }
        }
      }

      GameEngine.nextTurn(room);

      if (room.phase === 'round-end') {
        handleRoundEnd(io, room);
      } else {
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
        triggerBotMatchDiscards(io, room);
      }
    }, 1300);
  }, 1600);
}

/** Configura timer para o turno atual */
function startTurnTimer(io: TypedServer, room: GameRoom): void {
  clearTurnTimer(room);
  room.turnStartedAt = Date.now();

  // Se o jogador atual for bot, ativa a IA simulada
  checkBotTurn(io, room);

  room.turnTimer = setTimeout(() => {
    // Tempo esgotou — avança turno automaticamente
    GameEngine.nextTurn(room);

    if (room.phase === 'round-end') {
      handleRoundEnd(io, room);
    } else {
      emitGameStateToAll(io, room);
      startTurnTimer(io, room);
    }
  }, room.settings.turnTimeSeconds * 1000);
}

/** Limpa timer do turno */
function clearTurnTimer(room: GameRoom): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

/** Lida com o fim de rodada: calcula resultados, aplica scores, verifica game end */
function handleRoundEnd(io: TypedServer, room: GameRoom, extraInfo?: { winnerId?: string; winnerName?: string; reason?: string }): void {
  clearTurnTimer(room);
  clearBotMatchTimers(room.code);

  // Calcula resultados da rodada (já inclui bônus Dutch)
  const results = calculateRoundResults(room);

  // Se extraInfo definiu um vencedor que zerou as cartas, atualiza o motivo
  if (extraInfo?.winnerId) {
    const wRes = results.find((r) => r.playerId === extraInfo.winnerId);
    if (wRes && extraInfo.reason) {
      wRes.reason = extraInfo.reason;
    }
  }

  // Aplica scores cumulativos nos jogadores
  for (const result of results) {
    const player = room.players.find((p) => p.id === result.playerId);
    if (player) {
      player.score = result.cumulativeScore;
    }
  }

  const sorted = [...results].sort((a, b) => a.roundTotal - b.roundTotal);
  const winner = sorted[0];

  const roundPayload = {
    results,
    winnerId: extraInfo?.winnerId || winner?.playerId,
    winnerName: extraInfo?.winnerName || winner?.playerName,
    reason: extraInfo?.reason || (room.dutchCallerId ? `Rodada finalizada após DUTCH chamado por ${room.players.find((p) => p.id === room.dutchCallerId)?.name || 'jogador'}` : 'Menor pontuação'),
  };

  // Emite resultados da rodada
  io.to(room.code).emit('game:round-end', roundPayload);

  // Verifica se o jogo acabou
  const gameEnd = checkGameEnd(room);
  if (gameEnd.ended) {
    room.phase = 'game-end';
    // O vencedor é quem tem MENOR pontuação geral
    const overallWinner = room.players.reduce((prev, curr) =>
      prev.score < curr.score ? prev : curr,
    );
    io.to(room.code).emit('game:end', { results, winnerId: overallWinner.id, winnerName: overallWinner.name });
  }

  emitGameStateToAll(io, room);
}

// ─────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────

export function registerSocketHandlers(io: TypedServer): void {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (socket: TypedSocket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // ── Eventos de Sala ──

    socket.on('room:create', (data) => {
      const playerId = data.playerId || socket.id;
      const room = roomManager.createRoom(
        playerId,
        socket.id,
        data.playerName,
        data.avatar,
        data.roomName,
        data.settings,
        data.password,
      );
      socket.join(room.code);
      socket.emit('room:state', GameEngine.getRoomState(room));
      console.log(`🏠 Sala criada: ${room.code} por ${data.playerName} (PlayerID: ${playerId})`);
    });

    socket.on('room:join', (data) => {
      const playerId = data.playerId || socket.id;
      const result = roomManager.joinRoom(
        data.code,
        playerId,
        socket.id,
        data.playerName,
        data.avatar,
        data.password,
      );

      if ('error' in result) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(result.code);

      // Notifica todos sobre o novo jogador
      const newPlayer = result.players.find((p) => p.id === playerId || p.socketId === socket.id);
      if (newPlayer) {
        io.to(result.code).emit('player:joined', {
          id: newPlayer.id,
          name: newPlayer.name,
          avatar: newPlayer.avatar,
          isHost: newPlayer.isHost,
          ready: newPlayer.ready,
          isBot: newPlayer.isBot || false,
          cardsCount: newPlayer.hand.length,
          score: newPlayer.score,
          connected: true,
          isLocked: false,
        });
      }

      emitRoomStateToAll(io, result);
      console.log(`👤 ${data.playerName} entrou na sala ${result.code}`);
    });

    // Sincronização de estado (ao carregar /game ou reconectar)
    socket.on('game:sync', (data) => {
      let roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData && data?.playerId) {
        let room = data.roomCode ? roomManager.getRoom(data.roomCode) : null;
        if (!room) {
          const found = roomManager.getRoomByPlayerId(data.playerId);
          if (found) room = found.room;
        }
        if (room) {
          const player = room.players.find((p) => p.id === data.playerId);
          if (player) {
            player.socketId = socket.id;
            player.connected = true;
            socket.join(room.code);
            roomData = { room, player };
          }
        }
      }

      if (roomData) {
        socket.emit('room:state', GameEngine.getRoomState(roomData.room));
        socket.emit('game:state', GameEngine.getClientState(roomData.room, roomData.player.id));
        if (roomData.room.phase === 'round-end') {
          const results = calculateRoundResults(roomData.room);
          const sorted = [...results].sort((a, b) => a.roundTotal - b.roundTotal);
          const winner = sorted[0];
          socket.emit('game:round-end', {
            results,
            winnerId: winner?.playerId,
            winnerName: winner?.playerName,
            reason: roomData.room.dutchCallerId
              ? `Rodada finalizada após DUTCH chamado por ${roomData.room.players.find((p) => p.id === roomData.room.dutchCallerId)?.name || 'jogador'}`
              : 'Menor pontuação',
          });
        }
      }
    });

    socket.on('room:leave', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;
      const code = room.code;

      socket.leave(code);
      const { deleted } = roomManager.leaveRoom(code, player.id);

      if (!deleted) {
        io.to(code).emit('player:left', { playerId: player.id });
        emitRoomStateToAll(io, room);
      }
    });

    socket.on('room:ready', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;

      const room = roomManager.setReady(roomData.room.code, roomData.player.id, data.ready);
      if (room) {
        emitRoomStateToAll(io, room);
      }
    });

    socket.on('room:add-bot', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;
      if (!player.isHost) return;

      const bot = roomManager.addBot(room.code);
      if (bot) {
        emitRoomStateToAll(io, room);
        console.log(`🤖 Bot ${bot.name} adicionado à sala ${room.code}`);
      }
    });

    socket.on('room:remove-bot', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;
      if (!player.isHost) return;

      roomManager.removeBot(room.code, data.botId);
      emitRoomStateToAll(io, room);
    });

    // ── Eventos de Jogo ──

    socket.on('game:start', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) {
        socket.emit('error', { message: 'Sua conexão com a sala não foi encontrada. Tente reconectar.' });
        return;
      }
      const { room, player } = roomData;

      // Validações: host e mínimo de 2 jogadores
      if (!player.isHost) {
        socket.emit('error', { message: 'Apenas o host pode iniciar a partida' });
        return;
      }
      if (room.players.length < 2) {
        socket.emit('error', { message: 'Mínimo de 2 jogadores para iniciar' });
        return;
      }

      // Garante que todos os jogadores estão marcados como prontos no início
      for (const p of room.players) {
        p.ready = true;
      }

      GameEngine.startRound(room);
      emitRoomStateToAll(io, room);
      emitGameStateToAll(io, room);
      console.log(`🎮 Partida iniciada na sala ${room.code} — Rodada ${room.round}`);

      // Após fase de memorização (5s), inicia o jogo normalmente
      setTimeout(() => {
        GameEngine.endMemorize(room);
        emitRoomStateToAll(io, room);
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
        triggerBotMatchDiscards(io, room);
      }, 5000);
    });

    socket.on('game:draw-deck', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const card = GameEngine.drawFromDeck(room, player.id);
      if (!card) {
        socket.emit('error', { message: 'Não é possível comprar agora' });
        return;
      }

      socket.emit('game:card-drawn', { card, fromDeck: true });
      emitGameStateToAll(io, room);
    });

    socket.on('game:draw-discard', () => {
      socket.emit('error', { message: 'Não é possível comprar do descarte nesta regra. Compre apenas do Monte.' });
    });

    // Descarta a carta que acabou de comprar do monte
    socket.on('game:discard-drawn', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (!GameEngine.isPlayerTurn(room, player.id)) return;

      const { card, effect } = GameEngine.discardDrawnCard(room, player.id);
      if (!card) return;

      clearTurnTimer(room);

      if (effect === 'queen-peek') {
        socket.emit('game:effect-pending', { effect: 'queen-peek', cardValue: 'Q' });
        emitGameStateToAll(io, room);
      } else if (effect === 'jack-swap') {
        socket.emit('game:effect-pending', { effect: 'jack-swap', cardValue: 'J' });
        emitGameStateToAll(io, room);
      } else {
        GameEngine.nextTurn(room);
        if (room.phase === 'round-end') {
          handleRoundEnd(io, room);
        } else {
          emitGameStateToAll(io, room);
          startTurnTimer(io, room);
          triggerBotMatchDiscards(io, room);
        }
      }
    });

    // Troca a carta comprada com uma da grade na mão
    socket.on('game:swap-drawn', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (!GameEngine.isPlayerTurn(room, player.id)) return;

      const { oldCard, effect } = GameEngine.swapDrawnWithHand(room, player.id, data.handIndex);
      if (!oldCard) return;

      clearTurnTimer(room);

      if (effect === 'queen-peek') {
        socket.emit('game:effect-pending', { effect: 'queen-peek', cardValue: 'Q' });
        emitGameStateToAll(io, room);
      } else if (effect === 'jack-swap') {
        socket.emit('game:effect-pending', { effect: 'jack-swap', cardValue: 'J' });
        emitGameStateToAll(io, room);
      } else {
        GameEngine.nextTurn(room);
        if (room.phase === 'round-end') {
          handleRoundEnd(io, room);
        } else {
          emitGameStateToAll(io, room);
          startTurnTimer(io, room);
          triggerBotMatchDiscards(io, room);
        }
      }
    });

    // Compatibilidade com eventos antigos de discard e swap
    socket.on('game:discard', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;
      if (room.drawnCard) {
        socket.emit('game:discard-drawn' as any);
      }
    });

    socket.on('game:swap', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;
      if (room.drawnCard) {
        const { oldCard, effect } = GameEngine.swapDrawnWithHand(room, player.id, data.handIndex);
        if (!oldCard) return;
        clearTurnTimer(room);
        if (effect) {
          socket.emit('game:effect-pending', { effect, cardValue: effect === 'queen-peek' ? 'Q' : 'J' });
          emitGameStateToAll(io, room);
        } else {
          GameEngine.nextTurn(room);
          if (room.phase === 'round-end') {
            handleRoundEnd(io, room);
          } else {
            emitGameStateToAll(io, room);
            startTurnTimer(io, room);
          }
        }
      }
    });

    // Habilidade da Dama: espiar uma de suas próprias cartas
    socket.on('game:queen-peek', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const result = GameEngine.queenPeek(room, player.id, data.cardIndex);
      socket.emit('game:special-result', {
        kind: 'peek',
        card: result.card,
        success: result.success,
      });

      emitGameStateToAll(io, room);

      // Avança o turno após resolver o efeito da Dama
      GameEngine.nextTurn(room);
      if (room.phase === 'round-end') {
        handleRoundEnd(io, room);
      } else {
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
      }
    });

    // Habilidade do Valete: trocar quaisquer 2 cartas na mesa
    socket.on('game:jack-swap', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const result = GameEngine.jackSwap(
        room,
        player.id,
        data.player1Id,
        data.cardIndex1,
        data.player2Id,
        data.cardIndex2,
      );

      if (!result.success) {
        socket.emit('error', { message: result.message || 'Troca não permitida' });
        return;
      }

      const p1 = room.players.find((p) => p.id === data.player1Id);
      const p2 = room.players.find((p) => p.id === data.player2Id);

      const swapMessage: ChatMessage = {
        id: crypto.randomUUID(),
        author: 'Sistema',
        text: `🃏 ${player.name} usou o Valete para trocar uma carta de ${p1?.name} com ${p2?.name}!`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        system: true,
      };
      io.to(room.code).emit('chat:new', swapMessage);

      // Avança o turno após resolver o Valete
      GameEngine.nextTurn(room);
      if (room.phase === 'round-end') {
        handleRoundEnd(io, room);
      } else {
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
      }
    });

    // Pular efeito especial (ex: optar por não trocar cartas com o Valete)
    socket.on('game:skip-effect', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (room.pendingEffect && room.pendingEffect.playerId === player.id) {
        room.pendingEffect = null;
        const skipMsg: ChatMessage = {
          id: crypto.randomUUID(),
          author: 'Sistema',
          text: `🃏 ${player.name} optou por não trocar cartas com o Valete.`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          system: true,
        };
        io.to(room.code).emit('chat:new', skipMsg);

        GameEngine.nextTurn(room);
        if (room.phase === 'round-end') {
          handleRoundEnd(io, room);
        } else {
          emitGameStateToAll(io, room);
          startTurnTimer(io, room);
        }
      }
    });

    // Mecânica de Descarte Igual (Snap): qualquer jogador a qualquer momento
    socket.on('game:match-discard', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (room.phase !== 'playing' && room.phase !== 'dutch-called') return;

      const result = GameEngine.matchDiscard(room, player.id, data.handIndex);

      if (result.card && result.topDiscard) {
        io.to(room.code).emit('game:match-result', {
          playerId: player.id,
          playerName: player.name,
          handIndex: data.handIndex,
          success: result.success,
          message: result.message,
          card: result.card,
          topDiscard: result.topDiscard,
          penaltyCard: result.penaltyCard,
          newCount: result.newCount,
        });
      }

      const matchMsg: ChatMessage = {
        id: crypto.randomUUID(),
        author: 'Sistema',
        text: result.success
          ? `⚡ ${player.name} ACERTOU o descarte igual (${result.card?.value}${result.card?.suit}) e agora tem ${result.newCount} carta(s)!`
          : `❌ ${player.name} ERROU o descarte igual! Carta: ${result.card?.value}${result.card?.suit} (era ${result.topDiscard?.value}${result.topDiscard?.suit}). Recebeu +1 carta de penalidade!`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        system: true,
      };
      io.to(room.code).emit('chat:new', matchMsg);

      // Se o jogador descartou todas as suas cartas, encerra a rodada imediatamente!
      if (result.newCount === 0 || (room.phase as string) === 'round-end') {
        const winMsg: ChatMessage = {
          id: crypto.randomUUID(),
          author: 'Sistema',
          text: `🏆 ${player.name} DESCARTOU TODAS AS SUAS CARTAS E VENCEU A RODADA COM 0 PONTOS!`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          system: true,
        };
        io.to(room.code).emit('chat:new', winMsg);

        handleRoundEnd(io, room, {
          winnerId: player.id,
          winnerName: player.name,
          reason: `${player.name} descartou todas as cartas e venceu a rodada com 0 pontos!`,
        });
        return;
      }

      emitGameStateToAll(io, room);
      triggerBotMatchDiscards(io, room);
    });

    // Bater na mesa / chamar Dutch
    socket.on('game:call-dutch', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const success = GameEngine.callDutch(room, player.id);
      if (success) {
        io.to(room.code).emit('game:dutch-called', {
          playerId: player.id,
          playerName: player.name,
        });

        const dutchMsg: ChatMessage = {
          id: crypto.randomUUID(),
          author: 'Sistema',
          text: `🚩 ${player.name} BATEU NA MESA E CHAMOU DUTCH! As cartas dele estão travadas 🔒. Todos os outros têm 1 último turno!`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          system: true,
        };
        io.to(room.code).emit('chat:new', dutchMsg);

        clearTurnTimer(room);
        if (room.phase === 'round-end') {
          handleRoundEnd(io, room);
        } else {
          emitGameStateToAll(io, room);
          startTurnTimer(io, room);
        }
        console.log(`🚩 ${player.name} chamou DUTCH na sala ${room.code}!`);
      } else {
        socket.emit('error', { message: 'Você só pode chamar Dutch no seu turno e antes de comprar carta!' });
      }
    });

    socket.on('game:next-round', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (!player.isHost) {
        socket.emit('error', { message: 'Apenas o host pode iniciar a próxima rodada' });
        return;
      }

      GameEngine.startRound(room);
      emitGameStateToAll(io, room);

      setTimeout(() => {
        GameEngine.endMemorize(room);
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
        triggerBotMatchDiscards(io, room);
      }, 5000);
    });

    // ── Chat ──

    socket.on('chat:message', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        author: player.name,
        text: data.text,
        time: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      io.to(room.code).emit('chat:new', message);
    });

    // ── Desconexão ──

    socket.on('disconnect', () => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      console.log(`🔌 ${player.name} desconectou da sala ${room.code}`);

      if (room.phase === 'lobby') {
        // No lobby, remove o jogador
        const { deleted } = roomManager.leaveRoom(room.code, player.id);
        if (!deleted) {
          io.to(room.code).emit('player:left', { playerId: player.id });
          emitRoomStateToAll(io, room);
        }
      } else {
        // Durante o jogo, marca como desconectado mas mantém no jogo
        player.connected = false;
        emitGameStateToAll(io, room);
      }
    });
  });
}
