import { ChannelType, type Client, EmbedBuilder, ThreadAutoArchiveDuration } from 'discord.js';
import type { TextChannel } from 'discord.js';
import type { GameSession } from './GameSession';

const SISTERS_COLOR = 0xff69b4;
const BROTHERS_COLOR = 0x3498db;

async function fetchThreadParent(client: Client, session: GameSession): Promise<TextChannel | null> {
  const ch = await client.channels.fetch(session.threadParentChannelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return null;
  return ch as TextChannel;
}

/**
 * Nuit 1 : cr\u00e9e le fil partag\u00e9 des Deux S\u0153urs et les invite.
 */
export async function createSistersThread(client: Client, session: GameSession): Promise<void> {
  const ids = session.sisterIds();
  if (ids.length < 2) return;

  const parent = await fetchThreadParent(client, session);
  if (!parent) return;

  try {
    const thread = await parent.threads.create({
      name: '\ud83d\udc6f\u200d\u2640\ufe0f Les Deux S\u0153urs',
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou \u2014 fil des Deux S\u0153urs',
    });

    for (const id of ids) {
      await thread.members.add(id);
    }

    session.sistersThreadId = thread.id;

    const names = ids.map((id) => {
      const p = session.getPlayer(id);
      return p?.displayName ?? id;
    });

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\ud83d\udc6f\u200d\u2640\ufe0f Les Deux S\u0153urs se reconnaissent\u2026')
          .setDescription(
            `Cette nuit, **${names[0]}** et **${names[1]}** \u00e9changent un regard complice.\n\n` +
              'Vous \u00eates les **Deux S\u0153urs** ! Vous vous connaissez et pouvez communiquer ici tout au long de la partie.\n\n' +
              '_Vous gagnez avec le **camp Village**._'
          )
          .setColor(SISTERS_COLOR),
      ],
    });
  } catch (e) {
    console.error('[Siblings] cr\u00e9ation fil S\u0153urs impossible', e);
  }
}

/**
 * Nuit 1 : cr\u00e9e le fil partag\u00e9 des Trois Fr\u00e8res et les invite.
 */
export async function createBrothersThread(client: Client, session: GameSession): Promise<void> {
  const ids = session.brotherIds();
  if (ids.length < 3) return;

  const parent = await fetchThreadParent(client, session);
  if (!parent) return;

  try {
    const thread = await parent.threads.create({
      name: '\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc66 Les Trois Fr\u00e8res',
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou \u2014 fil des Trois Fr\u00e8res',
    });

    for (const id of ids) {
      await thread.members.add(id);
    }

    session.brothersThreadId = thread.id;

    const names = ids.map((id) => {
      const p = session.getPlayer(id);
      return p?.displayName ?? id;
    });

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc66 Les Trois Fr\u00e8res se reconnaissent\u2026')
          .setDescription(
            `Cette nuit, **${names[0]}**, **${names[1]}** et **${names[2]}** \u00e9changent un signe de t\u00eate discret.\n\n` +
              'Vous \u00eates les **Trois Fr\u00e8res** ! Vous vous connaissez et pouvez communiquer ici tout au long de la partie.\n\n' +
              '_Vous gagnez avec le **camp Village**._'
          )
          .setColor(BROTHERS_COLOR),
      ],
    });
  } catch (e) {
    console.error('[Siblings] cr\u00e9ation fil Fr\u00e8res impossible', e);
  }
}
