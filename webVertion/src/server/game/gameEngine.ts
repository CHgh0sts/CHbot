import { randomUUID } from "crypto";
import type { Server as SocketIOServer } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  NightSubPhase,
  Camp,
} from "@/types/game";
import { isWolf, ROLES } from "@/lib/game/roles";
import { WebGameSession } from "./WebGameSession";
import { toRoomState, getRoom } from "./roomManager";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

const ACTION_TIMEOUT_SEC = 90;

// ─── Start Game ───────────────────────────────────────────────────────────────

export async function startGame(io: IO, session: WebGameSession): Promise<void> {
  const entry = getRoom(session.roomId);
  if (!entry) return;

  session.assignRoles();
  session.phase = "night";
  session.round = 1;

  // Broadcast updated state
  emitRoomState(io, session);

  // Send private role info to each player
  for (const [, player] of session.players) {
    const privateInfo = session.toPrivatePlayer(player);
    io.to(player.id).emit("game:private_info", privateInfo);
  }

  // Announce game start
  const msg = session.makeAnnouncement("system", {
    type: "system",
    message: `🐺 La partie commence ! Il y a **${session.players.size}** joueurs. La nuit tombe sur le village…`,
    data: {},
  });
  io.to(session.roomId).emit("game:announcement", msg);

  await runNightPhase(io, session);
}

// ─── Night Phase ──────────────────────────────────────────────────────────────

async function runNightPhase(io: IO, session: WebGameSession): Promise<void> {
  session.nightActions.clear();
  session.wolvesVotes.clear();
  session.nightHeal = null;

  const subPhases = buildNightOrder(session);

  for (const subPhase of subPhases) {
    await runSubPhase(io, session, subPhase);
    const win = session.checkWinCondition();
    if (win) {
      await endGame(io, session, win.winner, win.winnerIds);
      return;
    }
  }

  // Resolve night deaths
  const killed = session.resolveNight();
  const deathAnnouncements: string[] = [];

  for (const id of killed) {
    const anns = session.kill(id);
    for (const ann of anns) {
      io.to(session.roomId).emit("game:announcement", ann);
      deathAnnouncements.push(ann.message);
    }

    // Hunter: if hunter killed, he can shoot
    const player = session.players.get(id);
    if (player?.roleKey === "hunter") {
      await runHunterShoot(io, session, id);
    }
  }

  if (killed.length === 0) {
    io.to(session.roomId).emit(
      "game:announcement",
      session.makeAnnouncement("system", {
        type: "system",
        message: `🌙 Le village se réveille sain et sauf. Personne n'est mort cette nuit.`,
        data: {},
      })
    );
  }

  emitRoomState(io, session);

  const win = session.checkWinCondition();
  if (win) {
    await endGame(io, session, win.winner, win.winnerIds);
    return;
  }

  await runDayPhase(io, session);
}

// ─── Night Sub-Phases ────────────────────────────────────────────────────────

function buildNightOrder(session: WebGameSession): NightSubPhase[] {
  const order: NightSubPhase[] = [];

  if (session.round === 1 && session.config.includeCupid) order.push("cupid");
  if (session.round === 1 && session.config.includeHackeur) order.push("hackeur");
  if (session.config.includeDogWolf && session.round === 1) order.push("hackeur"); // dog wolf uses "hackeur" slot temporarily

  // Always: werewolves
  order.push("werewolves");

  // Optional
  if (session.round === 1 && session.config.includeDogWolf)
    order.splice(order.indexOf("werewolves"), 0, "hackeur"); // placeholder

  if (session.config.includeGuard) order.push("guard");
  if (session.config.includeSeer) order.push("seer");
  if (session.config.includeDoctor) order.push("doctor");
  if (session.config.includeWitch) order.push("witch");
  if (session.config.includeFox) order.push("fox");
  if (session.config.includeNecromancer) order.push("necromancer");
  if (session.config.includeRaven) order.push("raven");
  if (session.config.includeWhiteWolf && session.round % 2 === 0)
    order.push("white_wolf");
  if (session.config.includeActor) order.push("actor");

  return buildNightOrderProper(session);
}

function buildNightOrderProper(session: WebGameSession): NightSubPhase[] {
  const order: NightSubPhase[] = [];
  const c = session.config;

  if (session.round === 1 && c.includeCupid) order.push("cupid");
  if (session.round === 1 && c.includeHackeur) order.push("hackeur");
  if (session.round === 1 && c.includeDogWolf) order.push("hackeur"); // dog_wolf picks camp

  // Remove duplicates
  const unique = [...new Set(order)];

  unique.push("werewolves");
  if (c.includeInfectedWolf) unique.push("infected");
  if (c.includeGuard) unique.push("guard");
  if (c.includeSeer) unique.push("seer");
  if (c.includeDoctor) unique.push("doctor");
  if (c.includeWitch) unique.push("witch");
  if (c.includeFox) unique.push("fox");
  if (c.includeNecromancer) unique.push("necromancer");
  if (c.includeRaven) unique.push("raven");
  if (c.includeWhiteWolf && session.round % 2 === 0) unique.push("white_wolf");
  if (c.includeActor) unique.push("actor");
  if (c.includeBearTamer) unique.push("bear");

  return unique;
}

async function runSubPhase(
  io: IO,
  session: WebGameSession,
  subPhase: NightSubPhase
): Promise<void> {
  const actorIds = getActorsForSubPhase(session, subPhase);
  if (actorIds.length === 0) return;

  session.currentNightPhase = subPhase;

  // Notify actors it's their turn
  for (const id of actorIds) {
    io.to(id).emit("game:your_turn", subPhase, ACTION_TIMEOUT_SEC);
  }

  io.to(session.roomId).emit("game:night_phase", {
    subPhase,
    actorIds,
    timeoutSec: ACTION_TIMEOUT_SEC,
  });

  await waitForActions(session, actorIds, ACTION_TIMEOUT_SEC * 1000);
  session.currentNightPhase = null;
}

function getActorsForSubPhase(
  session: WebGameSession,
  subPhase: NightSubPhase
): string[] {
  const alive = session.getAlivePlayers();

  switch (subPhase) {
    case "werewolves":
      return alive.filter((p) => isWolf(p.roleKey) && p.roleKey !== "white_wolf").map((p) => p.id);
    case "seer":
      return alive.filter((p) => p.roleKey === "seer").map((p) => p.id);
    case "witch":
      return alive.filter((p) => p.roleKey === "witch").map((p) => p.id);
    case "doctor":
      return alive.filter((p) => p.roleKey === "doctor").map((p) => p.id);
    case "guard":
      return alive.filter((p) => p.roleKey === "guard").map((p) => p.id);
    case "cupid":
      return alive.filter((p) => p.roleKey === "cupid" && !session.cupidDone).map((p) => p.id);
    case "hackeur":
      return alive.filter((p) => p.roleKey === "hackeur" && !session.hackeurTargetId).map((p) => p.id);
    case "fox":
      return alive.filter((p) => p.roleKey === "fox").map((p) => p.id);
    case "raven":
      return alive.filter((p) => p.roleKey === "raven").map((p) => p.id);
    case "necromancer":
      return alive.filter((p) => p.roleKey === "necromancer").map((p) => p.id);
    case "white_wolf":
      return alive.filter((p) => p.roleKey === "white_wolf").map((p) => p.id);
    case "infected":
      return alive.filter((p) => p.roleKey === "infected_wolf" && !session.infectUsed).map((p) => p.id);
    case "actor":
      return alive.filter((p) => p.roleKey === "actor").map((p) => p.id);
    case "bear":
      return []; // passive
    default:
      return [];
  }
}

function waitForActions(
  session: WebGameSession,
  actorIds: string[],
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const interval = setInterval(() => {
      const allDone = actorIds.every((id) => session.nightActions.has(id));
      if (allDone) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve();
      }
    }, 500);
  });
}

// ─── Process Night Action ────────────────────────────────────────────────────

export function processNightAction(
  io: IO,
  session: WebGameSession,
  playerId: string,
  action: import("@/types/game").NightActionRequest
): void {
  session.nightActions.set(playerId, action);

  const player = session.players.get(playerId);
  if (!player) return;

  switch (action.subPhase) {
    case "werewolves":
      if (action.targetId) session.wolvesVotes.set(playerId, action.targetId);
      break;

    case "infected":
      if (action.targetId && action.choice === "infect") {
        session.infectThisNight = true;
        session.infectVictimId = action.targetId;
      }
      break;

    case "witch":
      if (action.choice === "heal" && !session.witchHealUsed) {
        const wolfTarget = session.resolveNight(); // peek
        session.nightHeal = wolfTarget[0] ?? null;
        session.witchHealUsed = true;
      } else if (action.choice === "kill" && action.targetId && !session.witchKillUsed) {
        session.witchKillUsed = true;
      }
      break;

    case "guard":
      if (action.targetId) {
        const prev = player.lastProtectedId;
        if (action.targetId !== prev) {
          const target = session.players.get(action.targetId);
          if (target) {
            target.isProtected = true;
            player.lastProtectedId = action.targetId;
          }
        }
      }
      break;

    case "doctor":
      if (action.targetId) {
        const target = session.players.get(action.targetId);
        if (target) target.isProtected = true;
      }
      break;

    case "seer":
      if (action.targetId) {
        const target = session.players.get(action.targetId);
        if (target) {
          // Hackeur appears as random village role before theft
          let apparentRole = target.roleKey;
          if (
            target.roleKey === "hackeur" &&
            !session.hackeurHasStolen
          ) {
            const villageRoles = [...session.players.values()]
              .filter((p) => p.camp === "village" && p.id !== target.id)
              .map((p) => p.roleKey);
            apparentRole =
              villageRoles[Math.floor(Math.random() * villageRoles.length)] ??
              "villager";
          }
          io.to(playerId).emit(
            "game:announcement",
            session.makeAnnouncement("role_reveal", {
              type: "role_reveal",
              message: `🔮 La voyante observe **${target.username}** : il est **${ROLES[apparentRole].name}**.`,
              data: { targetId: target.id, roleKey: apparentRole },
            })
          );
        }
      }
      break;

    case "cupid":
      if (action.targetIds && action.targetIds.length === 2 && !session.cupidDone) {
        const [a, b] = action.targetIds;
        const pA = session.players.get(a);
        const pB = session.players.get(b);
        if (pA && pB) {
          pA.loverPartnerId = b;
          pB.loverPartnerId = a;
          session.cupidDone = true;
          io.to(a).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `💘 Cupidon vous a frappé ! Votre amour est **${pB.username}**.`,
              data: { partnerId: b },
            })
          );
          io.to(b).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `💘 Cupidon vous a frappé ! Votre amour est **${pA.username}**.`,
              data: { partnerId: a },
            })
          );
        }
      }
      break;

    case "hackeur":
      if (action.targetId && !session.hackeurTargetId) {
        session.hackeurTargetId = action.targetId;
        const target = session.players.get(action.targetId);
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `💻 Vous avez ciblé **${target?.username ?? "?"}**. Quand il mourra, vous héritez de son rôle.`,
            data: { targetId: action.targetId },
          })
        );
      }
      break;

    case "raven":
      if (action.targetId) {
        session.ravenTarget = action.targetId;
        const target = session.players.get(action.targetId);
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `🐦‍⬛ Vous avez désigné **${target?.username ?? "?"}** pour recevoir +2 votes demain.`,
            data: {},
          })
        );
      }
      break;

    case "white_wolf":
      if (action.targetId && !player.whitewolfKillUsed) {
        const target = session.players.get(action.targetId);
        if (target && isWolf(target.roleKey) && target.id !== playerId) {
          player.whitewolfKillUsed = true;
          const anns = session.kill(action.targetId);
          for (const ann of anns) io.to(session.roomId).emit("game:announcement", ann);
        }
      }
      break;
  }
}

// ─── Day Phase ────────────────────────────────────────────────────────────────

async function runDayPhase(io: IO, session: WebGameSession): Promise<void> {
  session.phase = "day";
  session.round++;
  emitRoomState(io, session);

  const dayMsg = session.makeAnnouncement("phase_change", {
    type: "phase_change",
    message: `☀️ **Jour ${session.round}** — Les survivants débattent…`,
    data: { round: session.round },
  });
  io.to(session.roomId).emit("game:announcement", dayMsg);
  io.to(session.roomId).emit("game:day_phase", session.round);

  // Bear tamer check
  const bearTamer = session.getPlayerByRole("bear_tamer");
  if (bearTamer && bearTamer.isAlive) {
    const alive = session.getAlivePlayers();
    const bearIdx = alive.findIndex((p) => p.id === bearTamer.id);
    const neighbors = [
      alive[bearIdx - 1],
      alive[bearIdx + 1],
    ].filter(Boolean);
    const wolfNeighbor = neighbors.some((p) => isWolf(p.roleKey) && p.roleKey !== "dog_wolf");
    if (wolfNeighbor) {
      io.to(session.roomId).emit(
        "game:announcement",
        session.makeAnnouncement("system", {
          type: "system",
          message: `🐻 L'ours du Montreur d'Ours **grogne** ! Un voisin immédiat est suspect…`,
          data: {},
        })
      );
    }
  }

  // Day debate — 3 minutes (180s)
  await sleep(180_000);

  await runVotePhase(io, session);
}

// ─── Vote Phase ───────────────────────────────────────────────────────────────

async function runVotePhase(io: IO, session: WebGameSession): Promise<void> {
  session.phase = "vote";
  session.votes.clear();
  emitRoomState(io, session);

  io.to(session.roomId).emit("game:vote_phase");

  const voteMsg = session.makeAnnouncement("phase_change", {
    type: "phase_change",
    message: `🗳️ Vote ! Choisissez qui éliminer.`,
    data: {},
  });
  io.to(session.roomId).emit("game:announcement", voteMsg);

  // 60s to vote
  await sleep(60_000);

  const eliminated = session.resolveVotes();

  if (!eliminated) {
    io.to(session.roomId).emit(
      "game:announcement",
      session.makeAnnouncement("vote_result", {
        type: "vote_result",
        message: `🤷 Aucun accord. Personne n'est éliminé aujourd'hui.`,
        data: {},
      })
    );
  } else {
    // Devoted servant?
    const servant = session.getPlayerByRole("devoted_servant");
    if (servant && servant.isAlive && session.servantAvailable) {
      session.servantVictimId = eliminated;
      io.to(servant.id).emit("game:your_turn", "necromancer" as NightSubPhase, 15);
      await sleep(15_000);
    }

    const actualEliminated = session.servantVictimId
      ? eliminated // servant chose not to intervene or didn't respond
      : eliminated;

    const target = session.players.get(actualEliminated);
    if (target) {
      // Idiot check
      if (target.roleKey === "idiot" && !target.idiotRevealed) {
        target.idiotRevealed = true;
        io.to(session.roomId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `🤪 **${target.username}** est l'Idiot du Village ! Il est grâcié mais perd son droit de vote.`,
            data: { playerId: target.id },
          })
        );
      } else {
        const anns = session.kill(actualEliminated);
        for (const ann of anns) io.to(session.roomId).emit("game:announcement", ann);

        if (target.roleKey === "hunter") {
          await runHunterShoot(io, session, actualEliminated);
        }
      }
    }
  }

  session.servantVictimId = null;
  emitRoomState(io, session);

  const win = session.checkWinCondition();
  if (win) {
    await endGame(io, session, win.winner, win.winnerIds);
    return;
  }

  // Angel check (round 1)
  const angel = session.getPlayerByRole("angel");
  if (angel && !angel.isAlive && session.round === 1) {
    await endGame(io, session, "solo", [angel.id]);
    return;
  }

  // Next night
  session.phase = "night";
  await runNightPhase(io, session);
}

// ─── Hunter Shoot ─────────────────────────────────────────────────────────────

async function runHunterShoot(
  io: IO,
  session: WebGameSession,
  hunterId: string
): Promise<void> {
  const hunter = session.players.get(hunterId);
  if (!hunter) return;

  io.to(hunterId).emit("game:your_turn", "necromancer" as NightSubPhase, 30);

  io.to(session.roomId).emit(
    "game:announcement",
    session.makeAnnouncement("system", {
      type: "system",
      message: `🏹 **${hunter.username}** (Chasseur) peut tirer sur un joueur avant de mourir !`,
      data: { hunterId },
    })
  );

  await sleep(30_000);
}

// ─── Game Over ────────────────────────────────────────────────────────────────

async function endGame(
  io: IO,
  session: WebGameSession,
  winner: Camp,
  winnerIds: string[]
): Promise<void> {
  session.phase = "finished";

  const campName =
    winner === "village"
      ? "🏡 Le Village"
      : winner === "wolves"
      ? "🐺 Les Loups-Garous"
      : "🌟 Un joueur solo";

  const winMsg = session.makeAnnouncement("game_over", {
    type: "game_over",
    message: `🎉 **${campName} remporte la partie !**`,
    data: { winner, winnerIds },
  });

  io.to(session.roomId).emit("game:announcement", winMsg);
  io.to(session.roomId).emit("game:over", winner, winnerIds);

  // Reveal all roles
  emitRoomState(io, session);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function emitRoomState(io: IO, session: WebGameSession): void {
  const entry = getRoom(session.roomId);
  if (!entry) return;
  const state = toRoomState(entry);
  io.to(session.roomId).emit("room:state", state);
}

export function processVote(
  io: IO,
  session: WebGameSession,
  voterId: string,
  targetId: string
): void {
  if (!session.players.get(voterId)?.isAlive) return;
  if (!session.players.get(targetId)?.isAlive) return;
  session.votes.set(voterId, targetId);
  io.to(session.roomId).emit("game:vote_update", Object.fromEntries(session.votes));
}
