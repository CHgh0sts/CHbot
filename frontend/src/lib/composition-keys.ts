/** Clés alignées sur `CompositionConfig` du bot (lg-config). */
export const COMPOSITION_KEYS = [
  'includeSeer',
  'includeWitch',
  'includeHunter',
  'includeCupid',
  'includeGuard',
  'includeThief',
  'includeAngel',
  'includeLittleGirl',
  'revealDeadRoles',
  'darkNightMode',
  'gossipSeerMode',
  'tripleLoversMode',
  'announceNightProtection',
] as const;

export type CompositionKey = (typeof COMPOSITION_KEYS)[number];

export function isCompositionKey(k: string): k is CompositionKey {
  return (COMPOSITION_KEYS as readonly string[]).includes(k);
}
