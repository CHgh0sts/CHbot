import type { CompositionConfig } from './composition';
import {
  CONFIG_MAX_WOLVES,
  CONFIG_MIN_PLAYERS,
  cloneCompositionConfig,
  fixedCompositionTotal,
  villagerCountToMatchMinPlayers,
} from './composition';
import { MAX_PLAYERS } from '../config';

/**
 * Valide le JSON renvoyé par le site et retourne une composition utilisable par le bot.
 */
export function normalizePartyPresetComposition(
  raw: unknown
): CompositionConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const minPlayers = o.minPlayers;
  if (
    typeof minPlayers !== 'number' ||
    !Number.isInteger(minPlayers) ||
    minPlayers < CONFIG_MIN_PLAYERS ||
    minPlayers > MAX_PLAYERS
  ) {
    return null;
  }

  let wolfCount: number | null;
  if (o.wolfCount === null) wolfCount = null;
  else if (typeof o.wolfCount === 'number' && Number.isInteger(o.wolfCount)) {
    if (o.wolfCount < 1 || o.wolfCount > CONFIG_MAX_WOLVES) return null;
    wolfCount = o.wolfCount;
  } else return null;

  const boolKeys = [
    'includeSeer',
    'includeWitch',
    'includeHunter',
    'includeCupid',
    'includeGuard',
    'includeThief',
    'includeAngel',
    'includeLittleGirl',
    'includeRaven',
    'includeRedRidingHood',
    'includeFoolOfVillage',
    'includeElder',
    'includeBigBadWolf',
    'includeWhiteWerewolf',
    'includePiedPiper',
    'includeRustySwordKnight',
    'includeScapegoat',
    'includeWildChild',
    'includeFox',
    'includePyromaniac',
    'includeBearTamer',
    'includeTwoSisters',
    'includeThreeBrothers',
    'includeDocteur',
    'includeNecromancer',
    'includeSectarian',
    'includeDevotedServant',
    'includeInfectFather',
    'includeDogWolf',
    'includeDictateur',
    'includeHackeur',
    'tiebreakerRandom',
    'skipFirstNightKill',
    'revealDeadRoles',
    'darkNightMode',
    'gossipSeerMode',
    'tripleLoversMode',
    'announceNightProtection',
  ] as const;

  for (const k of boolKeys) {
    if (typeof o[k] !== 'boolean') return null;
  }

  let villagerCount: number | null;
  if (o.villagerCount === null) villagerCount = null;
  else if (
    typeof o.villagerCount === 'number' &&
    Number.isInteger(o.villagerCount)
  ) {
    if (o.villagerCount < 0 || o.villagerCount > MAX_PLAYERS) return null;
    villagerCount = o.villagerCount;
  } else return null;

  let c: CompositionConfig = {
    minPlayers,
    wolfCount,
    includeSeer: o.includeSeer as boolean,
    includeWitch: o.includeWitch as boolean,
    includeHunter: o.includeHunter as boolean,
    includeCupid: o.includeCupid as boolean,
    includeGuard: o.includeGuard as boolean,
    includeThief: o.includeThief as boolean,
    includeAngel: o.includeAngel as boolean,
    includeLittleGirl: o.includeLittleGirl as boolean,
    includeRaven: o.includeRaven as boolean,
    includeRedRidingHood: o.includeRedRidingHood as boolean,
    includeFoolOfVillage: o.includeFoolOfVillage as boolean,
    includeElder: o.includeElder as boolean,
    includeBigBadWolf: o.includeBigBadWolf as boolean,
    includeWhiteWerewolf: o.includeWhiteWerewolf as boolean,
    includePiedPiper: o.includePiedPiper as boolean,
    includeRustySwordKnight: o.includeRustySwordKnight as boolean,
    includeScapegoat: o.includeScapegoat as boolean,
    includeWildChild: o.includeWildChild as boolean,
    includeFox: o.includeFox as boolean,
    includePyromaniac: o.includePyromaniac as boolean,
    includeBearTamer: o.includeBearTamer as boolean,
    includeTwoSisters: o.includeTwoSisters as boolean,
    includeThreeBrothers: o.includeThreeBrothers as boolean,
    includeDocteur: o.includeDocteur as boolean,
    includeNecromancer: o.includeNecromancer as boolean,
    includeSectarian: o.includeSectarian as boolean,
    includeDevotedServant: o.includeDevotedServant as boolean,
    includeInfectFather: o.includeInfectFather as boolean,
    includeDogWolf: o.includeDogWolf as boolean,
    includeDictateur: o.includeDictateur as boolean,
    includeHackeur: o.includeHackeur as boolean,
    tiebreakerRandom: o.tiebreakerRandom as boolean,
    skipFirstNightKill: o.skipFirstNightKill as boolean,
    revealDeadRoles: o.revealDeadRoles as boolean,
    darkNightMode: o.darkNightMode as boolean,
    gossipSeerMode: o.gossipSeerMode as boolean,
    tripleLoversMode: o.tripleLoversMode as boolean,
    announceNightProtection: o.announceNightProtection as boolean,
    villagerCount,
  };

  if (c.villagerCount === null) {
    c = {
      ...c,
      villagerCount: villagerCountToMatchMinPlayers(c),
    };
  }

  const fixed = fixedCompositionTotal(c);
  if (fixed !== null && fixed !== c.minPlayers) {
    return null;
  }

  return cloneCompositionConfig(c);
}
