import type { GameRoom, RoomSettings, ServerPlayer, RoomState } from '../game/types';
import { GameEngine } from '../game/engine';

/**
 * Gerenciador de salas em memória.
 * Singleton responsável pelo CRUD de salas e busca de jogadores.
 */
export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private static instance: RoomManager;

  private constructor() {
    // Limpa salas inativas a cada 5 minutos
    setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /** Gera código único de sala no formato DUTCH-XXXX */
  generateCode(): string {
    let code: string;
    do {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `DUTCH-${randomPart}`;
    } while (this.rooms.has(code));
    return code;
  }

  /** Cria uma nova sala */
  createRoom(
    hostId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    roomName: string,
    settings: RoomSettings,
    password?: string,
  ): GameRoom {
    const code = this.generateCode();

    const hostPlayer: ServerPlayer = {
      id: hostId,
      socketId,
      name: playerName,
      avatar,
      isHost: true,
      ready: true,
      connected: true,
      score: 0,
      hand: [],
      knownCards: [],
    };

    const room: GameRoom = {
      id: crypto.randomUUID(),
      code,
      name: roomName,
      hostId,
      password,
      settings,
      players: [hostPlayer],
      phase: 'lobby',
      deck: [],
      discardPile: [],
      currentTurnIndex: 0,
      dutchCallerId: null,
      round: 0,
      turnTimer: null,
      turnStartedAt: null,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    return room;
  }

  /** Adiciona jogador a uma sala */
  joinRoom(
    code: string,
    playerId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    password?: string,
  ): GameRoom | { error: string } {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Sala não encontrada' };
    if (room.phase !== 'lobby') return { error: 'O jogo já começou' };
    if (room.players.length >= room.settings.maxPlayers) return { error: 'Sala cheia' };
    if (room.password && room.password !== password) return { error: 'Senha incorreta' };
    if (room.players.some((p) => p.id === playerId)) return { error: 'Jogador já está na sala' };

    const player: ServerPlayer = {
      id: playerId,
      socketId,
      name: playerName,
      avatar,
      isHost: false,
      ready: false,
      connected: true,
      score: 0,
      hand: [],
      knownCards: [],
    };

    room.players.push(player);
    return room;
  }

  /** Remove jogador de uma sala. Transfere host se necessário. */
  leaveRoom(code: string, playerId: string): { room: GameRoom | null; deleted: boolean } {
    const room = this.rooms.get(code);
    if (!room) return { room: null, deleted: false };

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      const wasHost = room.players[playerIndex].isHost;
      room.players.splice(playerIndex, 1);

      if (room.players.length === 0) {
        this.rooms.delete(code);
        return { room: null, deleted: true };
      }

      // Transfere host para o próximo jogador
      if (wasHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
      }
    }

    return { room, deleted: false };
  }

  /** Atualiza status de pronto */
  setReady(code: string, playerId: string, ready: boolean): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.ready = ready;
    }

    return room;
  }

  /** Busca sala por código */
  getRoom(code: string): GameRoom | null {
    return this.rooms.get(code) || null;
  }

  /** Busca sala pelo ID do socket */
  getRoomBySocketId(socketId: string): { room: GameRoom; player: ServerPlayer } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        return { room, player };
      }
    }
    return null;
  }

  /** Lista salas públicas disponíveis */
  listPublicRooms(): RoomState[] {
    const publicRooms: RoomState[] = [];
    for (const room of this.rooms.values()) {
      if (!room.password && room.phase === 'lobby') {
        publicRooms.push(GameEngine.getRoomState(room));
      }
    }
    return publicRooms;
  }

  /** Atualiza socketId de um jogador (reconexão) */
  updateSocketId(code: string, playerId: string, newSocketId: string): void {
    const room = this.rooms.get(code);
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.socketId = newSocketId;
        player.connected = true;
      }
    }
  }

  /** Remove salas inativas há mais de 30 minutos */
  cleanupStaleRooms(): void {
    const now = Date.now();
    const staleTime = 30 * 60 * 1000;
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.createdAt > staleTime && room.phase === 'lobby') {
        this.rooms.delete(code);
        console.log(`🧹 Sala ${code} removida por inatividade`);
      }
    }
  }
}
