import type { Server as SocketIOServer, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ChatMessage,
} from "@/types/game";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getUserRoom,
  registerSocket,
  unregisterSocket,
  toRoomState,
  getPublicRooms,
} from "./game/roomManager";
import {
  startGame,
  processNightAction,
  processVote,
  emitRoomState,
} from "./game/gameEngine";
import { randomUUID } from "crypto";
import { normalizeCompositionConfig } from "@/lib/game/normalizeComposition";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: IO): void {
  io.on("connection", (socket: Sock) => {
    // userId is passed via auth handshake
    const userId = socket.handshake.auth.userId as string | undefined;
    const username = socket.handshake.auth.username as string | undefined;
    const avatar = (socket.handshake.auth.avatar as string | null) ?? null;

    if (!userId || !username) {
      socket.disconnect();
      return;
    }

    registerSocket(userId, socket.id);

    // Auto-rejoin room if player was already in one
    const existingEntry = getUserRoom(userId);
    if (existingEntry) {
      socket.join(existingEntry.session.roomId);
      socket.join(userId);
      const state = toRoomState(existingEntry);
      socket.emit("room:state", state);
      io.to(existingEntry.session.roomId).emit("room:player_connected", userId, true);

      // Re-send private info if game started
      if (existingEntry.session.phase !== "lobby") {
        const player = existingEntry.session.players.get(userId);
        if (player) socket.emit("game:private_info", existingEntry.session.toPrivatePlayer(player));
      }
    }

    // Always join personal room (for private messages)
    socket.join(userId);

    // ─── Room: Create ────────────────────────────────────────────────────
    socket.on("room:create", (data, cb) => {
      const reply = (r: { ok: boolean; code?: string; error?: string }) => {
        if (typeof cb === "function") cb(r);
      };
      try {
        if (!data || typeof data !== "object") {
          reply({ ok: false, error: "Données de création invalides." });
          return;
        }

        const alreadyIn = getUserRoom(userId);
        if (alreadyIn && alreadyIn.session.phase !== "lobby") {
          reply({
            ok: false,
            error:
              "Tu es déjà dans une partie en cours. Quitte la salle ou attends la fin avant d’en créer une nouvelle.",
          });
          return;
        }

        const prevRoomId = leaveRoom(userId);
        if (prevRoomId) {
          socket.leave(prevRoomId);
          io.to(prevRoomId).emit("room:player_left", userId);
          const prevEntry = getRoom(prevRoomId);
          if (prevEntry) io.to(prevRoomId).emit("room:state", toRoomState(prevEntry));
        }

        const config = normalizeCompositionConfig(data.config);
        const { roomId, code } = createRoom(
          userId,
          username,
          avatar,
          data.name ?? null,
          Boolean(data.isPublic),
          config
        );
        socket.join(roomId);
        reply({ ok: true, code });

        const entry = getRoom(roomId);
        if (entry) socket.emit("room:state", toRoomState(entry));
      } catch (err) {
        reply({ ok: false, error: String(err) });
      }
    });

    // ─── Room: Join ──────────────────────────────────────────────────────
    socket.on("room:join", (code, cb) => {
      const result = joinRoom(code, userId, username, avatar);
      if (!result.ok || !result.roomId) {
        cb(result);
        return;
      }

      socket.join(result.roomId);
      cb(result);

      const entry = getRoom(result.roomId);
      if (!entry) return;

      // Notify room
      const pub = entry.session.toPublicPlayer(entry.session.players.get(userId)!);
      io.to(result.roomId).emit("room:player_joined", pub);
      socket.emit("room:state", toRoomState(entry));
    });

    // ─── Room: Leave ─────────────────────────────────────────────────────
    socket.on("room:leave", () => {
      const roomId = leaveRoom(userId);
      if (roomId) {
        socket.leave(roomId);
        io.to(roomId).emit("room:player_left", userId);
        const entry = getRoom(roomId);
        if (entry) io.to(roomId).emit("room:state", toRoomState(entry));
      }
    });

    // ─── Room: Kick ──────────────────────────────────────────────────────
    socket.on("room:kick", (targetId) => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      const host = entry.session.players.get(userId);
      if (!host?.isHost) return;
      const roomId = leaveRoom(targetId);
      if (roomId) {
        io.to(targetId).emit("error", "Vous avez été expulsé de la salle.");
        io.to(roomId).emit("room:player_left", targetId);
        io.to(roomId).emit("room:state", toRoomState(entry));
      }
    });

    // ─── Game: Start ─────────────────────────────────────────────────────
    socket.on("game:start", async (cb) => {
      const entry = getUserRoom(userId);
      if (!entry) return cb({ ok: false, error: "Pas dans une salle." });

      const host = entry.session.players.get(userId);
      if (!host?.isHost) return cb({ ok: false, error: "Seul l'hôte peut démarrer." });

      const playerCount = entry.session.players.size;
      if (playerCount < 4) return cb({ ok: false, error: "Minimum 4 joueurs." });

      const cfg = entry.session.config;
      if (playerCount !== cfg.playerCount) {
        entry.session.config = { ...cfg, playerCount };
      }

      cb({ ok: true });
      await startGame(io, entry.session);
    });

    // ─── Game: Night Action ──────────────────────────────────────────────
    socket.on("game:night_action", (action) => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      if (entry.session.phase !== "night") return;
      processNightAction(io, entry.session, userId, action);
    });

    // ─── Game: Vote ──────────────────────────────────────────────────────
    socket.on("game:vote", (targetId) => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      if (entry.session.phase !== "vote") return;
      processVote(io, entry.session, userId, targetId);
    });

    // ─── Game: Hunter Shoot ──────────────────────────────────────────────
    socket.on("game:hunter_shoot", (targetId) => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      const hunter = entry.session.players.get(userId);
      if (!hunter || hunter.isAlive) return; // must be dead
      if (hunter.roleKey !== "hunter") return;

      const anns = entry.session.kill(targetId);
      for (const ann of anns) io.to(entry.session.roomId).emit("game:announcement", ann);
      emitRoomState(io, entry.session);
    });

    // ─── Game: Servant Take Place ────────────────────────────────────────
    socket.on("game:servant_take_place", (take) => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      const servant = entry.session.players.get(userId);
      if (!servant || servant.roleKey !== "devoted_servant") return;

      if (take && entry.session.servantVictimId && entry.session.servantAvailable) {
        const victimId = entry.session.servantVictimId;
        const victim = entry.session.players.get(victimId);
        if (victim && servant) {
          // Servant takes victim's role
          const stolenRole = victim.roleKey;
          servant.roleKey = stolenRole;
          servant.camp = victim.camp;
          entry.session.servantAvailable = false;

          // Victim survives
          io.to(entry.session.roomId).emit(
            "game:announcement",
            entry.session.makeAnnouncement("system", {
              type: "system",
              message: `🫅 La Servante Dévouée prend la place de **${victim.username}** ! Elle hérite de son rôle.`,
              data: { servantId: userId, victimId },
            })
          );

          // Notify servant of new role
          io.to(userId).emit(
            "game:private_info",
            entry.session.toPrivatePlayer(servant)
          );
          emitRoomState(io, entry.session);
        }
      }
    });

    // ─── Chat ────────────────────────────────────────────────────────────
    socket.on("chat:send", (text) => {
      const entry = getUserRoom(userId);
      if (!entry) return;

      const trimmed = text.trim().slice(0, 500);
      if (!trimmed) return;

      const player = entry.session.players.get(userId);
      if (!player?.isAlive) return; // dead can't chat

      const msg: ChatMessage = {
        id: randomUUID(),
        playerId: userId,
        username: player.username,
        avatar: player.avatar,
        text: trimmed,
        timestamp: Date.now(),
      };

      io.to(entry.session.roomId).emit("chat:message", msg);
    });

    // ─── Voice: WebRTC Signaling ─────────────────────────────────────────
    socket.on("voice:join", () => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      socket.to(entry.session.roomId).emit("voice:user_joined", userId);
    });

    socket.on("voice:signal", (toId, signal) => {
      io.to(toId).emit("voice:signal", userId, signal);
    });

    socket.on("voice:leave", () => {
      const entry = getUserRoom(userId);
      if (!entry) return;
      io.to(entry.session.roomId).emit("voice:user_left", userId);
    });

    // ─── Disconnect ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      unregisterSocket(socket.id);
      const entry = getUserRoom(userId);
      if (entry) {
        io.to(entry.session.roomId).emit("room:player_connected", userId, false);
      }
    });
  });
}
