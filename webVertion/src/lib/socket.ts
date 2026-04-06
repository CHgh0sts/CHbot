"use client";
import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(
  userId: string,
  username: string,
  avatar: string | null
): Socket<ServerToClientEvents, ClientToServerEvents> {
  // Une seule instance : si on recréait io() tant que connected === false, les écouteurs
  // (SocketProvider) restaient sur l’ancienne socket et room:create semblait « ne pas marcher ».
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { userId, username, avatar },
    });
  } else {
    socket.auth = { userId, username, avatar };
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
