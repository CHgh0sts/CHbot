import { roleLabelFr } from './composition';
import type { GameSession } from './GameSession';

/**
 * Lignes pour annonce publique de morts.
 * À appeler **avant** `session.kill` si tu veux être sûr que l’état « vivant » est encore cohérent (jour).
 */
export function formatDeathAnnounces(
  session: GameSession,
  userIds: string[],
  revealRoles: boolean
): string {
  return userIds
    .map((id) => {
      const p = session.getPlayer(id);
      if (!p) return `<@${id}>`;
      if (revealRoles) {
        return `<@${id}> — **${roleLabelFr(p.role)}**`;
      }
      return `<@${id}>`;
    })
    .join('\n');
}
