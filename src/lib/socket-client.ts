import { io, Socket } from 'socket.io-client';
import { useState, useEffect, useCallback } from 'react';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  ClientGameState,
  ChatMessage,
  RoomSettings,
  CardModel,
} from '../game/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getPersistentPlayerId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('dutch_playerId');
  if (!id) {
    id = `p-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem('dutch_playerId', id);
  }
  return id;
}

let globalRoomState: RoomState | null = null;
let globalGameState: ClientGameState | null = null;
const roomListeners = new Set<(state: RoomState | null) => void>();
const gameListeners = new Set<(state: ClientGameState | null) => void>();

/** Conecta ao servidor Socket.IO (apenas no navegador) */
export function connectSocket(): TypedSocket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor Socket.IO:', socket?.id);
      const roomCode = localStorage.getItem('dutch_currentRoomCode') || undefined;
      socket?.emit('game:sync', {
        playerId: getPersistentPlayerId(),
        roomCode,
      });
    });

    socket.on('room:state', (data: RoomState) => {
      globalRoomState = data;
      if (typeof window !== 'undefined' && data.code) {
        localStorage.setItem('dutch_currentRoomCode', data.code);
      }
      roomListeners.forEach((fn) => fn(data));
    });

    socket.on('game:state', (data: ClientGameState) => {
      globalGameState = data;
      gameListeners.forEach((fn) => fn(data));
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Erro de conexão Socket.IO:', err.message);
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/** Desconecta do servidor */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Retorna a instância do socket */
export function getSocket(): TypedSocket | null {
  return socket;
}

/** Hook: estado reativo da sala */
export function useRoom() {
  const [roomState, setRoomState] = useState<RoomState | null>(globalRoomState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    roomListeners.add(setRoomState);

    const roomCode = typeof window !== 'undefined' ? localStorage.getItem('dutch_currentRoomCode') : null;
    s.emit('game:sync', { playerId: getPersistentPlayerId(), roomCode: roomCode || undefined });

    const handleError = (data: { message: string }) => setError(data.message);
    s.on('error' as any, handleError);

    return () => {
      roomListeners.delete(setRoomState);
      s.off('error' as any, handleError);
    };
  }, []);

  const createRoom = useCallback(
    (data: {
      settings: RoomSettings;
      playerName: string;
      avatar: string;
      roomName: string;
      password?: string;
    }) => {
      const s = connectSocket();
      if (s) {
        s.emit('room:create', {
          ...data,
          playerId: getPersistentPlayerId(),
        });
      }
    },
    [],
  );

  const joinRoom = useCallback(
    (data: { code: string; playerName: string; avatar: string; password?: string }) => {
      const s = connectSocket();
      if (s) {
        s.emit('room:join', {
          ...data,
          playerId: getPersistentPlayerId(),
        });
      }
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('room:leave');
    globalRoomState = null;
    globalGameState = null;
    setRoomState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dutch_currentRoomCode');
    }
  }, []);

  const setReady = useCallback((ready: boolean) => {
    const s = connectSocket();
    if (s) s.emit('room:ready', { ready });
  }, []);

  const startGame = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:start');
  }, []);

  const addBot = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('room:add-bot');
  }, []);

  const removeBot = useCallback((botId: string) => {
    const s = connectSocket();
    if (s) s.emit('room:remove-bot', { botId });
  }, []);

  return { roomState, error, createRoom, joinRoom, leaveRoom, setReady, startGame, addBot, removeBot };
}

/** Hook: estado reativo do jogo */
export function useGame() {
  const [gameState, setGameState] = useState<ClientGameState | null>(globalGameState);
  const [drawnCard, setDrawnCard] = useState<CardModel | null>(globalGameState?.drawnCard || null);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);

  const [pendingEffect, setPendingEffect] = useState<{ effect: 'queen-peek' | 'jack-swap'; cardValue: string } | null>(
    globalGameState?.pendingEffect || null
  );
  const [matchResult, setMatchResult] = useState<any>(null);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    const handleUpdate = (data: ClientGameState | null) => {
      setGameState(data);
      if (data?.drawnCard) {
        setDrawnCard(data.drawnCard);
      } else if (data && !data.drawnCard) {
        setDrawnCard(null);
      }
      if (data?.pendingEffect) {
        setPendingEffect(data.pendingEffect);
      }
    };

    gameListeners.add(handleUpdate);

    // Sincroniza imediatamente com o servidor
    const roomCode = typeof window !== 'undefined' ? localStorage.getItem('dutch_currentRoomCode') : null;
    s.emit('game:sync', {
      playerId: getPersistentPlayerId(),
      roomCode: roomCode || undefined,
    });

    const handleCardDrawn = (data: { card: CardModel }) => setDrawnCard(data.card);
    const handleRoundEnd = (data: any) => setRoundResults(data);
    const handleGameEnd = (data: any) => setGameResults(data);
    const handleEffectPending = (data: { effect: 'queen-peek' | 'jack-swap'; cardValue: string }) => setPendingEffect(data);
    const handleMatchResult = (data: any) => setMatchResult(data);

    s.on('game:card-drawn', handleCardDrawn as any);
    s.on('game:round-end', handleRoundEnd);
    s.on('game:end', handleGameEnd);
    s.on('game:effect-pending', handleEffectPending);
    s.on('game:match-result', handleMatchResult);

    return () => {
      gameListeners.delete(handleUpdate);
      s.off('game:card-drawn', handleCardDrawn as any);
      s.off('game:round-end', handleRoundEnd);
      s.off('game:end', handleGameEnd);
      s.off('game:effect-pending', handleEffectPending);
      s.off('game:match-result', handleMatchResult);
    };
  }, []);

  const syncGame = useCallback(() => {
    const s = connectSocket();
    if (s) {
      const roomCode = typeof window !== 'undefined' ? localStorage.getItem('dutch_currentRoomCode') : null;
      s.emit('game:sync', { playerId: getPersistentPlayerId(), roomCode: roomCode || undefined });
    }
  }, []);

  const drawFromDeck = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:draw-deck');
  }, []);

  const drawFromDiscard = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:draw-discard');
  }, []);

  const discardDrawnCard = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:discard-drawn');
    setDrawnCard(null);
  }, []);

  const swapDrawnCard = useCallback((handIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:swap-drawn', { handIndex });
    setDrawnCard(null);
  }, []);

  const matchDiscard = useCallback((handIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:match-discard', { handIndex });
  }, []);

  const queenPeek = useCallback((cardIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:queen-peek', { cardIndex });
    setPendingEffect(null);
  }, []);

  const jackSwap = useCallback(
    (player1Id: string, cardIndex1: number, player2Id: string, cardIndex2: number) => {
      const s = connectSocket();
      if (s) s.emit('game:jack-swap', { player1Id, cardIndex1, player2Id, cardIndex2 });
      setPendingEffect(null);
    },
    [],
  );

  const discardCard = useCallback((cardIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:discard-drawn');
    setDrawnCard(null);
  }, []);

  const swapCard = useCallback((handIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:swap-drawn', { handIndex });
    setDrawnCard(null);
  }, []);

  const useSpecial = useCallback(
    (
      kind: 'peek' | 'swap' | 'reveal' | 'steal',
      targetPlayerId?: string,
      targetCardIndex?: number,
    ) => {
      const s = connectSocket();
      if (s) s.emit('game:use-special', { kind, targetPlayerId, targetCardIndex });
    },
    [],
  );

  const callDutch = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:call-dutch');
  }, []);

  const nextRound = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:next-round');
  }, []);

  return {
    gameState,
    drawnCard,
    pendingEffect,
    setPendingEffect,
    matchResult,
    roundResults,
    gameResults,
    drawFromDeck,
    drawFromDiscard,
    discardDrawnCard,
    swapDrawnCard,
    matchDiscard,
    queenPeek,
    jackSwap,
    discardCard,
    swapCard,
    useSpecial,
    callDutch,
    nextRound,
    syncGame,
  };
}

/** Hook: chat reativo */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    s.on('chat:new', handleNewMessage);

    return () => {
      s.off('chat:new', handleNewMessage);
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const s = connectSocket();
    if (s) s.emit('chat:message', { text });
  }, []);

  return { messages, sendMessage };
}
