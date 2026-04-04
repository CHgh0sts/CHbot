"use client";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(
  userId: string,
  username: string,
  avatar: string | null
): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket || !socket.connected) {
    socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { userId, username, avatar },
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
