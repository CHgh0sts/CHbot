import type { GameSession } from './GameSession';

/**
 * Résout un pseudo ou mention vers un userId parmi `allowedIds`.
 */
export function resolvePlayerTargetByQuery(
  query: string,
  session: GameSession,
  allowedIds: Set<string>
): string | null {
  const q = query.trim();
  if (!q) return null;
  const mention = q.match(/^<@!?(\d+)>$/);
  if (mention) {
    const id = mention[1]!;
    return allowedIds.has(id) ? id : null;
  }
  const lower = q.toLowerCase();
  const ids = [...allowedIds];
  for (const id of ids) {
    const name = session.getPlayer(id)?.displayName ?? '';
    if (name.toLowerCase() === lower) return id;
  }
  for (const id of ids) {
    const name = session.getPlayer(id)?.displayName ?? '';
    if (name.toLowerCase().includes(lower)) return id;
  }
  return null;
}
