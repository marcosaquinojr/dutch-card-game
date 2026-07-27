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

/** Configura timer para o turno atual */
function startTurnTimer(io: TypedServer, room: GameRoom): void {
  clearTurnTimer(room);
  room.turnStartedAt = Date.now();

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
function handleRoundEnd(io: TypedServer, room: GameRoom): void {
  clearTurnTimer(room);

  // Calcula resultados da rodada (já inclui bônus Dutch)
  const results = calculateRoundResults(room);

  // Aplica scores cumulativos nos jogadores
  for (const result of results) {
    const player = room.players.find((p) => p.id === result.playerId);
    if (player) {
      player.score = result.cumulativeScore;
    }
  }

  // Emite resultados da rodada
  io.to(room.code).emit('game:round-end', { results });

  // Verifica se o jogo acabou
  const gameEnd = checkGameEnd(room);
  if (gameEnd.ended) {
    room.phase = 'game-end';
    // O vencedor é quem tem MENOR pontuação
    const winner = room.players.reduce((prev, curr) =>
      prev.score < curr.score ? prev : curr,
    );
    io.to(room.code).emit('game:end', { results, winnerId: winner.id });
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
      const room = roomManager.createRoom(
        socket.id,
        socket.id,
        data.playerName,
        data.avatar,
        data.roomName,
        data.settings,
        data.password,
      );
      socket.join(room.code);
      socket.emit('room:state', GameEngine.getRoomState(room));
      console.log(`🏠 Sala criada: ${room.code} por ${data.playerName}`);
    });

    socket.on('room:join', (data) => {
      const result = roomManager.joinRoom(
        data.code,
        socket.id,
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
      const newPlayer = result.players.find((p) => p.id === socket.id);
      if (newPlayer) {
        io.to(result.code).emit('player:joined', {
          id: newPlayer.id,
          name: newPlayer.name,
          avatar: newPlayer.avatar,
          isHost: newPlayer.isHost,
          ready: newPlayer.ready,
          cardsCount: 0,
          score: 0,
          connected: true,
        });
      }

      emitRoomStateToAll(io, result);
      console.log(`👤 ${data.playerName} entrou na sala ${data.code}`);
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
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const card = GameEngine.drawFromDiscard(room, player.id);
      if (!card) {
        socket.emit('error', { message: 'Não é possível comprar do descarte agora' });
        return;
      }

      socket.emit('game:card-drawn', { card, fromDeck: false });
      emitGameStateToAll(io, room);
    });

    socket.on('game:discard', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (!GameEngine.isPlayerTurn(room, player.id)) return;

      // O jogador descarta a carta que comprou (precisa ter comprado antes)
      // Nota: em uma implementação mais robusta, rastrearíamos a carta comprada
      // Por ora, descartamos do índice da mão
      const card = player.hand[data.cardIndex];
      if (card) {
        GameEngine.discardDrawnCard(room, player.id, card);
      }

      GameEngine.nextTurn(room);
      clearTurnTimer(room);

      if (room.phase === 'round-end') {
        handleRoundEnd(io, room);
      } else {
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
      }
    });

    socket.on('game:swap', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      if (!GameEngine.isPlayerTurn(room, player.id)) return;

      // Nota: precisaríamos rastrear a carta comprada para o swap completo
      // Simplificação: usamos a última carta comprada
      const drawnCard = room.discardPile[room.discardPile.length - 1];
      if (drawnCard) {
        GameEngine.swapWithHand(room, player.id, data.handIndex, drawnCard);
      }

      GameEngine.nextTurn(room);
      clearTurnTimer(room);

      if (room.phase === 'round-end') {
        handleRoundEnd(io, room);
      } else {
        emitGameStateToAll(io, room);
        startTurnTimer(io, room);
      }
    });

    socket.on('game:use-special', (data) => {
      const roomData = roomManager.getRoomBySocketId(socket.id);
      if (!roomData) return;
      const { room, player } = roomData;

      const result = GameEngine.useSpecial(
        room,
        player.id,
        data.kind,
        data.targetPlayerId,
        data.targetCardIndex,
      );
      socket.emit('game:special-result', {
        kind: data.kind,
        card: result.card,
        success: result.success,
      });
      emitGameStateToAll(io, room);

      // Se foi espiada ('peek'), atualiza novamente após 5.2 segundos para virar para baixo
      if (data.kind === 'peek') {
        setTimeout(() => {
          emitGameStateToAll(io, room);
        }, 5200);
      }
    });

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
        emitGameStateToAll(io, room);
        console.log(`🚩 ${player.name} chamou DUTCH na sala ${room.code}!`);
      } else {
        socket.emit('error', { message: 'Não é possível chamar Dutch agora' });
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
