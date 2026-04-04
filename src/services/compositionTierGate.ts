import type { CompositionConfig } from '../game/composition';
import type { LgConfigOptions } from '../types/lgConfig';
import { statsApiEnabled } from '../config';
import {
  fetchCompositionRules,
  fetchUserTier,
  userTierMeetsMin,
} from './StatsApiService';

const GATED_KEYS: (keyof CompositionConfig & keyof LgConfigOptions)[] = [
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
  'revealDeadRoles',
  'darkNightMode',
  'gossipSeerMode',
  'tripleLoversMode',
  'announceNightProtection',
];

/**
 * Si une option booléenne passe à `true` alors qu’elle était `false`, vérifie le palier du joueur.
 * @returns message d’erreur à afficher, ou `null` si OK / API désactivée
 */
export async function checkCompositionTierGate(
  discordUserId: string,
  options: LgConfigOptions,
  current: CompositionConfig
): Promise<string | null> {
  if (!statsApiEnabled()) return null;

  const rules = await fetchCompositionRules();
  const tier = await fetchUserTier(discordUserId);

  for (const key of GATED_KEYS) {
    const next = options[key];
    if (next !== true) continue;
    const prev = current[key] as boolean;
    if (prev === true) continue;
    const minTier = rules[key] ?? 'FREE';
    if (!userTierMeetsMin(tier, minTier)) {
      return (
        `Tu ne peux pas activer **${key}** : palier minimum **${minTier}** requis (tu es **${tier}**). ` +
        `Passe sur le site ou contact un administrateur.`
      );
    }
  }

  return null;
}
