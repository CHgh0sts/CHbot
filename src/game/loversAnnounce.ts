import type { AttachmentBuilder, GuildTextBasedChannel } from 'discord.js';
import { shouldRevealDeadRoles, roleLabelFr } from './composition';
import { formatDeathAnnounces } from './deathAnnounce';
import type { GameSession } from './GameSession';
import { embedWithRoleCardThumbnail } from './roleCards';
import { roleCardSource } from '../utils/roleCardRemoteUrl';
import { publicEmbed } from '../services/MessagingService';

/**
 * @param firstDeadId — joueur mort en premier (celui dont la mort déclenche le chagrin)
 * @param griefVictimId — joueur qui meurt de chagrin d’amour
 */
export async function announceLoverGriefPublic(
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  firstDeadId: string,
  griefVictimId: string
): Promise<void> {
  const reveal = shouldRevealDeadRoles(session.compositionConfig);
  const first = session.getPlayer(firstDeadId);
  const grief = session.getPlayer(griefVictimId);
  const n1 = first?.displayName ?? `<@${firstDeadId}>`;
  const n2 = grief?.displayName ?? `<@${griefVictimId}>`;

  const desc =
    reveal && grief
      ? `**${n1}** étant mort(e), **${n2}** meurt de **chagrin d’amour** — **${n2}** était **${roleLabelFr(grief.role)}**.\n\n_Détail :_\n${formatDeathAnnounces(session, [griefVictimId], true)}\n\n_Suite à la mort de :_\n${formatDeathAnnounces(session, [firstDeadId], true)}`
      : `**${n1}** étant mort(e), **${n2}** meurt de **chagrin d’amour**.`;

  let embed = publicEmbed('Amoureux — chagrin', desc).setColor(0xff69b4);
  let files: AttachmentBuilder[] = [];
  if (reveal && grief) {
    const t = embedWithRoleCardThumbnail(
      embed,
      grief.role,
      roleCardSource(session.presetPublicCode, grief.role)
    );
    embed = t.embed;
    files = t.files;
  }

  await textChannel.send({ embeds: [embed], files });
}
