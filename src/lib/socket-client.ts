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
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    const handleRoomState = (data: RoomState) => setRoomState(data);
    const handleError = (data: { message: string }) => setError(data.message);

    s.on('room:state', handleRoomState);
    s.on('error' as any, handleError);

    return () => {
      s.off('room:state', handleRoomState);
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
      if (s) s.emit('room:create', data);
    },
    [],
  );

  const joinRoom = useCallback(
    (data: { code: string; playerName: string; avatar: string; password?: string }) => {
      const s = connectSocket();
      if (s) s.emit('room:join', data);
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('room:leave');
    setRoomState(null);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    const s = connectSocket();
    if (s) s.emit('room:ready', { ready });
  }, []);

  const startGame = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:start');
  }, []);

  return { roomState, error, createRoom, joinRoom, leaveRoom, setReady, startGame };
}

/** Hook: estado reativo do jogo */
export function useGame() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [drawnCard, setDrawnCard] = useState<CardModel | null>(null);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    const handleGameState = (data: ClientGameState) => setGameState(data);
    const handleCardDrawn = (data: { card: CardModel }) => setDrawnCard(data.card);
    const handleRoundEnd = (data: any) => setRoundResults(data);
    const handleGameEnd = (data: any) => setGameResults(data);

    s.on('game:state', handleGameState);
    s.on('game:card-drawn', handleCardDrawn as any);
    s.on('game:round-end', handleRoundEnd);
    s.on('game:end', handleGameEnd);

    return () => {
      s.off('game:state', handleGameState);
      s.off('game:card-drawn', handleCardDrawn as any);
      s.off('game:round-end', handleRoundEnd);
      s.off('game:end', handleGameEnd);
    };
  }, []);

  const drawFromDeck = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:draw-deck');
  }, []);

  const drawFromDiscard = useCallback(() => {
    const s = connectSocket();
    if (s) s.emit('game:draw-discard');
  }, []);

  const discardCard = useCallback((cardIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:discard', { cardIndex });
    setDrawnCard(null);
  }, []);

  const swapCard = useCallback((handIndex: number) => {
    const s = connectSocket();
    if (s) s.emit('game:swap', { handIndex });
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
    roundResults,
    gameResults,
    drawFromDeck,
    drawFromDiscard,
    discardCard,
    swapCard,
    useSpecial,
    callDutch,
    nextRound,
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
