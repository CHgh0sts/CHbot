import { randomUUID } from "crypto";
import type {
  RoleKey,
  Camp,
  GamePhase,
  NightSubPhase,
  PublicPlayer,
  PrivatePlayer,
  CompositionConfig,
  GameAnnouncement,
  NightActionRequest,
} from "@/types/game";
import { isWolf, ROLES } from "@/lib/game/roles";

// ─── Internal Player ──────────────────────────────────────────────────────────

export interface InternalPlayer {
  id: string;
  userId: string | null;
  username: string;
  avatar: string | null;
  isAlive: boolean;
  isHost: boolean;
  isConnected: boolean;
  roleKey: RoleKey;
  camp: Camp;
  // Love
  loverPartnerId: string | null;
  // Protection
  isProtected: boolean;
  lastProtectedId: string | null; // guard: can't protect same player twice
  // Elder
  elderHit: boolean;
  // Idiot
  idiotRevealed: boolean;
  // Hackeur
  isHackTarget: boolean;
  // Actor cards
  actorCards: RoleKey[];
  // Dog-wolf
  dogWolfChose: boolean;
  // White wolf
  whitewolfKillUsed: boolean;
}

// ─── WebGameSession ───────────────────────────────────────────────────────────

export class WebGameSession {
  readonly roomId: string;
  players: Map<string, InternalPlayer> = new Map();
  phase: GamePhase = "lobby";
  round = 0;
  config: CompositionConfig;

  // Night state
  currentNightPhase: NightSubPhase | null = null;
  nightActions: Map<string, NightActionRequest> = new Map();
  wolvesVotes: Map<string, string> = new Map(); // voterId -> targetId

  // Day/vote state
  votes: Map<string, string> = new Map();
  ravenTarget: string | null = null;
  ravenUsed = false;

  // Witch
  witchHealUsed = false;
  witchKillUsed = false;

  // Cupid
  cupidDone = false;

  // Hackeur
  hackeurTargetId: string | null = null;
  hackeurHasStolen = false;

  // Infect père
  infectUsed = false;
  infectThisNight = false;
  infectVictimId: string | null = null;

  // Dictateur
  dictateurUsed = false;
  dictateurForcedId: string | null = null;

  // Devoted servant
  servantAvailable = true;
  servantVictimId: string | null = null;

  // Mayor (dictateur)
  mayorId: string | null = null;

  // Announcements queue
  announcements: GameAnnouncement[] = [];

  // Night kills to resolve at end of night
  nightKills: Set<string> = new Set();
  nightHeal: string | null = null;

  // Bot-aligned rôles additionnels
  wildChildModelId: string | null = null;
  thiefNightDone = false;
  bbwNightTargetId: string | null = null;
  /** Vrai dès qu’un joueur avec rôle loup est mort (GML perd son bonus). */
  wolfEverDied = false;
  /** Loup à tuer à l’aube après dévoration du chevalier (épée rouillée). */
  rustySwordNextDawnWolfId: string | null = null;
  enchantedPlayerIds = new Set<string>();
  pyroDousedIds = new Set<string>();
  pyromaniacIgnited = false;
  /** Groupes A/B pour le Sectaire (si partie avec Sectaire). */
  sectPlayerGroup = new Map<string, "A" | "B">();

  constructor(roomId: string, config: CompositionConfig) {
    this.roomId = roomId;
    this.config = config;
  }

  // ─── Role Assignment ────────────────────────────────────────────────────────

  assignRoles(): void {
    this.wildChildModelId = null;
    this.thiefNightDone = false;
    this.bbwNightTargetId = null;
    this.wolfEverDied = false;
    this.rustySwordNextDawnWolfId = null;
    this.enchantedPlayerIds.clear();
    this.pyroDousedIds.clear();
    this.pyromaniacIgnited = false;
    this.sectPlayerGroup.clear();

    const roles = this.buildRolePool();
    const playerIds = [...this.players.keys()];

    if (roles.length !== playerIds.length) {
      throw new Error(
        `Role pool size (${roles.length}) !== player count (${playerIds.length})`
      );
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    let i = 0;
    for (const [, player] of this.players) {
      const role = roles[i++];
      player.roleKey = role;
      player.camp = ROLES[role].camp;

      // Actor gets 3 random village cards
      if (role === "actor") {
        player.actorCards = this.drawActorCards();
      }
    }

    // Find hackeur target (already set to null)
    this.hackeurTargetId = null;
    this.hackeurHasStolen = false;

    // Mark hackeur target player
    const hackeurPlayer = this.getPlayerByRole("hackeur");
    if (hackeurPlayer) {
      // Will be set during night 1
    }

    if (this.config.includeSectarian) {
      for (const [, p] of this.players) {
        this.sectPlayerGroup.set(p.id, Math.random() < 0.5 ? "A" : "B");
      }
    }
  }

  private buildRolePool(): RoleKey[] {
    const c = this.config;
    const pool: RoleKey[] = [];

    // Wolves
    for (let i = 0; i < c.werewolfCount; i++) {
      pool.push("werewolf");
    }

    // Optional special roles
    if (c.includeInfectedWolf) pool.push("infected_wolf");
    if (c.includeWhiteWolf) pool.push("white_wolf");
    if (c.includeDogWolf) pool.push("dog_wolf");
    if (c.includeSeer) pool.push("seer");
    if (c.includeWitch) pool.push("witch");
    if (c.includeHunter) pool.push("hunter");
    if (c.includeCupid) pool.push("cupid");
    if (c.includeLittleGirl) pool.push("little_girl");
    if (c.includeElder) pool.push("elder");
    if (c.includeScapegoat) pool.push("scapegoat");
    if (c.includeIdiot) pool.push("idiot");
    if (c.includeDoctor) pool.push("doctor");
    if (c.includeGuard) pool.push("guard");
    if (c.includeNecromancer) pool.push("necromancer");
    if (c.includeDevotedServant) pool.push("devoted_servant");
    if (c.includeAngel) pool.push("angel");
    if (c.includeBearTamer) pool.push("bear_tamer");
    if (c.includeFox) pool.push("fox");
    if (c.includeRaven) pool.push("raven");
    if (c.includeActor) pool.push("actor");
    if (c.includeDictateur) pool.push("dictateur");
    if (c.includeHackeur) pool.push("hackeur");
    if (c.includeThief) pool.push("thief");
    if (c.includeRedRidingHood) pool.push("red_riding_hood");
    if (c.includeBigBadWolf) pool.push("big_bad_wolf");
    if (c.includePiedPiper) pool.push("pied_piper");
    if (c.includeRustySwordKnight) pool.push("rusty_sword_knight");
    if (c.includeWildChild) pool.push("wild_child");
    if (c.includePyromaniac) pool.push("pyromaniac");
    if (c.includeTwoSisters) {
      pool.push("two_sisters");
      pool.push("two_sisters");
    }
    if (c.includeThreeBrothers) {
      pool.push("three_brothers");
      pool.push("three_brothers");
      pool.push("three_brothers");
    }
    if (c.includeSectarian) pool.push("sectarian");

    // Fill with villagers
    const remaining = c.playerCount - pool.length;
    for (let i = 0; i < remaining; i++) {
      pool.push("villager");
    }

    return pool;
  }

  private drawActorCards(): RoleKey[] {
    const villageRoles: RoleKey[] = [
      "seer",
      "witch",
      "hunter",
      "guard",
      "doctor",
      "fox",
      "raven",
      "rusty_sword_knight",
      "necromancer",
    ];
    const shuffled = [...villageRoles].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  // ─── Player Queries ─────────────────────────────────────────────────────────

  getPlayer(id: string): InternalPlayer | undefined {
    return this.players.get(id);
  }

  getAlivePlayers(): InternalPlayer[] {
    return [...this.players.values()].filter((p) => p.isAlive);
  }

  getAliveWolves(): InternalPlayer[] {
    return this.getAlivePlayers().filter((p) => isWolf(p.roleKey));
  }

  getAliveVillagers(): InternalPlayer[] {
    return this.getAlivePlayers().filter(
      (p) => !isWolf(p.roleKey) && p.camp !== "solo"
    );
  }

  getPlayerByRole(role: RoleKey): InternalPlayer | undefined {
    return [...this.players.values()].find((p) => p.roleKey === role);
  }

  getPlayersByRole(role: RoleKey): InternalPlayer[] {
    return [...this.players.values()].filter((p) => p.roleKey === role);
  }

  // ─── Player View ────────────────────────────────────────────────────────────

  toPublicPlayer(p: InternalPlayer): PublicPlayer {
    return {
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      isAlive: p.isAlive,
      isHost: p.isHost,
      isConnected: p.isConnected,
      roleKey: p.isAlive ? undefined : p.roleKey,
    };
  }

  toPrivatePlayer(p: InternalPlayer): PrivatePlayer {
    return {
      ...this.toPublicPlayer(p),
      roleKey: p.roleKey,
      camp: p.camp,
      loverPartnerId: p.loverPartnerId,
      isProtected: p.isProtected,
    };
  }

  getPublicState(): PublicPlayer[] {
    return [...this.players.values()].map((p) => this.toPublicPlayer(p));
  }

  // ─── Death ──────────────────────────────────────────────────────────────────

  kill(playerId: string): GameAnnouncement[] {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return [];

    const newAnnouncements: GameAnnouncement[] = [];
    const wasWolfRole = isWolf(player.roleKey);

    // Hackeur target — mask role
    const isHackTarget = player.id === this.hackeurTargetId && !this.hackeurHasStolen;
    if (isHackTarget) {
      this.stealHackTarget(playerId);
    }

    player.isAlive = false;

    if (wasWolfRole) this.wolfEverDied = true;

    if (this.wildChildModelId === playerId) {
      const wc = this.getPlayerByRole("wild_child");
      if (wc?.isAlive) {
        wc.roleKey = "werewolf";
        wc.camp = "wolves";
        newAnnouncements.push(
          this.makeAnnouncement("system", {
            type: "system",
            message: `🌿 **${wc.username}** (Enfant sauvage) perd son modèle et **rejoint la meute** !`,
            data: { playerId: wc.id },
          })
        );
      }
    }

    // Announce death
    newAnnouncements.push(this.makeAnnouncement("death", {
      type: "death",
      message: isHackTarget
        ? `☠️ **${player.username}** est mort... mais son rôle a été **piraté** par le Hackeur !`
        : `☠️ **${player.username}** (${ROLES[player.roleKey].name}) est mort.`,
      data: { playerId, roleKey: isHackTarget ? null : player.roleKey },
    }));

    // Lover dies too
    if (player.loverPartnerId) {
      const lover = this.players.get(player.loverPartnerId);
      if (lover && lover.isAlive) {
        lover.isAlive = false;
        newAnnouncements.push(this.makeAnnouncement("death", {
          type: "death",
          message: `💔 **${lover.username}** (${ROLES[lover.roleKey].name}) meurt de chagrin d'avoir perdu son amour.`,
          data: { playerId: lover.id, roleKey: lover.roleKey },
        }));
      }
    }

    this.announcements.push(...newAnnouncements);
    return newAnnouncements;
  }

  private stealHackTarget(targetId: string): void {
    const target = this.players.get(targetId);
    const hackeur = this.getPlayerByRole("hackeur");
    if (!target || !hackeur) return;
    if (this.hackeurHasStolen) return;

    const stolenRole = target.roleKey;
    hackeur.roleKey = stolenRole;
    hackeur.camp = ROLES[stolenRole].camp;
    this.hackeurHasStolen = true;
  }

  // ─── Win Condition ─────────────────────────────────────────────────────────

  checkWinCondition(): { winner: Camp; winnerIds: string[] } | null {
    const alive = this.getAlivePlayers();
    const aliveWolves = alive.filter((p) => isWolf(p.roleKey));
    const aliveVillagers = alive.filter(
      (p) => !isWolf(p.roleKey) && p.camp !== "solo"
    );
    const aliveWhiteWolf = alive.find((p) => p.roleKey === "white_wolf");
    const piper = alive.find((p) => p.roleKey === "pied_piper");
    if (
      piper &&
      alive.length > 1 &&
      alive.filter((p) => p.id !== piper.id).every((p) => this.enchantedPlayerIds.has(p.id))
    ) {
      return { winner: "solo", winnerIds: [piper.id] };
    }

    const pyro = alive.find((p) => p.roleKey === "pyromaniac");
    if (pyro && alive.length === 1) {
      return { winner: "solo", winnerIds: [pyro.id] };
    }

    const sect = alive.find((p) => p.roleKey === "sectarian");
    if (sect && this.sectPlayerGroup.size > 0) {
      const g = this.sectPlayerGroup.get(sect.id);
      if (
        g &&
        alive.every((p) => this.sectPlayerGroup.get(p.id) === g)
      ) {
        return { winner: "solo", winnerIds: [sect.id] };
      }
    }

    // White wolf wins alone
    if (aliveWhiteWolf && alive.length === 1) {
      return {
        winner: "solo",
        winnerIds: [aliveWhiteWolf.id],
      };
    }

    // Lovers win together
    const lovers = alive.filter((p) => p.loverPartnerId);
    if (lovers.length === 2 && alive.length === 2) {
      return {
        winner: lovers[0].camp,
        winnerIds: lovers.map((p) => p.id),
      };
    }

    // Wolves win if >= villagers
    if (aliveWolves.length >= aliveVillagers.length && aliveWolves.length > 0) {
      return {
        winner: "wolves",
        winnerIds: [...this.players.values()]
          .filter((p) => isWolf(p.roleKey))
          .map((p) => p.id),
      };
    }

    // Village wins if no wolves
    if (aliveWolves.length === 0) {
      return {
        winner: "village",
        winnerIds: aliveVillagers.map((p) => p.id),
      };
    }

    return null;
  }

  // ─── Vote Resolution ────────────────────────────────────────────────────────

  resolveVotes(): string | null {
    const tally = new Map<string, number>();

    for (const [voterId, targetId] of this.votes) {
      const voter = this.players.get(voterId);
      if (!voter || !voter.isAlive) continue;

      const weight = voterId === this.mayorId ? 2 : 1;
      tally.set(targetId, (tally.get(targetId) ?? 0) + weight);
    }

    // Raven bonus
    if (this.ravenTarget) {
      tally.set(this.ravenTarget, (tally.get(this.ravenTarget) ?? 0) + 2);
    }

    if (tally.size === 0) return null;

    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const maxVotes = sorted[0][1];
    const tied = sorted.filter(([, v]) => v === maxVotes);

    if (tied.length === 1) {
      return tied[0][0];
    }

    // Tie → check scapegoat
    const scapegoat = this.getPlayerByRole("scapegoat");
    if (scapegoat && scapegoat.isAlive) {
      return scapegoat.id;
    }

    return null; // no elimination
  }

  // ─── Night Resolution ───────────────────────────────────────────────────────

  resolveNight(): string[] {
    const killed: string[] = [];

    // Who do wolves want to kill?
    const wolfTarget = this.resolveWolfVotes();

    if (wolfTarget) {
      const target = this.players.get(wolfTarget);
      if (target) {
        // Infect check
        if (this.infectThisNight && this.infectVictimId === wolfTarget) {
          target.roleKey = "werewolf";
          target.camp = "wolves";
          this.infectUsed = true;
          this.announcements.push(this.makeAnnouncement("system", {
            type: "system",
            message: `🧟 **${target.username}** a survécu cette nuit... quelque chose a changé en lui.`,
            data: {},
          }));
        } else if (wolfTarget !== this.nightHeal) {
          // Not healed — apply protection check
          const isProtected = target.isProtected;
          target.isProtected = false;

          if (!isProtected) {
            const hunter = this.getPlayerByRole("hunter");
            if (
              target.roleKey === "red_riding_hood" &&
              hunter &&
              hunter.isAlive
            ) {
              this.announcements.push(this.makeAnnouncement("system", {
                type: "system",
                message: `🧣 Les loups ne peuvent pas dévorer **${target.username}** : le Chasseur veille sur le Chaperon rouge !`,
                data: {},
              }));
            } else if (target.roleKey === "elder" && !target.elderHit) {
              target.elderHit = true;
              this.announcements.push(this.makeAnnouncement("system", {
                type: "system",
                message: `👴 L'Ancien a résisté à l'attaque des loups !`,
                data: {},
              }));
            } else {
              killed.push(wolfTarget);
              if (target.roleKey === "rusty_sword_knight") {
                const wolfVoters = [...this.wolvesVotes.keys()]
                  .filter((id) => {
                    const v = this.players.get(id);
                    return v && isWolf(v.roleKey) && v.roleKey !== "white_wolf";
                  })
                  .sort();
                const infector = this.getPlayerByRole("infected_wolf");
                const bbw = this.getPlayerByRole("big_bad_wolf");
                const candidates = wolfVoters.length
                  ? wolfVoters
                  : [infector?.id, bbw?.id].filter(Boolean) as string[];
                if (candidates[0]) this.rustySwordNextDawnWolfId = candidates[0];
              }
            }
          }
        }
      }
    }

    // Grand méchant loup : seconde victime tant qu’aucun loup n’est mort
    if (
      this.bbwNightTargetId &&
      !this.wolfEverDied &&
      this.getPlayerByRole("big_bad_wolf")?.isAlive
    ) {
      const bbwT = this.players.get(this.bbwNightTargetId);
      if (
        bbwT &&
        bbwT.isAlive &&
        !killed.includes(this.bbwNightTargetId) &&
        this.bbwNightTargetId !== this.nightHeal
      ) {
        if (!bbwT.isProtected) {
          const hunter = this.getPlayerByRole("hunter");
          if (
            bbwT.roleKey === "red_riding_hood" &&
            hunter &&
            hunter.isAlive
          ) {
            this.announcements.push(this.makeAnnouncement("system", {
              type: "system",
              message: `🧣 Le Grand méchant loup ne peut pas atteindre **${bbwT.username}** (protection du Chasseur).`,
              data: {},
            }));
          } else if (bbwT.roleKey === "elder" && !bbwT.elderHit) {
            bbwT.elderHit = true;
            this.announcements.push(this.makeAnnouncement("system", {
              type: "system",
              message: `👴 L'Ancien résiste aussi au Grand méchant loup !`,
              data: {},
            }));
          } else if (!killed.includes(this.bbwNightTargetId)) {
            killed.push(this.bbwNightTargetId);
          }
        }
      }
    }

    // Witch kill
    const witchKillAction = [...this.nightActions.values()].find(
      (a) => a.subPhase === "witch" && a.choice === "kill" && a.targetId
    );
    if (witchKillAction?.targetId && !killed.includes(witchKillAction.targetId)) {
      killed.push(witchKillAction.targetId);
    }

    if (this.pyromaniacIgnited) {
      for (const id of [...this.pyroDousedIds]) {
        const p = this.players.get(id);
        if (p?.isAlive && !killed.includes(id)) killed.push(id);
      }
    }

    // Reset night state
    this.nightHeal = null;
    this.infectThisNight = false;
    this.infectVictimId = null;
    this.ravenTarget = null;
    this.bbwNightTargetId = null;
    this.pyromaniacIgnited = false;
    for (const [, p] of this.players) p.isProtected = false;

    return killed;
  }

  private resolveWolfVotes(): string | null {
    const tally = new Map<string, number>();
    for (const [, targetId] of this.wolvesVotes) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
    if (tally.size === 0) return null;
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  makeAnnouncement(
    type: GameAnnouncement["type"],
    data: Omit<GameAnnouncement, "id" | "timestamp">
  ): GameAnnouncement {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      ...data,
    };
  }

  addPlayer(player: Omit<InternalPlayer, "roleKey" | "camp" | "actorCards">): void {
    this.players.set(player.id, {
      ...player,
      roleKey: "villager",
      camp: "village",
      actorCards: [],
    });
  }
}
