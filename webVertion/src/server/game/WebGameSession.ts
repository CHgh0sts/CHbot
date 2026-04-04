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

  constructor(roomId: string, config: CompositionConfig) {
    this.roomId = roomId;
    this.config = config;
  }

  // ─── Role Assignment ────────────────────────────────────────────────────────

  assignRoles(): void {
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

    // Hackeur target — mask role
    const isHackTarget = player.id === this.hackeurTargetId && !this.hackeurHasStolen;
    if (isHackTarget) {
      this.stealHackTarget(playerId);
    }

    player.isAlive = false;

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
            // Elder check
            if (target.roleKey === "elder" && !target.elderHit) {
              target.elderHit = true;
              this.announcements.push(this.makeAnnouncement("system", {
                type: "system",
                message: `👴 L'Ancien a résisté à l'attaque des loups !`,
                data: {},
              }));
            } else {
              killed.push(wolfTarget);
            }
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

    // Reset night state
    this.nightHeal = null;
    this.infectThisNight = false;
    this.infectVictimId = null;
    this.ravenTarget = null;
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
