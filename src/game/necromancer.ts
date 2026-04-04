import {
  ChannelType,
  type Client,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import type { GameSession } from './GameSession';
import { roleLabelFr } from './composition';

const NECRO_COLOR = 0x6c3483;

/** Nuit 1 : cr\u00e9e le fil \u00ab\u202fAntre des Morts\u202f\u00bb et invite le N\u00e9cromancien. */
export async function initNecromancerThread(
  client: Client,
  session: GameSession
): Promise<void> {
  const necroId = session.necromancerId();
  if (!necroId) return;
  if (session.necromancerThreadId) return;

  const gameTextChannel = await client.channels
    .fetch(session.threadParentChannelId)
    .catch(() => null);
  if (!gameTextChannel || gameTextChannel.type !== ChannelType.GuildText) return;

  try {
    const thread = await gameTextChannel.threads.create({
      name: '\u{1F480} Antre des Morts',
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou \u2014 Fil N\u00e9cromancien',
    });

    await thread.members.add(necroId).catch(() => null);
    session.necromancerThreadId = thread.id;

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\u{1F480} Antre des Morts \u2014 N\u00e9cromancien')
          .setDescription(
            `<@${necroId}> \u2014 Bienvenue dans votre **Antre des Morts**.\n\n` +
              'Chaque fois qu\u2019un joueur meurt (nuit ou vote), son **esprit** sera invit\u00e9 ici. Vous pourrez \u00e9changer avec eux \u2014 quelle que soit leur appartenance de camp.\n\n' +
              '_Les morts ne peuvent pas voter ni utiliser de pouvoirs. Ils peuvent uniquement \u00e9crire dans ce fil._'
          )
          .setColor(NECRO_COLOR),
      ],
    });
  } catch (e) {
    console.error('[Necromancer] cr\u00e9ation fil impossible', e);
  }
}

/**
 * Appel\u00e9 d\u00e8s qu\u2019un joueur meurt.
 * Invite l\u2019esprit du d\u00e9funt dans le fil et l\u2019informe.
 */
export async function addDeadToNecromancerThread(
  client: Client,
  session: GameSession,
  deadUserId: string
): Promise<void> {
  if (!session.necromancerThreadId) return;
  const necroId = session.necromancerId();
  if (!necroId) return;

  const thread = await client.channels
    .fetch(session.necromancerThreadId)
    .catch(() => null);
  if (!thread?.isThread()) return;

  const player = session.getPlayer(deadUserId);
  if (!player) return;

  await thread.members.add(deadUserId).catch(() => null);

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('\u{1F480} Un nouvel esprit arrive\u2026')
        .setDescription(
          `**${player.displayName}** (<@${deadUserId}>) vient de mourir.\n` +
            `\u2666\uFE0F Son r\u00f4le \u00e9tait : **${roleLabelFr(player.role)}**\n\n` +
            `_<@${deadUserId}>, vous pouvez parler ici avec le N\u00e9cromancien. Vous ne pouvez pas voter ni utiliser de pouvoirs \u2014 uniquement discuter._`
        )
        .setColor(NECRO_COLOR),
    ],
  });
}
