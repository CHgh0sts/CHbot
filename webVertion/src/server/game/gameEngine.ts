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

  announceFamilyRoles(io, session);

  await runNightPhase(io, session);
}

function announceFamilyRoles(io: IO, session: WebGameSession): void {
  const sisters = session.getPlayersByRole("two_sisters").filter((p) => p.isAlive);
  if (sisters.length >= 2) {
    const list = sisters.map((s) => s.username).join(", ");
    for (const s of sisters) {
      io.to(s.id).emit(
        "game:announcement",
        session.makeAnnouncement("system", {
          type: "system",
          message: `👯 Vos sœurs dans la partie : **${list}**. Vous gagnez avec le village.`,
          data: {},
        })
      );
    }
  }
  const bros = session.getPlayersByRole("three_brothers").filter((p) => p.isAlive);
  if (bros.length >= 2) {
    const list = bros.map((b) => b.username).join(", ");
    for (const b of bros) {
      io.to(b.id).emit(
        "game:announcement",
        session.makeAnnouncement("system", {
          type: "system",
          message: `👨‍👦‍👦 Vos frères dans la partie : **${list}**. Vous gagnez avec le village.`,
          data: {},
        })
      );
    }
  }
  if (session.config.includeSectarian) {
    const sect = session.getPlayerByRole("sectarian");
    if (sect) {
      const g = session.sectPlayerGroup.get(sect.id) ?? "?";
      io.to(sect.id).emit(
        "game:announcement",
        session.makeAnnouncement("system", {
          type: "system",
          message: `☠️ Vous êtes le Sectaire abominable. Votre groupe secret est **${g}**. Inspectez chaque nuit pour repérer les autres.`,
          data: {},
        })
      );
    }
  }
}

// ─── Night Phase ──────────────────────────────────────────────────────────────

async function runNightPhase(io: IO, session: WebGameSession): Promise<void> {
  session.nightActions.clear();
  session.wolvesVotes.clear();
  session.nightHeal = null;

  const subPhases = buildNightOrderProper(session);

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

function buildNightOrderProper(session: WebGameSession): NightSubPhase[] {
  const order: NightSubPhase[] = [];
  const c = session.config;
  const r1 = session.round === 1;

  if (r1 && c.includeCupid) order.push("cupid");
  if (r1 && c.includeHackeur) order.push("hackeur");
  if (r1 && c.includeDogWolf) order.push("hackeur");
  if (r1 && c.includeThief) order.push("thief");
  if (r1 && c.includeWildChild) order.push("wild_child");

  order.push("werewolves");
  if (c.includeInfectedWolf) order.push("infected");
  if (c.includeBigBadWolf && !session.wolfEverDied) order.push("big_bad_wolf");
  if (c.includeGuard) order.push("guard");
  if (c.includeSeer) order.push("seer");
  if (c.includeDoctor) order.push("doctor");
  if (c.includeWitch) order.push("witch");
  if (c.includeFox) order.push("fox");
  if (c.includeNecromancer) order.push("necromancer");
  if (c.includeRaven) order.push("raven");
  if (c.includeWhiteWolf && session.round % 2 === 0) order.push("white_wolf");
  if (c.includeActor) order.push("actor");
  if (c.includeBearTamer) order.push("bear");
  if (c.includePiedPiper) order.push("pied_piper");
  if (c.includePyromaniac) order.push("pyromaniac");
  if (c.includeSectarian) order.push("sectarian");

  return [...new Set(order)];
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
    case "hackeur": {
      const ids: string[] = [];
      if (session.round === 1 && session.config.includeDogWolf) {
        ids.push(
          ...alive
            .filter((p) => p.roleKey === "dog_wolf" && !p.dogWolfChose)
            .map((p) => p.id)
        );
      }
      ids.push(
        ...alive
          .filter((p) => p.roleKey === "hackeur" && !session.hackeurTargetId)
          .map((p) => p.id)
      );
      return ids;
    }
    case "thief":
      return alive
        .filter((p) => p.roleKey === "thief" && !session.thiefNightDone)
        .map((p) => p.id);
    case "wild_child":
      return alive
        .filter((p) => p.roleKey === "wild_child" && !session.wildChildModelId)
        .map((p) => p.id);
    case "big_bad_wolf":
      return alive
        .filter(
          (p) =>
            p.roleKey === "big_bad_wolf" &&
            p.isAlive &&
            !session.wolfEverDied
        )
        .map((p) => p.id);
    case "pied_piper":
      return alive.filter((p) => p.roleKey === "pied_piper").map((p) => p.id);
    case "pyromaniac":
      return alive.filter((p) => p.roleKey === "pyromaniac").map((p) => p.id);
    case "sectarian":
      return alive.filter((p) => p.roleKey === "sectarian").map((p) => p.id);
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
      if (
        player.roleKey === "hackeur" &&
        action.targetId &&
        !session.hackeurTargetId
      ) {
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
      if (
        player.roleKey === "dog_wolf" &&
        session.round === 1 &&
        !player.dogWolfChose &&
        (action.choice === "wolves" || action.choice === "village")
      ) {
        player.dogWolfChose = true;
        const side = action.choice === "wolves" ? "wolves" : "village";
        if (side === "wolves") {
          player.camp = "wolves";
        } else {
          player.roleKey = "villager";
          player.camp = "village";
        }
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message:
              side === "wolves"
                ? `🐕 Vous rejoignez secrètement la **meute**.`
                : `🐕 Vous restez du côté du **village**.`,
            data: {},
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

    case "thief":
      if (action.targetId && !session.thiefNightDone && player.roleKey === "thief") {
        const tgt = session.players.get(action.targetId);
        if (tgt?.isAlive) {
          const stolen = tgt.roleKey;
          tgt.roleKey = "villager";
          tgt.camp = "village";
          player.roleKey = stolen;
          player.camp = ROLES[stolen].camp;
          session.thiefNightDone = true;
          io.to(playerId).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `🥷 Vous prenez le rôle **${ROLES[stolen].name}**.`,
              data: {},
            })
          );
          io.to(action.targetId).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `🥷 Le Voleur a échangé avec vous : vous êtes maintenant **Villageois**.`,
              data: {},
            })
          );
        }
      }
      break;

    case "wild_child":
      if (
        action.targetId &&
        !session.wildChildModelId &&
        player.roleKey === "wild_child"
      ) {
        session.wildChildModelId = action.targetId;
        const t = session.players.get(action.targetId);
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `🌿 Votre modèle est **${t?.username ?? "?"}**. S'il meurt, vous deviendrez Loup-Garou.`,
            data: {},
          })
        );
      }
      break;

    case "big_bad_wolf":
      if (action.targetId && player.roleKey === "big_bad_wolf") {
        session.bbwNightTargetId = action.targetId;
        const t = session.players.get(action.targetId);
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `🐺 Seconde victime choisie : **${t?.username ?? "?"}**.`,
            data: {},
          })
        );
      }
      break;

    case "pied_piper":
      if (action.targetIds && player.roleKey === "pied_piper") {
        for (const tid of action.targetIds.slice(0, 2)) {
          if (tid !== playerId) session.enchantedPlayerIds.add(tid);
        }
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("system", {
            type: "system",
            message: `🎵 Joueur(s) ensorcelé(s) cette nuit.`,
            data: {},
          })
        );
      }
      break;

    case "pyromaniac":
      if (player.roleKey === "pyromaniac") {
        if (action.choice === "ignite") {
          session.pyromaniacIgnited = true;
          io.to(playerId).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `🔥 Vous déclenchez l'incendie !`,
              data: {},
            })
          );
        } else if (action.targetId) {
          session.pyroDousedIds.add(action.targetId);
          io.to(playerId).emit(
            "game:announcement",
            session.makeAnnouncement("system", {
              type: "system",
              message: `🔥 Cible arrosée d'essence.`,
              data: {},
            })
          );
        }
      }
      break;

    case "sectarian":
      if (action.targetId && player.roleKey === "sectarian") {
        const tg = session.sectPlayerGroup.get(action.targetId);
        const me = session.sectPlayerGroup.get(playerId);
        const t = session.players.get(action.targetId);
        const same = me && tg && me === tg;
        io.to(playerId).emit(
          "game:announcement",
          session.makeAnnouncement("role_reveal", {
            type: "role_reveal",
            message: `☠️ **${t?.username ?? "?"}** — groupe **${tg ?? "?"}** (${same ? "même groupe que vous" : "autre groupe"}).`,
            data: {},
          })
        );
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

  if (session.rustySwordNextDawnWolfId) {
    const wid = session.rustySwordNextDawnWolfId;
    session.rustySwordNextDawnWolfId = null;
    const infected = session.players.get(wid);
    if (infected?.isAlive) {
      io.to(session.roomId).emit(
        "game:announcement",
        session.makeAnnouncement("system", {
          type: "system",
          message: `⚔️ L'épée rouillée du Chevalier infecte **${infected.username}** !`,
          data: {},
        })
      );
      const anns = session.kill(wid);
      for (const ann of anns) io.to(session.roomId).emit("game:announcement", ann);
    }
  }

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
