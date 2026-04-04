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

  /** `true` après que l'Idiot du village a utilisé son pouvoir (survie au vote). */
  foolOfVillageUsedPower = false;
  /** `false` quand l'Idiot du village ne peut plus voter (après usage de son pouvoir). */
  foolOfVillageCanVote = true;

  /** `true` après que l'Ancien a survécu à une attaque de loups (pouvoir utilisé). */
  elderSurvivedAttack = false;
  /** `true` si l'Ancien a été éliminé par le vote du village (malédiction active). */
  elderCursed = false;

  /** Joueur désigné comme modèle par l'Enfant Sauvage nuit 1. */
  wildChildModelId: string | null = null;
  /** `true` une fois que l'Enfant Sauvage s'est transformé en loup. */
  wildChildBecameWolf = false;

  /** IDs des joueurs ensorcelés par le Joueur de Flûte. */
  enchantedPlayerIds: Set<string> = new Set();

  /**
   * `true` si le Chevalier à l'épée rouillée a été dévoré par les loups cette nuit.
   * Le 1er loup (alpha) mourra à l'aube suivante.
   */
  rustKillPending = false;

  /** IDs des joueurs interdits de vote au prochain tour (choix du Bouc Émissaire). */
  scapegoatVoteBannedIds: Set<string> = new Set();

  /** `true` si le Renard a perdu son pouvoir (a flair\u00e9 sans trouver de loup). */
  foxLostPower = false;

  /** IDs des joueurs arros\u00e9s par le Pyromane (pr\u00eats \u00e0 \u00eatre incendi\u00e9s). */
  pyromaniacDousedIds: Set<string> = new Set();
  /** `true` une fois que le Pyromane a d\u00e9clench\u00e9 l\u2019incendie. */
  pyromaniacIgnited = false;

  /** IDs des 2 voisins secrets de l\u2019Montreur d'Ours (assign\u00e9s nuit 1). */
  bearTamerNeighborIds: string[] = [];

  /** Fil priv\u00e9 partag\u00e9 par les Deux S\u0153urs. */
  sistersThreadId: string | null = null;
  /** Fil priv\u00e9 partag\u00e9 par les Trois Fr\u00e8res. */
  brothersThreadId: string | null = null;

  /** Fil priv\u00e9 du N\u00e9cromancien (antre des morts — partag\u00e9 avec tous les morts). */
  necromancerThreadId: string | null = null;

  /** Charges restantes du Docteur (3 au d\u00e9part). */
  docteurCharges = 3;

  /** Groupes du Sectaire Abominable : Map<userId, 'A' | 'B'>. Assign\u00e9 nuit 1. */
  sectarianGroups: Map<string, 'A' | 'B'> = new Map();

  /** 	rue une fois que la Servante D\u00e9vou\u00e9e a utilis\u00e9 son pouvoir. */
  devotedServantUsed = false;
  /** 	rue une fois que l\u2019Infect P\u00e8re des Loups a utilis\u00e9 son pouvoir. */
  infectFatherUsed = false;
  /** L\u2019ID du joueur infect\u00e9 ce soir (si Infect P\u00e8re a agi). */
  infectFatherInfectedId: string | null = null;

  /** Camp choisi par le Chien-Loup nuit 1 : true = loups. */
  dogWolfIsWolf = false;
  /** 	rue si le Chien-Loup a d\u00e9j\u00e0 fait son choix. */
  dogWolfChoseSide = false;

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

  isWolfRole(role: Role): boolean {
    if (role === Role.Werewolf || role === Role.BigBadWolf || role === Role.WhiteWerewolf || role === Role.InfectFather) return true;
    if (role === Role.WildChild && this.wildChildBecameWolf) return true;
    if (role === Role.DogWolf && this.dogWolfIsWolf) return true;
    return false;
  }

  wolfIds(): string[] {
    return this.alivePlayers()
      .filter((p) => this.isWolfRole(p.role))
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

  foolOfVillageId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.FoolOfVillage && x.alive
    );
    return p?.userId;
  }

  elderId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Elder && x.alive
    );
    return p?.userId;
  }

  bigBadWolfId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.BigBadWolf && x.alive
    );
    return p?.userId;
  }

  whiteWerewolfId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.WhiteWerewolf && x.alive
    );
    return p?.userId;
  }

  piedPiperId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.PiedPiper && x.alive
    );
    return p?.userId;
  }

  rustySwordKnightId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.RustySwordKnight && x.alive
    );
    return p?.userId;
  }

  scapegoatId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Scapegoat && x.alive
    );
    return p?.userId;
  }

  wildChildId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.WildChild && x.alive
    );
    return p?.userId;
  }

  foxId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Fox && x.alive
    );
    return p?.userId;
  }

  pyromaniacId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.Pyromaniac && x.alive
    );
    return p?.userId;
  }

  bearTamerId(): string | undefined {
    const p = [...this.players.values()].find(
      (x) => x.role === Role.BearTamer && x.alive
    );
    return p?.userId;
  }

  sisterIds(): string[] {
    return [...this.players.values()]
      .filter((x) => x.role === Role.TwoSisters && x.alive)
      .map((x) => x.userId);
  }

  brotherIds(): string[] {
    return [...this.players.values()]
      .filter((x) => x.role === Role.ThreeBrothers && x.alive)
      .map((x) => x.userId);
  }

  docteurId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.Docteur && x.alive)?.userId;
  }

  necromancerId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.Necromancer && x.alive)?.userId;
  }

  sectarianId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.Sectarian && x.alive)?.userId;
  }

  devotedServantId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.DevotedServant && x.alive)?.userId;
  }

  infectFatherId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.InfectFather && x.alive)?.userId;
  }

  dogWolfId(): string | undefined {
    return [...this.players.values()].find((x) => x.role === Role.DogWolf && x.alive)?.userId;
  }

  getPlayer(userId: string): PlayerState | undefined {
    return this.players.get(userId);
  }

  kill(userId: string): void {
    const p = this.players.get(userId);
    if (p) p.alive = false;
  }

  countAliveWolves(): number {
    return this.alivePlayers().filter((p) => this.isWolfRole(p.role)).length;
  }

  countAliveNonWolves(): number {
    return this.alivePlayers().filter((p) => !this.isWolfRole(p.role)).length;
  }

  anyWolfEverDied(): boolean {
    return [...this.players.values()].some(
      (p) => this.isWolfRole(p.role) && !p.alive
    );
  }

  /**
   * Les **Amoureux** gagnent s’ils sont **seuls** derniers survivants du lien
   * (couple ou ménage à trois). Sinon règle loups / village.
   */
  checkVictory(): 'wolves' | 'village' | 'lovers' | 'whitewerewolf' | 'piedpiper' | 'pyromaniac' | 'sectarian' | null {
    const alive = this.alivePlayers();
    const aliveIds = new Set(alive.map((p) => p.userId));

    // Loup-Blanc solo : dernier survivant
    const wwId = this.whiteWerewolfId();
    if (wwId && alive.length === 1 && alive[0]!.userId === wwId) return 'whitewerewolf';

    // Pyromane solo : dernier survivant OU tous les autres sont arros\u00e9s
    const pyroId = this.pyromaniacId();
    if (pyroId) {
      if (alive.length === 1 && alive[0]!.userId === pyroId) return 'pyromaniac';
      if (this.pyromaniacDousedIds.size > 0) {
        const nonPyro = alive.filter((p) => p.userId !== pyroId);
        if (nonPyro.length > 0 && nonPyro.every((p) => this.pyromaniacDousedIds.has(p.userId))) return 'pyromaniac';
      }
    }

    // Joueur de Fl\u00fbte solo : tous les vivants (sauf lui) sont ensorcel\u00e9s
    const piperId = this.piedPiperId();
    if (piperId && this.enchantedPlayerIds.size > 0) {
      const nonPiper = alive.filter((p) => p.userId !== piperId);
      if (nonPiper.length > 0 && nonPiper.every((p) => this.enchantedPlayerIds.has(p.userId))) return 'piedpiper';
    }


    // Sectaire Abominable solo : tous les survivants dans le m\u00eame groupe
    const sectarianId = this.sectarianId();
    if (sectarianId && this.sectarianGroups.size > 0) {
      const groups = new Set(alive.map((p) => this.sectarianGroups.get(p.userId)));
      if (groups.size === 1) return 'sectarian';
    }
    if (this.loversGroup && this.loversGroup.length >= 2) {
      const lg = this.loversGroup;
      const loversAlive = lg.filter((id) => aliveIds.has(id));
      if (loversAlive.length === lg.length && alive.length === lg.length) return 'lovers';
    }

    if (alive.length === 2) {
      const a = alive[0]!;
      const b = alive[1]!;
      if (a.loverUserId === b.userId && b.loverUserId === a.userId) return 'lovers';
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
    this.foolOfVillageUsedPower = false;
    this.foolOfVillageCanVote = true;
    this.elderSurvivedAttack = false;
    this.elderCursed = false;
    this.wildChildModelId = null;
    this.wildChildBecameWolf = false;
    this.enchantedPlayerIds = new Set();
    this.rustKillPending = false;
    this.scapegoatVoteBannedIds = new Set();
    this.foxLostPower = false;
    this.pyromaniacDousedIds = new Set();
    this.pyromaniacIgnited = false;
    this.bearTamerNeighborIds = [];
    this.sistersThreadId = null;
    this.brothersThreadId = null;
    this.necromancerThreadId = null;
    this.docteurCharges = 3;
    this.sectarianGroups = new Map();
    this.devotedServantUsed = false;
    this.infectFatherUsed = false;
    this.infectFatherInfectedId = null;
    this.dogWolfIsWolf = false;
    this.dogWolfChoseSide = false;
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





