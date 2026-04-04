import type { Client } from 'discord.js';
import { Role, type GamePhase, type NightSubPhase, type PlayerState } from '../types';
import {
  buildRoles,
  dealRolesToPlayers,
  defaultCompositionConfig,
  roleLabelFr,
  type CompositionConfig,
} from './composition';

export class GameSession {
  /** ID du salon **Scène** (annonces publiques + chat vocal). */
  readonly textChannelId: string;
  /** Salon texte masqué : parent des **fils privés** (obligatoire côté API Discord). */
  readonly threadParentChannelId: string;
  readonly guildId: string;
  /** Catégorie du salon de partie (celle où `/lg-init` a été lancé), ou `null` */
  readonly parentCategoryId: string | null;
  readonly hostId: string;

  /** Réglages de composition (modifiables en lobby via `/lg-config`) */
  compositionConfig: CompositionConfig = defaultCompositionConfig();

  /** Code 5 car. si la partie a été créée avec `/lg-init preset:` (site), sinon `null`. */
  presetPublicCode: string | null = null;

  voiceChannelId: string | null = null;

  /** Message d’embed du lobby (mis à jour à chaque join/leave) */
  lobbyMessageId: string | null = null;

  /** userId → id du fil privé persistant pour ce joueur */
  secretThreads = new Map<string, string>();

  /** userId → dernier message « Ton rôle » dans le fil privé (remplacé après échange Voleur, etc.) */
  privateRoleCardMessageId = new Map<string, string>();

  /** Fil privé partagé par les loups pour les votes de nuit */
  wolfPackThreadId: string | null = null;

  /** Fil privé partagé par les amoureux (après le Cupidon) */
  loversThreadId: string | null = null;

  /**
   * Joueurs liés par le Cupidon (2 = couple, 3 = ménage à trois).
   * Si l’un meurt, les autres vivants du groupe meurent de chagrin.
   */
  loversGroup: string[] | null = null;

  /** Cible inspectée cette nuit par la Voyante bavarde (message d’ambiance à l’aube si encore vivante). */
  gossipSeerNightTargetId: string | null = null;

  /** Phase loups : vote loup → id cible (non-loup vivant) */
  wolfVotesByWolf = new Map<string, string>();
  /** Message du tableau de votes (fil Meute), mis à jour à chaque /lg-vote */
  wolfVoteBoardMessageId: string | null = null;
  /** Horodatage fin de phase loups (affichage décompte) */
  wolfVoteDeadlineAt = 0;

  phase: GamePhase = 'lobby';
  lobbyPlayers = new Set<string>();
  players = new Map<string, PlayerState>();

  /**
   * Derniers rôles connus par joueur (typiquement la partie précédente, ex. après « Rejouer »)
   * pour éviter de redistribuer trop souvent le même rôle aux mêmes personnes.
   */
  lastGameRoleByUserId: Map<string, Role> | null = null;

  nightNumber = 0;
  nightSubPhase: NightSubPhase = 'none';

  witchLifePotion = true;
  witchDeathPotion = true;

  /** Cible désignée par les loups (avant sorcière) */
  wolfTargetId: string | null = null;

  /** Victimes de la nuit à annoncer au jour (plusieurs si sorcière tue aussi) */
  pendingNightDeaths: string[] = [];

  /** `true` après la nuit 1 si le Cupidon a fini (ou s’il n’y en a pas / timeout) */
  cupidNightDone = false;

  /** `true` après la nuit 1 si le Voleur a fini (échange ou timeout / absent) */
  thiefNightDone = false;

  /**
   * Joueur désigné cette nuit par le Corbeau (reçoit +2 votes au prochain vote du village).
   * Remis à `null` après le vote du jour.
   */
  ravenTargetId: string | null = null;

  /**
   * Dernière cible **réellement protégée** par le Garde (pour interdire de la reprendre la nuit suivante).
   * Inchangé si le garde n’a pas joué (timeout).
   */
  guardLastProtectedId: string | null = null;

  /** Protégé **cette** nuit (null jusqu’au choix du garde ou fin de phase). */
  guardProtectedUserId: string | null = null;

  /**
   * Nombre de **votes du village** déjà résolus (0 = prochain vote = premier du jour).
   * Sert au pouvoir **Ange** (1er vote uniquement).
   */
  dayVoteCount = 0;

  constructor(
    textChannelId: string,
    threadParentChannelId: string,
    guildId: string,
    parentCategoryId: string | null,
    hostId: string
  ) {
    this.textChannelId = textChannelId;
    this.threadParentChannelId = threadParentChannelId;
    this.guildId = guildId;
    this.parentCategoryId = parentCategoryId;
    this.hostId = hostId;
  }

  get channelKey(): string {
    return this.textChannelId;
  }

  alivePlayers(): PlayerState[] {
    return [...this.players.values()].filter((p) => p.alive);
  }

  aliveIds(): string[] {
    return this.alivePlayers().map((p) => p.userId);
  }

  wolfIds(): string[] {
    return this.alivePlayers()
      .filter((p) => p.role === Role.Werewolf)
      .map((p) => p.userId);
  }

  seerId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Seer && x.alive
    );
    return p?.userId;
  }

  witchId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Witch && x.alive
    );
    return p?.userId;
  }

  hunterId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Hunter && x.alive
    );
    return p?.userId;
  }

  cupidId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Cupid && x.alive
    );
    return p?.userId;
  }

  guardId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Guard && x.alive
    );
    return p?.userId;
  }

  thiefId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Thief && x.alive
    );
    return p?.userId;
  }

  angelId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Angel && x.alive
    );
    return p?.userId;
  }

  littleGirlId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.LittleGirl && x.alive
    );
    return p?.userId;
  }

  ravenId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Raven && x.alive
    );
    return p?.userId;
  }

  redRidingHoodId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.RedRidingHood && x.alive
    );
    return p?.userId;
  }

  getPlayer(userId: string): PlayerState | undefined {
    return this.players.get(userId);
  }

  kill(userId: string): void {
    const p = this.players.get(userId);
    if (p) p.alive = false;
  }

  countAliveWolves(): number {
    return this.alivePlayers().filter((p) => p.role === Role.Werewolf).length;
  }

  countAliveNonWolves(): number {
    return this.alivePlayers().filter((p) => p.role !== Role.Werewolf).length;
  }

  /**
   * Les **Amoureux** gagnent s’ils sont **seuls** derniers survivants du lien
   * (couple ou ménage à trois). Sinon règle loups / village.
   */
  checkVictory(): 'wolves' | 'village' | 'lovers' | null {
    const alive = this.alivePlayers();
    const aliveIds = new Set(alive.map((p) => p.userId));

    if (this.loversGroup && this.loversGroup.length >= 2) {
      const lg = this.loversGroup;
      const loversAlive = lg.filter((id) => aliveIds.has(id));
      if (
        loversAlive.length === lg.length &&
        alive.length === lg.length
      ) {
        return 'lovers';
      }
    }

    if (alive.length === 2) {
      const a = alive[0]!;
      const b = alive[1]!;
      if (
        a.loverUserId === b.userId &&
        b.loverUserId === a.userId
      ) {
        return 'lovers';
      }
    }
    const w = this.countAliveWolves();
    const v = this.countAliveNonWolves();
    if (w === 0) return 'village';
    if (w >= v && w > 0) return 'wolves';
    return null;
  }

  assignRolesFromLobby(): void {
    const sortedIds = [...this.lobbyPlayers].sort((a, b) => {
      try {
        const da = BigInt(a);
        const db = BigInt(b);
        return da < db ? -1 : da > db ? 1 : 0;
      } catch {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      }
    });
    const roles = buildRoles(sortedIds.length, this.compositionConfig);
    const dealt = dealRolesToPlayers(
      sortedIds,
      roles,
      this.lastGameRoleByUserId,
      384
    );

    this.players.clear();
    this.privateRoleCardMessageId.clear();
    for (let i = 0; i < sortedIds.length; i++) {
      const userId = sortedIds[i]!;
      const role = dealt[i]!;
      const name = `Joueur`;
      this.players.set(userId, {
        userId,
        displayName: name,
        role,
        alive: true,
        loverUserId: null,
      });
    }

    this.lastGameRoleByUserId = new Map(
      sortedIds.map((id, i) => [id, dealt[i]!])
    );

    this.loversGroup = null;
    this.gossipSeerNightTargetId = null;
    this.loversThreadId = null;
    this.witchLifePotion = true;
    this.witchDeathPotion = true;
    this.cupidNightDone = false;
    this.thiefNightDone = false;
    this.guardLastProtectedId = null;
    this.guardProtectedUserId = null;
    this.dayVoteCount = 0;
    this.loversThreadId = null;
  }

  async hydrateDisplayNames(client: Client): Promise<void> {
    for (const uid of this.players.keys()) {
      try {
        const u = await client.users.fetch(uid);
        const p = this.players.get(uid);
        if (p) {
          const name = u.displayName ?? u.username;
          p.displayName = name.slice(0, 32);
        }
      } catch {
        /* ignore */
      }
    }
  }

  labelMap(): Map<string, string> {
    const m = new Map<string, string>();
    for (const p of this.players.values()) {
      m.set(p.userId, p.displayName);
    }
    return m;
  }

  resetNightScratch(): void {
    this.wolfTargetId = null;
    this.pendingNightDeaths = [];
    this.nightSubPhase = 'none';
    this.guardProtectedUserId = null;
    this.gossipSeerNightTargetId = null;
    this.ravenTargetId = null;
  }

  roleLabel(role: Role): string {
    return roleLabelFr(role);
  }
}
