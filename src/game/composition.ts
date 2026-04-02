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
  /** **Ange** : 1re nuit, bénit un joueur **protégé à vie** contre les **seuls** dégâts des loups. */
  includeAngel: boolean;
  /** **Petite fille** : chaque nuit pendant le vote des loups, peut espionner (50 % d’être repérée et mourir à la place de la cible). */
  includeLittleGirl: boolean;
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
      return '**Première nuit uniquement** : tu **bénis un joueur vivant autre que toi**. Tant qu’il est en vie, il **ne peut pas être tué par les loups** (vote de la meute annulé pour lui ; sorcière, vote du jour, chagrin, etc. restent possibles).';
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
    `**Petite fille** : ${c.includeLittleGirl ? '**activée**' : '**désactivée**'}`,
    `**Nuit sombre** : ${c.darkNightMode ? '**oui** — jamais de rôle public' : 'non'}`,
    `**Voyante bavarde** : ${c.gossipSeerMode ? '**oui** — rôle exact en privé (public seulement via annonces de mort)' : 'non'}`,
    `**Ménage à trois (Cupidon)** : ${c.tripleLoversMode ? '**oui** — 3 liés' : 'non — couple classique'}`,
    `**Protection annoncée** (Garde) : ${c.announceNightProtection ? 'message public la nuit' : 'non'}`,
    `**Annonce des morts** : ${shouldRevealDeadRoles(c) ? 'rôle affiché publiquement' : c.darkNightMode ? 'rôle **jamais** public (nuit sombre)' : 'rôle masqué (seulement la mention)'}`,
  ].join('\n');
}
