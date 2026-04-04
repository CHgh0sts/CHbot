import { randomInt } from 'node:crypto';
import { MIN_PLAYERS } from '../config';
import { Role } from '../types';

/** Bornes pour `/lg-config` et prévision d’effectif dans l’affichage lobby */
export const CONFIG_MIN_PLAYERS = 4;
export const CONFIG_MAX_WOLVES = 10;

/**
 * Nombre de loups « auto » : **~25 %** de l’effectif (arrondi, minimum **1**).
 */
export function autoWolfCount(playerCount: number): number {
  return Math.max(1, Math.round(playerCount * 0.25));
}

export interface CompositionConfig {
  /** Minimum de joueurs dans le lobby pour autoriser `/lg-start` */
  minPlayers: number;
  /** `null` = recalcul auto selon le nombre de joueurs au lancement */
  wolfCount: number | null;
  includeSeer: boolean;
  includeWitch: boolean;
  includeHunter: boolean;
  includeCupid: boolean;
  includeGuard: boolean;
  includeThief: boolean;
  /** **Ange** : gagne **seul** s’il est éliminé au **1er vote du village** ; sinon il devient **villageois**. */
  includeAngel: boolean;
  /** **Petite fille** : chaque nuit pendant le vote des loups, peut espionner (50 % d’être repérée et mourir à la place de la cible). */
  includeLittleGirl: boolean;
  /** **Corbeau** : chaque nuit, désigne un joueur vivant ; le lendemain ce joueur recoit +2 votes au vote du village. */
  includeRaven: boolean;
  /** **Chaperon Rouge** : tant que le Chasseur est en vie, les loups ne peuvent pas la manger (pouvoir passif). */
  includeRedRidingHood: boolean;
  /** **Idiot du village** : si éliminé par le vote du village, il ne meurt pas (une seule fois) mais perd son droit de vote pour le reste de la partie. */
  includeFoolOfVillage: boolean;
  /** **Ancien** : survit à la 1re attaque des loups. Si tué par le vote du village, tous les rôles spéciaux du camp Village perdent leurs pouvoirs. */
  includeElder: boolean;
  /** **Grand Méchant Loup** : loup + chaque nuit, tant qu'aucun loup n'est mort, il tue un joueur supplémentaire seul en fil privé. */
  includeBigBadWolf: boolean;
  /** **Loup-Blanc** : camp Solo. Joue avec la meute ; toutes les nuits paires il peut éliminer secrètement un loup. Gagne seul s'il est le dernier survivant. */
  includeWhiteWerewolf: boolean;
  /** **Joueur de Flûte** : camp Solo. Chaque nuit, il ensorcelle 2 joueurs vivants. Gagne quand tous les joueurs vivants (sauf lui) sont ensorcelés. */
  includePiedPiper: boolean;
  /** **Chevalier à l'épée rouillée** : camp Village. Passif : quand il est dévoré par les loups, le 1er loup (ordre alpha) meurt à l'aube suivante. */
  includeRustySwordKnight: boolean;
  /** **Bouc Émissaire** : camp Village. Passif : en cas d'égalité au vote, c'est lui qui meurt à la place. Il choisit ensuite qui peut voter au prochain jour. */
  includeScapegoat: boolean;
  /** **Enfant Sauvage** : camp Village au départ. Nuit 1, il choisit un modèle. Si le modèle meurt, il rejoint les loups-garous. */
  includeWildChild: boolean;
  /** **Renard** : camp Village. Chaque nuit, flairer 3 joueurs ; sait si un loup est parmi eux (oui/non). Si non → perd son pouvoir définitivement. */
  includeFox: boolean;
  /** **Pyromane** : camp Solo. Chaque nuit, arrose 1 joueur. Peut déclencher l'incendie pour tuer tous les arrosés en une seule fois. Gagne seul si tous les survivants (sauf lui) sont arrosés. */
  includePyromaniac: boolean;
  /** **Montreur d'Ours** : camp Village. À chaque aube, si l'un de ses 2 voisins secrets (tirés au sort nuit 1) est un loup vivant, l'ours grogne publiquement. Rôle passif. */
  includeBearTamer: boolean;
  /** **Deux Sœurs** : camp Village × 2. La nuit 1, elles se reconnaissent via un fil partagé (comme les amoureux, sans mourir ensemble). */
  includeTwoSisters: boolean;
  /** **Trois Frères** : camp Village × 3. La nuit 1, ils se reconnaissent via un fil partagé. */
  includeThreeBrothers: boolean;
  /** **Docteur** : camp Village. Dispose de 3 charges de protection. Chaque nuit, protège un joueur (pas de restriction de cible consécutive). */
  includeDocteur: boolean;
  /** **Nécromancien** : camp Village. Chaque nuit, inspecte un joueur mort et apprend son rôle exact. */
  includeNecromancer: boolean;
  /** **Sectaire Abominable** : camp Solo. Les joueurs sont répartis en 2 groupes secrets. Il gagne seul si tous les survivants sont du même groupe que lui. */
  includeSectarian: boolean;
  /** **Servante Dévouée** : camp Village. Rôle passif : quand elle est éliminée, elle SURVIT en prenant le rôle du dernier joueur mort avant elle. */
  includeDevotedServant: boolean;
  /** **Infect Père des Loups** : camp Loups. Une fois par partie, peut infecter la victime des loups (elle devient loup secrètement) au lieu de la tuer. */
  includeInfectFather: boolean;
  /** **Chien-Loup** : camp Spécial. La nuit 1, choisit son camp (Village ou Loups). S'il choisit les Loups, il rejoint la meute. */
  includeDogWolf: boolean;
  /** **Dictateur** : camp Village. Une fois par partie, peut interrompre le vote du village et désigner lui-même la victime. S'il cible un ennemi (loup/solo), il survit et devient Maire. Sinon, il meurt. */
  includeDictateur: boolean;
  /** **Hackeur** : camp Village. Nuit 1, cible un joueur. À sa mort, le rôle n'est pas révélé et le Hackeur vole secrètement ce rôle (camp + pouvoirs). La Voyante voit un rôle village aléatoire avant le vol. */
  includeHackeur: boolean;
  /** **Tirage au sort en cas d'égalité** au vote du village : un ex-aequo est éliminé aléatoirement (sinon personne ne meurt). */
  tiebreakerRandom: boolean;
  /** **Première nuit sans meurtre** : les loups se réunissent mais n'éliminent personne la nuit 1. */
  skipFirstNightKill: boolean;
  /** Afficher le rôle de chaque mort dans les annonces du salon (nuit / vote) */
  revealDeadRoles: boolean;
  /**
   * **Nuit sombre** : les morts sont annoncées mais le **rôle n’est jamais révélé** publiquement
   * (prioritaire sur `revealDeadRoles`).
   */
  darkNightMode: boolean;
  /** **Voyante bavarde** : inspection chaque nuit, **rôle exact** en privé ; pas de révélation publique pour un **vivant** (rôle seulement dans les annonces de mort). */
  gossipSeerMode: boolean;
  /** **Ménage à trois** : le Cupidon lie **3** joueurs (tous meurent de chagrin si l’un meurt). */
  tripleLoversMode: boolean;
  /** Message public vague quand le Garde / Salvateur protège quelqu’un (nuit). */
  announceNightProtection: boolean;
  /**
   * `null` = nombre de villageois = effectif − loups − spéciaux à la distribution.
   * nombre = autant de villageois fixes ; l’effectif au `/lg-start` doit être exactement loups + spéciaux + ce nombre.
   */
  villagerCount: number | null;
}

/** Total loups + spéciaux + villageois si `villagerCount` est fixe ; sinon `null`. Loups auto sur `minPlayers`. */
export function fixedCompositionTotal(c: CompositionConfig): number | null {
  if (c.villagerCount === null) return null;
  const w = c.wolfCount ?? autoWolfCount(c.minPlayers);
  let fixed = 0;
  if (c.includeSeer) fixed++;
  if (c.includeWitch) fixed++;
  if (c.includeHunter) fixed++;
  if (c.includeCupid) fixed++;
  if (c.includeGuard) fixed++;
  if (c.includeThief) fixed++;
  if (c.includeAngel) fixed++;
  if (c.includeLittleGirl) fixed++;
  if (c.includeRaven) fixed++;
  if (c.includeRedRidingHood) fixed++;
  if (c.includeFoolOfVillage) fixed++;
  if (c.includeElder) fixed++;
  if (c.includeBigBadWolf) fixed++;
  if (c.includeWhiteWerewolf) fixed++;
  if (c.includePiedPiper) fixed++;
  if (c.includeRustySwordKnight) fixed++;
  if (c.includeScapegoat) fixed++;
  if (c.includeWildChild) fixed++;
  if (c.includeFox) fixed++;
  if (c.includePyromaniac) fixed++;
  if (c.includeBearTamer) fixed++;
  if (c.includeTwoSisters) fixed += 2;
  if (c.includeThreeBrothers) fixed += 3;
  if (c.includeDocteur) fixed++;
  if (c.includeNecromancer) fixed++;
  if (c.includeSectarian) fixed++;
  if (c.includeDevotedServant) fixed++;
  if (c.includeInfectFather) fixed++;
  if (c.includeDogWolf) fixed++;
  if (c.includeDictateur) fixed++;
  if (c.includeHackeur) fixed++;
  return w + fixed + c.villagerCount;
}

/** Villageois nécessaires pour que minimum + loups (auto au min) + spéciaux tombent juste. */
export function villagerCountToMatchMinPlayers(c: CompositionConfig): number {
  const w = c.wolfCount ?? autoWolfCount(c.minPlayers);
  let fixed = 0;
  if (c.includeSeer) fixed++;
  if (c.includeWitch) fixed++;
  if (c.includeHunter) fixed++;
  if (c.includeCupid) fixed++;
  if (c.includeGuard) fixed++;
  if (c.includeThief) fixed++;
  if (c.includeAngel) fixed++;
  if (c.includeLittleGirl) fixed++;
  if (c.includeRaven) fixed++;
  if (c.includeRedRidingHood) fixed++;
  if (c.includeFoolOfVillage) fixed++;
  if (c.includeElder) fixed++;
  if (c.includeBigBadWolf) fixed++;
  if (c.includeWhiteWerewolf) fixed++;
  if (c.includePiedPiper) fixed++;
  if (c.includeRustySwordKnight) fixed++;
  if (c.includeScapegoat) fixed++;
  if (c.includeWildChild) fixed++;
  if (c.includeFox) fixed++;
  if (c.includePyromaniac) fixed++;
  if (c.includeBearTamer) fixed++;
  if (c.includeTwoSisters) fixed += 2;
  if (c.includeThreeBrothers) fixed += 3;
  if (c.includeDocteur) fixed++;
  if (c.includeNecromancer) fixed++;
  if (c.includeSectarian) fixed++;
  if (c.includeDevotedServant) fixed++;
  if (c.includeInfectFather) fixed++;
  if (c.includeDogWolf) fixed++;
  if (c.includeDictateur) fixed++;
  if (c.includeHackeur) fixed++;
  return Math.max(0, c.minPlayers - w - fixed);
}

export function defaultCompositionConfig(): CompositionConfig {
  const minPlayers = MIN_PLAYERS;
  const wolfCount = null;
  const includeSeer = true;
  const includeWitch = true;
  const includeHunter = true;
  const includeCupid = true;
  const includeGuard = false;
  const includeThief = false;
  const includeAngel = false;
  const includeLittleGirl = false;
  const includeRaven = false;
  const includeRedRidingHood = false;
  const includeFoolOfVillage = false;
  const includeElder = false;
  const includeBigBadWolf = false;
  const includeWhiteWerewolf = false;
  const includePiedPiper = false;
  const includeRustySwordKnight = false;
  const includeScapegoat = false;
  const includeWildChild = false;
  const includeFox = false;
  const includePyromaniac = false;
  const includeBearTamer = false;
  const includeTwoSisters = false;
  const includeThreeBrothers = false;
  const includeDocteur = false;
  const includeNecromancer = false;
  const includeSectarian = false;
  const includeDevotedServant = false;
  const includeInfectFather = false;
  const includeDogWolf = false;
  const includeDictateur = false;
  const includeHackeur = false;
  const tiebreakerRandom = false;
  const skipFirstNightKill = false;
  const revealDeadRoles = true;
  const darkNightMode = false;
  const gossipSeerMode = false;
  const tripleLoversMode = false;
  const announceNightProtection = false;
  const base: CompositionConfig = {
    minPlayers,
    wolfCount,
    includeSeer,
    includeWitch,
    includeHunter,
    includeCupid,
    includeGuard,
    includeThief,
    includeAngel,
    includeLittleGirl,
    includeRaven,
    includeRedRidingHood,
    includeFoolOfVillage,
    includeElder,
    includeBigBadWolf,
    includeWhiteWerewolf,
    includePiedPiper,
    includeRustySwordKnight,
    includeScapegoat,
    includeWildChild,
    includeFox,
    includePyromaniac,
    includeBearTamer,
    includeTwoSisters,
    includeThreeBrothers,
    includeDocteur,
    includeNecromancer,
    includeSectarian,
    includeDevotedServant,
    includeInfectFather,
    includeDogWolf,
    includeDictateur,
    includeHackeur,
    tiebreakerRandom,
    skipFirstNightKill,
    revealDeadRoles,
    darkNightMode,
    gossipSeerMode,
    tripleLoversMode,
    announceNightProtection,
    villagerCount: null,
  };
  return {
    ...base,
    villagerCount: villagerCountToMatchMinPlayers(base),
  };
}

/** Copie pour relancer une partie avec les mêmes réglages. */
export function cloneCompositionConfig(c: CompositionConfig): CompositionConfig {
  return {
    minPlayers: c.minPlayers,
    wolfCount: c.wolfCount,
    includeSeer: c.includeSeer,
    includeWitch: c.includeWitch,
    includeHunter: c.includeHunter,
    includeCupid: c.includeCupid,
    includeGuard: c.includeGuard,
    includeThief: c.includeThief,
    includeAngel: c.includeAngel,
    includeLittleGirl: c.includeLittleGirl,
    includeRaven: c.includeRaven,
    includeRedRidingHood: c.includeRedRidingHood,
    includeFoolOfVillage: c.includeFoolOfVillage,
    includeElder: c.includeElder,
    includeBigBadWolf: c.includeBigBadWolf,
    includeWhiteWerewolf: c.includeWhiteWerewolf,
    includePiedPiper: c.includePiedPiper,
    includeRustySwordKnight: c.includeRustySwordKnight,
    includeScapegoat: c.includeScapegoat,
    includeWildChild: c.includeWildChild,
    includeFox: c.includeFox,
    includePyromaniac: c.includePyromaniac,
    includeBearTamer: c.includeBearTamer,
    includeTwoSisters: c.includeTwoSisters,
    includeThreeBrothers: c.includeThreeBrothers,
    includeDocteur: c.includeDocteur,
    includeNecromancer: c.includeNecromancer,
    includeSectarian: c.includeSectarian,
    includeDevotedServant: c.includeDevotedServant,
    includeInfectFather: c.includeInfectFather,
    includeDogWolf: c.includeDogWolf,
    includeDictateur: c.includeDictateur,
    includeHackeur: c.includeHackeur,
    tiebreakerRandom: c.tiebreakerRandom,
    skipFirstNightKill: c.skipFirstNightKill,
    revealDeadRoles: c.revealDeadRoles,
    darkNightMode: c.darkNightMode,
    gossipSeerMode: c.gossipSeerMode,
    tripleLoversMode: c.tripleLoversMode,
    announceNightProtection: c.announceNightProtection,
    villagerCount: c.villagerCount,
  };
}

/** Rôle affiché dans les annonces publiques de mort (nuit / vote / chasseur…). */
export function shouldRevealDeadRoles(c: CompositionConfig): boolean {
  return c.revealDeadRoles && !c.darkNightMode;
}

/**
 * Toujours : loups + éventuellement voyante, sorcière, chasseur + villageois simples.
 */
export function buildRoles(playerCount: number, config: CompositionConfig): Role[] {
  const w = config.wolfCount ?? autoWolfCount(playerCount);
  let fixed = 0;
  if (config.includeSeer) fixed++;
  if (config.includeWitch) fixed++;
  if (config.includeHunter) fixed++;
  if (config.includeCupid) fixed++;
  if (config.includeGuard) fixed++;
  if (config.includeThief) fixed++;
  if (config.includeAngel) fixed++;
  if (config.includeLittleGirl) fixed++;
  if (config.includeRaven) fixed++;
  if (config.includeRedRidingHood) fixed++;
  if (config.includeFoolOfVillage) fixed++;
  if (config.includeElder) fixed++;
  if (config.includeBigBadWolf) fixed++;
  if (config.includeWhiteWerewolf) fixed++;
  if (config.includePiedPiper) fixed++;
  if (config.includeRustySwordKnight) fixed++;
  if (config.includeScapegoat) fixed++;
  if (config.includeWildChild) fixed++;
  if (config.includeFox) fixed++;
  if (config.includePyromaniac) fixed++;
  if (config.includeBearTamer) fixed++;
  if (config.includeTwoSisters) fixed += 2;
  if (config.includeThreeBrothers) fixed += 3;

  let villagers: number;
  if (config.villagerCount === null) {
    villagers = playerCount - w - fixed;
  } else {
    villagers = config.villagerCount;
    const need = w + fixed + villagers;
    if (playerCount !== need) {
      throw new Error(
        `Effectif **${playerCount}** ≠ **${need}** (**${w}** loup(s) + **${fixed}** spécial(aux) + **${villagers}** villageois). Inscris exactement **${need}** joueurs ou passe \`villageois_auto\` dans \`/lg-config\`.`
      );
    }
  }

  if (w < 1) {
    throw new Error('Il faut au moins **1** Loup-Garou.');
  }
  if (villagers < 0) {
    throw new Error(
      `Composition impossible avec **${playerCount}** joueurs : **${w}** loups + **${fixed}** rôle(s) spécial(aux) — pas assez de places. Réduis les loups ou désactive des rôles (\`/lg-config\`).`
    );
  }

  const roles: Role[] = [];
  for (let i = 0; i < w; i++) roles.push(Role.Werewolf);
  if (config.includeSeer) roles.push(Role.Seer);
  if (config.includeWitch) roles.push(Role.Witch);
  if (config.includeHunter) roles.push(Role.Hunter);
  if (config.includeCupid) roles.push(Role.Cupid);
  if (config.includeGuard) roles.push(Role.Guard);
  if (config.includeThief) roles.push(Role.Thief);
  if (config.includeAngel) roles.push(Role.Angel);
  if (config.includeLittleGirl) roles.push(Role.LittleGirl);
  if (config.includeRaven) roles.push(Role.Raven);
  if (config.includeRedRidingHood) roles.push(Role.RedRidingHood);
  if (config.includeFoolOfVillage) roles.push(Role.FoolOfVillage);
  if (config.includeElder) roles.push(Role.Elder);
  if (config.includeBigBadWolf) roles.push(Role.BigBadWolf);
  if (config.includeWhiteWerewolf) roles.push(Role.WhiteWerewolf);
  if (config.includePiedPiper) roles.push(Role.PiedPiper);
  if (config.includeRustySwordKnight) roles.push(Role.RustySwordKnight);
  if (config.includeScapegoat) roles.push(Role.Scapegoat);
  if (config.includeWildChild) roles.push(Role.WildChild);
  if (config.includeFox) roles.push(Role.Fox);
  if (config.includePyromaniac) roles.push(Role.Pyromaniac);
  if (config.includeBearTamer) roles.push(Role.BearTamer);
  if (config.includeTwoSisters) { roles.push(Role.TwoSisters); roles.push(Role.TwoSisters); }
  if (config.includeThreeBrothers) { roles.push(Role.ThreeBrothers); roles.push(Role.ThreeBrothers); roles.push(Role.ThreeBrothers); }
  if (config.includeDocteur) roles.push(Role.Docteur);
  if (config.includeNecromancer) roles.push(Role.Necromancer);
  if (config.includeSectarian) roles.push(Role.Sectarian);
  if (config.includeDevotedServant) roles.push(Role.DevotedServant);
  if (config.includeInfectFather) roles.push(Role.InfectFather);
  if (config.includeDogWolf) roles.push(Role.DogWolf);
  if (config.includeDictateur) roles.push(Role.Dictateur);
  if (config.includeHackeur) roles.push(Role.Hackeur);
  for (let i = 0; i < villagers; i++) roles.push(Role.Villager);

  return roles;
}

/** Mélange Fisher–Yates avec entropie système (`crypto.randomInt`), pas `Math.random()`. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countSameRoleAssignments(
  sortedPlayerIds: string[],
  roles: Role[],
  previous: ReadonlyMap<string, Role> | null
): number {
  if (!previous || previous.size === 0) return 0;
  let n = 0;
  for (let i = 0; i < sortedPlayerIds.length; i++) {
    const prevRole = previous.get(sortedPlayerIds[i]!);
    if (prevRole !== undefined && prevRole === roles[i]) n++;
  }
  return n;
}

/**
 * Mélange le paquet de rôles pour l’aligner sur `sortedPlayerIds` (dans le même ordre).
 * Si `previousByUserId` contient la partie d’avant (ex. après « Rejouer »), retient un tirage
 * qui **minimise** le nombre de joueurs qui reprennent **exactement** le même rôle.
 * (Si tout le monde était villageois, une répétition peut rester inévitable.)
 */
export function dealRolesToPlayers(
  sortedPlayerIds: string[],
  roleDeck: Role[],
  previousByUserId: ReadonlyMap<string, Role> | null,
  optimizeRepeatsAttempts = 384
): Role[] {
  const n = sortedPlayerIds.length;
  if (n !== roleDeck.length) {
    throw new Error(
      'dealRolesToPlayers: nombre de joueurs et de rôles incohérent'
    );
  }
  let best = shuffle([...roleDeck]);
  if (!previousByUserId?.size) return best;

  let bestScore = countSameRoleAssignments(
    sortedPlayerIds,
    best,
    previousByUserId
  );
  const tries = Math.max(1, optimizeRepeatsAttempts);
  for (let a = 1; a < tries && bestScore > 0; a++) {
    const candidate = shuffle([...roleDeck]);
    const sc = countSameRoleAssignments(
      sortedPlayerIds,
      candidate,
      previousByUserId
    );
    if (sc < bestScore) {
      best = candidate;
      bestScore = sc;
    }
  }
  return best;
}

export function roleLabelFr(role: Role): string {
  switch (role) {
    case Role.Werewolf:
      return 'Loup-Garou';
    case Role.Villager:
      return 'Villageois';
    case Role.Seer:
      return 'Voyante';
    case Role.Witch:
      return 'Sorcière';
    case Role.Hunter:
      return 'Chasseur';
    case Role.Cupid:
      return 'Cupidon';
    case Role.Guard:
      return 'Garde';
    case Role.Thief:
      return 'Voleur';
    case Role.Angel:
      return 'Ange';
    case Role.LittleGirl:
      return 'Petite fille';
    case Role.Raven:
      return 'Corbeau';
    case Role.RedRidingHood:
      return 'Chaperon Rouge';
    case Role.FoolOfVillage:
      return 'Idiot du village';
    case Role.Elder:
      return 'Ancien';
    case Role.BigBadWolf:
      return 'Grand Mechant Loup';
    case Role.WhiteWerewolf:
      return 'Loup-Blanc';
    case Role.PiedPiper:
      return 'Joueur de Flute';
    case Role.RustySwordKnight:
      return 'Chevalier a l\u2019epee rouilee';
    case Role.Scapegoat:
      return 'Bouc Emissaire';
    case Role.WildChild:
      return 'Enfant Sauvage';
    case Role.Fox:
      return 'Renard';
    case Role.Pyromaniac:
      return 'Pyromane';
    case Role.BearTamer:
      return 'Montreur d\u2019Ours';
    case Role.TwoSisters:
      return 'Deux S\u0153urs';
    case Role.ThreeBrothers:
      return 'Trois Fr\u00e8res';
    case Role.Docteur:
      return 'Docteur';
    case Role.Necromancer:
      return 'N\u00e9cromancien';
    case Role.Sectarian:
      return 'Sectaire Abominable';
    case Role.DevotedServant:
      return 'Servante D\u00e9vou\u00e9e';
    case Role.InfectFather:
      return 'Infect P\u00e8re des Loups';
    case Role.DogWolf:
      return 'Chien-Loup';
    case Role.Dictateur:
      return 'Dictateur';
    case Role.Hackeur:
      return 'Hackeur';
    default:
      return role;
  }
}

/** Texte d’aide pouvoir (distribution fil privé, échange Voleur, etc.). */
export function rolePowerBlurb(role: Role): string {
  switch (role) {
    case Role.Werewolf:
      return 'Chaque nuit, la meute élimine un villageois — votes dans le **fil Meute**.';
    case Role.Seer:
      return 'Chaque nuit, tu désignes un joueur à observer. **Voyante classique** : tu vois tout de suite s’il est Loup ou non. **Voyante bavarde** (si activée en config) : tu vois son **rôle exact** en **privé** ; le salon ne l’affiche **que** dans une **annonce de mort** (jamais pour un vivant).';
    case Role.Witch:
      return 'Tu as une potion de vie et une potion de mort (usage unique chacune).';
    case Role.Hunter:
      return 'À ta mort, tu élimines immédiatement un autre joueur.';
    case Role.Cupid:
      return 'La **première nuit**, tu lies **deux ou trois** joueurs en amoureux (selon la config de partie, fil privé). S’ils sont **seuls derniers survivants** du lien, ils gagnent ensemble ; si **l’un** meurt, **tous les autres** du lien meurent de chagrin (sans tir de Chasseur pour ces morts).';
    case Role.Guard:
      return 'Chaque nuit, choisis un **joueur vivant autre que toi** à protéger. Tu ne peux **pas** protéger la même personne que la **dernière fois que tu as réussi** à protéger quelqu’un. Si les loups désignent cette personne, **elle ne meurt pas des loups** cette nuit (la sorcière et autres effets restent possibles).';
    case Role.Thief:
      return '**Première nuit uniquement** : tu **échanges ta carte** avec un **autre joueur vivant**. Vous recevez chacun le rôle de l’autre (nouveau message dans vos fils privés).';
    case Role.Angel:
      return '**Pas d’action la nuit.** Au **tout premier vote du village**, si **c’est toi** qui es éliminé·e, tu **gagnes seul·e** et la partie s’arrête. **Sinon** (une autre personne est éliminée, ou égalité / pas de mort au vote), tu deviens un **villageois** ordinaire (nouveau message dans ton fil privé).';
    case Role.Raven:
      return 'Chaque nuit, tu designes un joueur vivant dans ton fil prive. Le lendemain, ce joueur recoit **+2 votes** supplementaires au vote du village (le salon public annonce qu un joueur a ete marque, sans reveler ton identite). Si tu ne designes personne (timeout / skip), rien ne se passe.';
    case Role.RedRidingHood:
      return 'Tant que le **Chasseur** est en vie, les loups ne peuvent pas te devorer (attaque absorbee — personne ne meurt de ce fait cette nuit). Si le Chasseur meurt, tu perds cette protection et peux etre mangee normalement. Pas d action nocturne : ton pouvoir est entierement passif.';
    case Role.FoolOfVillage:
      return 'Si le village vote pour t eliminier, tu **ne meurs pas** (une seule fois). Ton identite est revelee publiquement et tu **perds ton droit de vote** pour le reste de la partie. En revanche, tu peux toujours etre mange par les loups, empoisonne ou victime d autres effets.';
    case Role.Elder:
      return 'Tu peux **survivre a la 1re attaque des loups** : cette nuit-la, l attaque est absorbee (annoncee comme resistance mysterieuse, sans revealer ton identite). Si le village te vote pour t eliminer, tous les **roles speciaux du camp Village perdent leurs pouvoirs** pour le reste de la partie (malediction).';
    case Role.BigBadWolf:
      return 'Tu votes chaque nuit avec la **meute** (fil Meute + `/lg-vote`). En plus, tant qu aucun loup n est mort, tu peux tuer **un joueur supplementaire** seul dans ton fil prive apres le vote de meute. Si un loup meurt, tu perds ce pouvoir bonus mais continues de jouer avec la meute.';
    case Role.WhiteWerewolf:
      return 'Tu joues comme un loup ordinaire (fil Meute, vote `/lg-vote`). En plus, **toutes les nuits paires** (nuit 2, 4, 6\u2026), tu peux choisir en secret d\u2019\u00e9liminer **un loup-garou de la meute** (tu peux aussi passer). Tu gagnes **seul** si tu es le **dernier survivant** de la partie.';
    case Role.PiedPiper:
      return 'Chaque nuit, tu **ensorcel\u00e8s 2 joueurs vivants** (non encore ensorcel\u00e9s) via ton fil priv\u00e9. Tu gagnes **seul** quand **tous les survivants** (sauf toi) sont ensorcel\u00e9s. Si tu meurs, les joueurs ensorcel\u00e9s restent ensorcel\u00e9s mais tu ne peux plus gagner.';
    case Role.RustySwordKnight:
      return 'Pouvoir entierement **passif** : si tu es d\u00e9vor\u00e9 par les loups (attaque de meute), le **premier loup par ordre alphabetique** meurt \u00e0 l\u2019aube suivante d\u2019une infection mysteieuse. La sorciere peut annuler ta mort, ce qui annule aussi l\u2019infection.';
    case Role.Scapegoat:
      return 'Pouvoir entierement **passif** : en cas d\u2019**\u00e9galit\u00e9 au vote** du village, c\u2019est **toi** qui es \u00e9limin\u00e9 \u00e0 la place (avant le tirage au sort). Apres ta mort, tu **choisis qui pourra voter** lors du prochain vote (tu peux tout interdir ou tout autoriser).';
    case Role.WildChild:
      return 'La 1re nuit, tu choisis un **mod\u00e8le** parmi les joueurs vivants (dans ton fil priv\u00e9). Si ton mod\u00e8le meurt, tu te **transformes en Loup-Garou** et rejoins la meute. Tant que le mod\u00e8le est en vie, tu joues du c\u00f4t\u00e9 du village.';
    case Role.Fox:
      return 'Chaque nuit, tu flairer **3 joueurs** de ton choix. Le bot te r\u00e9pond **oui** (un loup est parmi eux) ou **non** (aucun loup). Si la r\u00e9ponse est **non**, tu **perds ton pouvoir** d\u00e9finitivement mais continues de jouer du c\u00f4t\u00e9 village.';
    case Role.Pyromaniac:
      return 'Camp **Solo**. Chaque nuit, tu **arroses** un joueur (ou toi-m\u00eame) d\u2019essence. Quand tu le d\u00e9cides (bouton **Incendier**), tu mets le feu \u2014 tous les joueurs arros\u00e9s encore en vie meurent simultan\u00e9ment. Tu gagnes **seul** si tu es le dernier survivant ou si tous les joueurs vivants (sauf toi) sont arros\u00e9s.';
    case Role.BearTamer:
      return 'R\u00f4le **entierement passif**. La nuit 1, 2 joueurs sont assign\u00e9s secrets comme tes **voisins** (tir\u00e9s au sort) — tu en seras inform\u00e9 dans ton fil priv\u00e9. \u00c0 chaque **aube**, si l\u2019un de tes voisins encore en vie est un **loup**, l\u2019ours grogne publiquement. Sinon, silence.';
    case Role.TwoSisters:
      return 'Vous \u00eates **2 joueuses** avec ce r\u00f4le. La **nuit 1**, vous vous reconnaissez dans un **fil priv\u00e9 partag\u00e9**. Pas de pouvoir actif : vous partagez simplement votre identit\u00e9. Vous gagnez avec le **camp Village**.';
    case Role.ThreeBrothers:
      return 'Vous \u00eates **3 joueurs** avec ce r\u00f4le. La **nuit 1**, vous vous reconnaissez dans un **fil priv\u00e9 partag\u00e9**. Pas de pouvoir actif : vous partagez simplement votre identit\u00e9. Vous gagnez avec le **camp Village**.';
    case Role.Docteur:
      return 'Vous disposez de **3 charges** de soin. Chaque nuit, vous pouvez prot\u00e9ger un joueur de votre choix (pas de restriction de cible cons\u00e9cutive, contrairement au Garde). Si ce joueur est attaqu\u00e9 par les loups, il survit. Quand vos charges sont \u00e9puis\u00e9es, vous n\u2019agissez plus.';
    case Role.Necromancer:
      return 'Chaque nuit, vous pouvez inspecter un **joueur mort** de votre choix et apprendre son **r\u00f4le exact** (dans votre fil priv\u00e9). Pouvoir passif \u2014 vous ne pouvez pas ramener les morts. Vous gagnez avec le **camp Village**.';
    case Role.Sectarian:
      return 'Camp **Solo**. Au d\u00e9but du jeu, tous les joueurs sont r\u00e9partis en **deux groupes secrets** (A et B). Vous apprenez votre groupe. Chaque nuit, vous inspectez un joueur et apprenez son groupe. Vous gagnez **seul** quand tous les survivants sont du m\u00eame groupe.';
    case Role.DevotedServant:
      return 'Apr\u00e8s chaque **vote du village**, la Servante re\u00e7oit un message priv\u00e9 lui demandant si elle veut **prendre la place** de la personne \u00e9limin\u00e9e. Si oui : elle se d\u00e9voile publiquement, prend le r\u00f4le de la victime et continue la partie. La victime est quand m\u00eame \u00e9limin\u00e9e. Pouvoir \u00e0 **usage unique**.';
    case Role.InfectFather:
      return 'Camp **Loups**. Vous \u00eates un loup ordinaire, plus \u2014 **une fois par partie**, apr\u00e8s que la meute a d\u00e9sign\u00e9 sa victime, vous pouvez choisir de l\u2019**infecter** plut\u00f4t que de la tuer. La victime devient un loup secr\u00e8tement, rejoint la meute, et le village ne voit pas de mort ce soir-l\u00e0.';
    case Role.DogWolf:
      return 'Camp **Sp\u00e9cial**. La **nuit 1**, vous choisissez votre camp : **Village** (vous jouez comme villageois) ou **Loups** (vous rejoignez la meute secr\u00e8tement dans le fil Meute). Le village ne sait pas quel camp vous avez choisi.';
    case Role.Dictateur:
      return '**Une fois par partie**, pendant le vote du village, vous pouvez vous **r\u00e9v\u00e9ler** et **imposer** votre propre choix \u2014 la victime est d\u00e9sign\u00e9e par vous seul. Si elle est un **ennemi** (loup, solo\u2026), vous survivez et devenez **Maire** (double vote). Si vous vous **trompez** (villageois innocent), vous **mourez** imm\u00e9diatement.';
    case Role.Hackeur:
      return 'Camp **Village**. La **nuit 1**, vous ciblez secr\u00e8tement un joueur. Lorsqu\u2019il mourra, son r\u00f4le n\u2019est **pas r\u00e9v\u00e9l\u00e9** publiquement : vous **h\u00e9ritez** de son r\u00f4le, de son camp et de ses pouvoirs. Avant ce vol, la Voyante vous per\u00e7oit comme un **r\u00f4le village al\u00e9atoire**.';
    case Role.LittleGirl:
      return '**Chaque nuit** pendant le **vote des loups**, tu peux **espionner** : tu apprends qui la meute a majoritairement désigné. **Risque** : **50 %** de chances d’être **repérée** — tu meurs **à la place** de cette victime (elle est alors **épargnée** par les loups ce soir).';
    case Role.Villager:
    default:
      return 'Tu n’as pas de pouvoir spécial — démasque les loups au vote.';
  }
}

/**
 * Texte lisible pour embed / lobby : effectif minimum, liste des rôles avec quantités
 * (loups auto/fixe, spéciaux, villageois), annonce des morts.
 * @param playerCountForRoles effectif pour la prévision (ex. inscrits) ; sinon seuil minimum.
 */
export function formatCompositionReadable(
  c: CompositionConfig,
  playerCountForRoles?: number
): string {
  const n =
    playerCountForRoles !== undefined && playerCountForRoles > 0
      ? playerCountForRoles
      : Math.max(c.minPlayers, CONFIG_MIN_PLAYERS);

  const w = c.wolfCount ?? autoWolfCount(n);
  let fixed = 0;
  if (c.includeSeer) fixed++;
  if (c.includeWitch) fixed++;
  if (c.includeHunter) fixed++;
  if (c.includeCupid) fixed++;
  if (c.includeGuard) fixed++;
  if (c.includeThief) fixed++;
  if (c.includeAngel) fixed++;
  if (c.includeLittleGirl) fixed++;
  if (c.includeRaven) fixed++;
  if (c.includeRedRidingHood) fixed++;
  if (c.includeFoolOfVillage) fixed++;
  if (c.includeElder) fixed++;
  if (c.includeBigBadWolf) fixed++;

  const lines: string[] = [];
  const wolfNote =
    c.wolfCount === null
      ? ` _(auto **~25 %** à **${n}** joueur${n > 1 ? 's' : ''} → **${autoWolfCount(n)}** loup(s))_`
      : '';
  lines.push(`• **${roleLabelFr(Role.Werewolf)}** × **${w}**${wolfNote}`);
  if (c.includeSeer) lines.push(`• **${roleLabelFr(Role.Seer)}** × **1**`);
  if (c.includeWitch) lines.push(`• **${roleLabelFr(Role.Witch)}** × **1**`);
  if (c.includeHunter) lines.push(`• **${roleLabelFr(Role.Hunter)}** × **1**`);
  if (c.includeCupid) lines.push(`• **${roleLabelFr(Role.Cupid)}** × **1**`);
  if (c.includeGuard) lines.push(`• **${roleLabelFr(Role.Guard)}** × **1**`);
  if (c.includeThief) lines.push(`• **${roleLabelFr(Role.Thief)}** × **1**`);
  if (c.includeAngel) lines.push(`• **${roleLabelFr(Role.Angel)}** × **1**`);
  if (c.includeRaven) lines.push(`• **${roleLabelFr(Role.Raven)}** × **1**`);
  if (c.includeRedRidingHood) lines.push(`• **${roleLabelFr(Role.RedRidingHood)}** × **1**`);
  if (c.includeFoolOfVillage) lines.push(`• **${roleLabelFr(Role.FoolOfVillage)}** × **1**`);
  if (c.includeElder) lines.push(`• **${roleLabelFr(Role.Elder)}** × **1**`);
  if (c.includeBigBadWolf) lines.push(`• **${roleLabelFr(Role.BigBadWolf)}** × **1** _(loup)_`);
  if (c.includeWhiteWerewolf) lines.push(`• **${roleLabelFr(Role.WhiteWerewolf)}** × **1** _(solo/loup)_`);
  if (c.includePiedPiper) lines.push(`• **${roleLabelFr(Role.PiedPiper)}** × **1** _(solo)_`);
  if (c.includeRustySwordKnight) lines.push(`• **${roleLabelFr(Role.RustySwordKnight)}** × **1**`);
  if (c.includeScapegoat) lines.push(`• **${roleLabelFr(Role.Scapegoat)}** × **1**`);
  if (c.includeWildChild) lines.push(`\u2022 **${roleLabelFr(Role.WildChild)}** \u00d7 **1**`);
  if (c.includeFox) lines.push(`\u2022 **${roleLabelFr(Role.Fox)}** \u00d7 **1**`);
  if (c.includePyromaniac) lines.push(`\u2022 **${roleLabelFr(Role.Pyromaniac)}** \u00d7 **1** _(solo)_`);
  if (c.includeBearTamer) lines.push(`\u2022 **${roleLabelFr(Role.BearTamer)}** \u00d7 **1**`);
  if (c.includeTwoSisters) lines.push(`\u2022 **${roleLabelFr(Role.TwoSisters)}** \u00d7 **2**`);
  if (c.includeThreeBrothers) lines.push(`\u2022 **${roleLabelFr(Role.ThreeBrothers)}** \u00d7 **3**`);
  if (c.includeDocteur) lines.push(`\u2022 **${roleLabelFr(Role.Docteur)}** \u00d7 **1**`);
  if (c.includeNecromancer) lines.push(`\u2022 **${roleLabelFr(Role.Necromancer)}** \u00d7 **1**`);
  if (c.includeSectarian) lines.push(`\u2022 **${roleLabelFr(Role.Sectarian)}** \u00d7 **1** _(solo)_`);
  if (c.includeDevotedServant) lines.push(`\u2022 **${roleLabelFr(Role.DevotedServant)}** \u00d7 **1**`);
  if (c.includeInfectFather) lines.push(`\u2022 **${roleLabelFr(Role.InfectFather)}** \u00d7 **1** _(loup)_`);
  if (c.includeDogWolf) lines.push(`\u2022 **${roleLabelFr(Role.DogWolf)}** \u00d7 **1**`);
  if (c.includeDictateur) lines.push(`\u2022 **${roleLabelFr(Role.Dictateur)}** \u00d7 **1**`);
  if (c.includeHackeur) lines.push(`\u2022 **${roleLabelFr(Role.Hackeur)}** \u00d7 **1**`);
  if (c.includeLittleGirl) {
    lines.push(`• **${roleLabelFr(Role.LittleGirl)}** × **1**`);
  }

  if (c.villagerCount === null) {
    const villagersDyn = n - w - fixed;
    if (villagersDyn >= 0) {
      lines.push(
        `• **${roleLabelFr(Role.Villager)}** × **${villagersDyn}** _(auto : reste à la distribution)_`
      );
    } else {
      lines.push(
        `• **${roleLabelFr(Role.Villager)}** × **0** _(effectif **${n}** insuffisant)_`
      );
    }
  } else {
    const vFix = c.villagerCount;
    const required = w + fixed + vFix;
    lines.push(`• **${roleLabelFr(Role.Villager)}** × **${vFix}** _(fixe — **${required}** joueurs au lancement)_`);
    if (n !== required) {
      lines.push(
        `_⚠️ Inscrits : **${n}** — pour cette config il en faut **${required}**._`
      );
    }
  }

  const rolesSection = `**Roles** _(pour **${n}** joueur${n > 1 ? 's' : ''})_\n${lines.join('\n')}`;

  return [
    `**Minimum pour lancer** : ${c.minPlayers} joueur(s)`,
    rolesSection,
    `**Cupidon** : ${c.includeCupid ? '**activé**' : '**désactivé**'}`,
    `**Garde** : ${c.includeGuard ? '**activé**' : '**désactivé**'}`,
    `**Voleur** : ${c.includeThief ? '**activé**' : '**désactivé**'}`,
    `**Ange** : ${c.includeAngel ? '**activé**' : '**désactivé**'}`,
    `**Corbeau** : ${c.includeRaven ? '**activé** — +2 votes sur sa cible le lendemain' : '**désactivé**'}`,
    `**Chaperon Rouge** : ${c.includeRedRidingHood ? '**activée** — protégée des loups tant que le Chasseur est en vie' : '**désactivée**'}`,
    `**Idiot du village** : ${c.includeFoolOfVillage ? '**activé** — survit au 1er vote du village (perd son vote)' : '**désactivé**'}`,
    `**Ancien** : ${c.includeElder ? '**activé** — survit à la 1re attaque loup ; malédiction si tué par le village' : '**désactivé**'}`,
    `**Loup-Blanc** : ${c.includeWhiteWerewolf ? "**activ\u00e9** \u2014 tue un loup toutes les 2 nuits, gagne seul si dernier survivant" : "**d\u00e9sactiv\u00e9**"}`,
    `**Joueur de Fl\u00fbte** : ${c.includePiedPiper ? "**activ\u00e9** \u2014 ensorcelle 2 joueurs/nuit, gagne si tous ensorcel\u00e9s" : "**d\u00e9sactiv\u00e9**"}`,
    `**Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e** : ${c.includeRustySwordKnight ? "**activ\u00e9** \u2014 1er loup alpha meurt si le chevalier est d\u00e9vor\u00e9" : "**d\u00e9sactiv\u00e9**"}`,
    `**Bouc \u00c9missaire** : ${c.includeScapegoat ? "**activ\u00e9** \u2014 meurt en cas d\u2019\u00e9galit\u00e9, choisit ensuite qui vote" : "**d\u00e9sactiv\u00e9**"}`,
    `**Enfant Sauvage** : ${c.includeWildChild ? "**activ\u00e9** \u2014 rejoint les loups si son mod\u00e8le meurt" : "**d\u00e9sactiv\u00e9**"}`,
    `**Renard** : ${c.includeFox ? "**activ\u00e9** \u2014 flairer 3 joueurs/nuit, perd le pouvoir si aucun loup parmi eux" : "**d\u00e9sactiv\u00e9**"}`,
    `**Pyromane** : ${c.includePyromaniac ? "**activ\u00e9** \u2014 arrose 1 joueur/nuit, incendie pour tuer tous les arros\u00e9s" : "**d\u00e9sactiv\u00e9**"}`,
    `**Montreur d'Ours** : ${c.includeBearTamer ? "**activ\u00e9** \u2014 l'ours grogne \u00e0 l'aube si un voisin est loup" : "**d\u00e9sactiv\u00e9**"}`,
    `**Deux S\u0153urs** : ${c.includeTwoSisters ? "**activ\u00e9** \u2014 2 joueuses se reconnaissent nuit 1 (fil partag\u00e9)" : "**d\u00e9sactiv\u00e9**"}`,
    `**Trois Fr\u00e8res** : ${c.includeThreeBrothers ? "**activ\u00e9** \u2014 3 joueurs se reconnaissent nuit 1 (fil partag\u00e9)" : "**d\u00e9sactiv\u00e9**"}`,
    `**Docteur** : ${c.includeDocteur ? "**activ\u00e9** \u2014 3 charges, prot\u00e8ge n'importe quel joueur chaque nuit" : "**d\u00e9sactiv\u00e9**"}`,
    `**N\u00e9cromancien** : ${c.includeNecromancer ? "**activ\u00e9** \u2014 inspecte un mort/nuit pour conna\u00eetre son r\u00f4le" : "**d\u00e9sactiv\u00e9**"}`,
    `**Sectaire Abominable** : ${c.includeSectarian ? "**activ\u00e9** \u2014 solo, gagne si tous les survivants sont du m\u00eame groupe" : "**d\u00e9sactiv\u00e9**"}`,
    `**Servante D\u00e9vou\u00e9e** : ${c.includeDevotedServant ? "**activ\u00e9** \u2014 survit en prenant le r\u00f4le du dernier mort" : "**d\u00e9sactiv\u00e9**"}`,
    `**Infect P\u00e8re des Loups** : ${c.includeInfectFather ? "**activ\u00e9** \u2014 peut infecter la victime (la transformer en loup) 1 fois" : "**d\u00e9sactiv\u00e9**"}`,
    `**Chien-Loup** : ${c.includeDogWolf ? "**activ\u00e9** \u2014 choisit son camp nuit 1 (village ou loups)" : "**d\u00e9sactiv\u00e9**"}`,
    `**Grand M\u00e9chant Loup** : ${c.includeBigBadWolf ? "**activ\u00e9** \u2014 extra-kill tant qu\u2019aucun loup n\u2019est mort" : "**d\u00e9sactiv\u00e9**"}`,
    `**Égalité vote → tirage au sort** : ${c.tiebreakerRandom ? '**oui** — un ex-aequo éliminé aléatoirement' : 'non — personne ne meurt'}`,
    `**1re nuit sans meurtre** : ${c.skipFirstNightKill ? '**oui** \u2014 loups se r\u00e9unissent mais n\u2019\u00e9liminent personne nuit 1' : 'non'}`,
    `**Petite fille** : ${c.includeLittleGirl ? '**activée**' : '**désactivée**'}`,
    `**Nuit sombre** : ${c.darkNightMode ? '**oui** — jamais de rôle public' : 'non'}`,
    `**Voyante bavarde** : ${c.gossipSeerMode ? '**oui** — rôle exact en privé (public seulement via annonces de mort)' : 'non'}`,
    `**Ménage à trois (Cupidon)** : ${c.tripleLoversMode ? '**oui** — 3 liés' : 'non — couple classique'}`,
    `**Protection annoncée** (Garde) : ${c.announceNightProtection ? 'message public la nuit' : 'non'}`,
    `**Annonce des morts** : ${shouldRevealDeadRoles(c) ? 'rôle affiché publiquement' : c.darkNightMode ? 'rôle **jamais** public (nuit sombre)' : 'rôle masqué (seulement la mention)'}`,
  ].join('\n');
}

















