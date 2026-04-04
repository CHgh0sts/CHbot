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
  if (c.includeWildChild) lines.push(`• **${roleLabelFr(Role.WildChild)}** × **1**`);
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











