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
      // Si ce joueur a \u00e9t\u00e9 pirat\u00e9 par le Hackeur : ne pas r\u00e9v\u00e9ler le r\u00f4le
      if (id === session.hackeurTargetId) {
        return `<@${id}> \u2014 _\uD83D\uDCBB pirat\u00e9 par le **Hackeur**_ (r\u00f4le masqu\u00e9)`;
      }
      if (revealRoles) {
        return `<@${id}> — **${roleLabelFr(p.role)}**`;
      }
      return `<@${id}>`;
    })
    .join('\n');
}
