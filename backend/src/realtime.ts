import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    socket.on('join-ticket', (ticketId: string) => {
      if (typeof ticketId === 'string') socket.join(`ticket:${ticketId}`);
    });
  });
  return io;
}

export function emit(event: string, payload: unknown) {
  io?.emit(event, payload);
}

export function emitToTicket(ticketId: string, event: string, payload: unknown) {
  io?.to(`ticket:${ticketId}`).emit(event, payload);
  io?.emit(event, payload);
}
