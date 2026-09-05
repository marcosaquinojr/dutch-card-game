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
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [drawnCard, setDrawnCard] = useState<CardModel | null>(null);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);

  const [pendingEffect, setPendingEffect] = useState<{ effect: 'queen-peek' | 'jack-swap'; cardValue: string } | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);

  useEffect(() => {
    const s = connectSocket();
    if (!s) return;

    const handleGameState = (data: ClientGameState) => {
      setGameState(data);
      if (data.drawnCard) {
        setDrawnCard(data.drawnCard);
      } else if (!data.drawnCard) {
        setDrawnCard(null);
      }
      if (data.pendingEffect) {
        setPendingEffect(data.pendingEffect);
      }
    };
    const handleCardDrawn = (data: { card: CardModel }) => setDrawnCard(data.card);
    const handleRoundEnd = (data: any) => setRoundResults(data);
    const handleGameEnd = (data: any) => setGameResults(data);
    const handleEffectPending = (data: { effect: 'queen-peek' | 'jack-swap'; cardValue: string }) => setPendingEffect(data);
    const handleMatchResult = (data: any) => setMatchResult(data);

    s.on('game:state', handleGameState);
    s.on('game:card-drawn', handleCardDrawn as any);
    s.on('game:round-end', handleRoundEnd);
    s.on('game:end', handleGameEnd);
    s.on('game:effect-pending', handleEffectPending);
    s.on('game:match-result', handleMatchResult);

    return () => {
      s.off('game:state', handleGameState);
      s.off('game:card-drawn', handleCardDrawn as any);
      s.off('game:round-end', handleRoundEnd);
      s.off('game:end', handleGameEnd);
      s.off('game:effect-pending', handleEffectPending);
      s.off('game:match-result', handleMatchResult);
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
