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

/** Conecta ao servidor Socket.IO */
export function connectSocket(): TypedSocket {
  if (socket?.connected) return socket;
  socket = io({
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

/** Desconecta do servidor */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
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
    
    s.on('room:state', (data) => setRoomState(data as any));
    s.on('error' as any, (data: any) => setError(data.message));
    
    return () => {
      s.off('room:state');
      s.off('error' as any);
    };
  }, []);
  
  const createRoom = useCallback((data: { settings: RoomSettings; playerName: string; avatar: string; roomName: string; password?: string }) => {
    connectSocket().emit('room:create', data);
  }, []);
  
  const joinRoom = useCallback((data: { code: string; playerName: string; avatar: string; password?: string }) => {
    connectSocket().emit('room:join', data);
  }, []);
  
  const leaveRoom = useCallback(() => {
    connectSocket().emit('room:leave');
    setRoomState(null);
  }, []);
  
  const setReady = useCallback((ready: boolean) => {
    connectSocket().emit('room:ready', { ready });
  }, []);
  
  const startGame = useCallback(() => {
    connectSocket().emit('game:start');
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
    
    s.on('game:state', (data) => setGameState(data as any));
    s.on('game:card-drawn', (data) => setDrawnCard(data.card as any));
    s.on('game:round-end', (data) => setRoundResults(data));
    s.on('game:end', (data) => setGameResults(data));
    
    return () => {
      s.off('game:state');
      s.off('game:card-drawn');
      s.off('game:round-end');
      s.off('game:end');
    };
  }, []);
  
  const drawFromDeck = useCallback(() => {
    connectSocket().emit('game:draw-deck');
  }, []);
  
  const drawFromDiscard = useCallback(() => {
    connectSocket().emit('game:draw-discard');
  }, []);
  
  const discardCard = useCallback((cardIndex: number) => {
    connectSocket().emit('game:discard', { cardIndex });
    setDrawnCard(null);
  }, []);
  
  const swapCard = useCallback((handIndex: number) => {
    connectSocket().emit('game:swap', { handIndex });
    setDrawnCard(null);
  }, []);
  
  const useSpecial = useCallback((kind: 'peek' | 'swap' | 'reveal' | 'steal', targetPlayerId?: string, targetCardIndex?: number) => {
    connectSocket().emit('game:use-special', { kind, targetPlayerId, targetCardIndex });
  }, []);
  
  const callDutch = useCallback(() => {
    connectSocket().emit('game:call-dutch');
  }, []);
  
  const nextRound = useCallback(() => {
    connectSocket().emit('game:next-round');
  }, []);
  
  return { gameState, drawnCard, roundResults, gameResults, drawFromDeck, drawFromDiscard, discardCard, swapCard, useSpecial, callDutch, nextRound };
}

/** Hook: chat reativo */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    const s = connectSocket();
    
    s.on('chat:new', (msg) => {
      setMessages((prev) => [...prev, msg as any]);
    });
    
    return () => { s.off('chat:new'); };
  }, []);
  
  const sendMessage = useCallback((text: string) => {
    connectSocket().emit('chat:message', { text });
  }, []);
  
  return { messages, sendMessage };
}
