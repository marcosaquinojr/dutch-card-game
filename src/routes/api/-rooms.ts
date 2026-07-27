import { createServerFn } from '@tanstack/react-start';
import { RoomManager } from '../../server/room-manager';

/** Server function: Lista salas públicas disponíveis */
export const listRooms = createServerFn({ method: 'GET' }).handler(async () => {
  const manager = RoomManager.getInstance();
  const rooms = manager.listPublicRooms();
  return { rooms, count: rooms.length };
});
