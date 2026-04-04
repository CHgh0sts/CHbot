import { randomUUID } from "crypto";
import { WebGameSession, type InternalPlayer } from "./WebGameSession";
import type { CompositionConfig, RoomState } from "@/types/game";

// ─── In-Memory Store ─────────────────────────────────────────────────────────

interface RoomEntry {
  session: WebGameSession;
  code: string;
  name: string | null;
  isPublic: boolean;
}

const rooms = new Map<string, RoomEntry>();
const codeToRoomId = new Map<string, string>();
// userId -> roomId (for reconnection)
const userRoomMap = new Map<string, string>();
// userId -> socketId
const userSocketMap = new Map<string, string>();
// socketId -> userId
const socketUserMap = new Map<string, string>();

// ─── Code Generation ─────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return codeToRoomId.has(code) ? generateCode() : code;
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export function createRoom(
  hostId: string,
  hostUsername: string,
  hostAvatar: string | null,
  name: string | null,
  isPublic: boolean,
  config: CompositionConfig
): { roomId: string; code: string } {
  const roomId = randomUUID();
  const code = generateCode();

  const session = new WebGameSession(roomId, config);
  const hostPlayer: Omit<InternalPlayer, "roleKey" | "camp" | "actorCards"> = {
    id: hostId,
    userId: hostId,
    username: hostUsername,
    avatar: hostAvatar,
    isAlive: true,
    isHost: true,
    isConnected: true,
    loverPartnerId: null,
    isProtected: false,
    lastProtectedId: null,
    elderHit: false,
    idiotRevealed: false,
    isHackTarget: false,
    dogWolfChose: false,
    whitewolfKillUsed: false,
  };
  session.addPlayer(hostPlayer);

  rooms.set(roomId, { session, code, name, isPublic });
  codeToRoomId.set(code, roomId);
  userRoomMap.set(hostId, roomId);

  return { roomId, code };
}

export function joinRoom(
  code: string,
  userId: string,
  username: string,
  avatar: string | null
): { ok: boolean; roomId?: string; error?: string } {
  const roomId = codeToRoomId.get(code.toUpperCase());
  if (!roomId) return { ok: false, error: "Salle introuvable." };

  const entry = rooms.get(roomId);
  if (!entry) return { ok: false, error: "Salle introuvable." };
  if (entry.session.phase !== "lobby")
    return { ok: false, error: "La partie a déjà commencé." };
  if (entry.session.players.size >= entry.session.config.playerCount)
    return { ok: false, error: "La salle est pleine." };
  if (entry.session.players.has(userId)) {
    // Reconnection
    userRoomMap.set(userId, roomId);
    return { ok: true, roomId };
  }

  entry.session.addPlayer({
    id: userId,
    userId,
    username,
    avatar,
    isAlive: true,
    isHost: false,
    isConnected: true,
    loverPartnerId: null,
    isProtected: false,
    lastProtectedId: null,
    elderHit: false,
    idiotRevealed: false,
    isHackTarget: false,
    dogWolfChose: false,
    whitewolfKillUsed: false,
  });

  userRoomMap.set(userId, roomId);
  return { ok: true, roomId };
}

export function leaveRoom(userId: string): string | null {
  const roomId = userRoomMap.get(userId);
  if (!roomId) return null;

  const entry = rooms.get(roomId);
  if (!entry) return null;

  if (entry.session.phase === "lobby") {
    entry.session.players.delete(userId);
    if (entry.session.players.size === 0) {
      rooms.delete(roomId);
      codeToRoomId.delete(entry.code);
    } else if (entry.session.players.values().next().value?.isHost === false) {
      // If host left, assign new host
      const first = entry.session.players.values().next().value;
      if (first) first.isHost = true;
    }
  } else {
    // Mark as disconnected during game
    const player = entry.session.players.get(userId);
    if (player) player.isConnected = false;
  }

  userRoomMap.delete(userId);
  return roomId;
}

export function getRoom(roomId: string): RoomEntry | undefined {
  return rooms.get(roomId);
}

export function getRoomByCode(code: string): RoomEntry | undefined {
  const roomId = codeToRoomId.get(code.toUpperCase());
  return roomId ? rooms.get(roomId) : undefined;
}

export function getUserRoom(userId: string): RoomEntry | undefined {
  const roomId = userRoomMap.get(userId);
  return roomId ? rooms.get(roomId) : undefined;
}

export function getPublicRooms(): RoomState[] {
  return [...rooms.values()]
    .filter((r) => r.isPublic && r.session.phase === "lobby")
    .map((r) => toRoomState(r));
}

export function toRoomState(entry: RoomEntry): RoomState {
  const { session, code, name, isPublic } = entry;
  return {
    roomId: session.roomId,
    code,
    name,
    isPublic,
    status: session.phase === "lobby" ? "lobby" : session.phase,
    hostId:
      [...session.players.values()].find((p) => p.isHost)?.id ?? null,
    players: [...session.players.values()].map((p) =>
      session.toPublicPlayer(p)
    ),
    maxPlayers: session.config.playerCount,
    round: session.round,
    config: session.config,
  };
}

// ─── Socket-User Mapping ──────────────────────────────────────────────────────

export function registerSocket(userId: string, socketId: string): void {
  const prev = userSocketMap.get(userId);
  if (prev) socketUserMap.delete(prev);
  userSocketMap.set(userId, socketId);
  socketUserMap.set(socketId, userId);

  // Reconnect player in room
  const entry = getUserRoom(userId);
  if (entry) {
    const player = entry.session.players.get(userId);
    if (player) player.isConnected = true;
  }
}

export function unregisterSocket(socketId: string): string | null {
  const userId = socketUserMap.get(socketId);
  if (!userId) return null;
  socketUserMap.delete(socketId);
  userSocketMap.delete(userId);

  // Mark as disconnected
  const entry = getUserRoom(userId);
  if (entry) {
    const player = entry.session.players.get(userId);
    if (player) player.isConnected = false;
  }

  return userId;
}

export function getSocketId(userId: string): string | undefined {
  return userSocketMap.get(userId);
}
