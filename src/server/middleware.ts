import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../game/types';
import { registerSocketHandlers } from './socket-handler';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

/** Inicializa o Socket.IO no servidor HTTP */
export function initializeSocketIO(httpServer: any): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  if (io) return io;
  
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',  // em produção, restringir
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  
  registerSocketHandlers(io);
  
  console.log('🎴 Socket.IO inicializado para DUTCH');
  
  return io;
}

/** Retorna a instância do Socket.IO */
export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null {
  return io;
}
