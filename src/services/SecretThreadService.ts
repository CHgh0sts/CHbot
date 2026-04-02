import {
  ActionRowBuilder,
  ChannelType,
  type Client,
  type EmbedBuilder,
  type MessageCreateOptions,
  type StringSelectMenuBuilder,
  ThreadAutoArchiveDuration,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js';
import type { GameSession } from '../game/GameSession';

async function fetchThreadParent(
  client: Client,
  session: GameSession
): Promise<TextChannel | null> {
  const ch = await client.channels
    .fetch(session.threadParentChannelId)
    .catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return null;
  return ch as TextChannel;
}

export async function getOrCreatePlayerSecretThread(
  client: Client,
  session: GameSession,
  userId: string,
  displayName: string
): Promise<ThreadChannel | null> {
  const existingId = session.secretThreads.get(userId);
  if (existingId) {
    const ch = await client.channels.fetch(existingId).catch(() => null);
    if (ch?.isThread()) return ch;
  }

  const gameTextChannel = await fetchThreadParent(client, session);
  if (!gameTextChannel) return null;

  const safeName = `🔒 ${displayName}`
    .replace(/[^\w\u00C0-\u024f\s\-–—]/gi, '')
    .slice(0, 90) || 'joueur';

  try {
    const thread = await gameTextChannel.threads.create({
      name: safeName,
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou — zone secrète joueur',
    });
    await thread.members.add(userId);
    session.secretThreads.set(userId, thread.id);
    return thread;
  } catch (e) {
    console.error('[SecretThread] création impossible', userId, e);
    return null;
  }
}

export async function sendInPlayerSecretThread(
  client: Client,
  session: GameSession,
  userId: string,
  payload: MessageCreateOptions
): Promise<boolean> {
  const p = session.getPlayer(userId);
  const name = p?.displayName ?? 'joueur';
  const thread = await getOrCreatePlayerSecretThread(
    client,
    session,
    userId,
    name
  );
  if (!thread) return false;
  try {
    await thread.send(payload);
    return true;
  } catch {
    return false;
  }
}

export async function sendComponentsToPlayerThread(
  client: Client,
  session: GameSession,
  userId: string,
  embed: EmbedBuilder,
  rows: ActionRowBuilder<StringSelectMenuBuilder>[],
  options?: { pingContent?: string }
): Promise<boolean> {
  const content =
    options?.pingContent ??
    `<@${userId}> — **Réponds ici** (fil privé).`;
  return sendInPlayerSecretThread(client, session, userId, {
    content,
    embeds: [embed],
    components: rows,
  });
}

export async function ensureWolfPackThread(
  client: Client,
  session: GameSession
): Promise<ThreadChannel | null> {
  if (session.wolfPackThreadId) {
    const ch = await client.channels
      .fetch(session.wolfPackThreadId)
      .catch(() => null);
    if (ch?.isThread()) return ch;
  }

  const gameTextChannel = await fetchThreadParent(client, session);
  if (!gameTextChannel) return null;

  const wolves = session.wolfIds();
  if (wolves.length === 0) return null;

  try {
    const thread = await gameTextChannel.threads.create({
      name: 'Meute — Loups-Garous',
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou — discussion / votes meute',
    });
    for (const wid of wolves) {
      await thread.members.add(wid).catch(() => undefined);
    }
    session.wolfPackThreadId = thread.id;
    await thread.send({
      content:
        wolves.map((id) => `<@${id}>`).join(' ') +
        '\n**Fil privé de la meute** — votes ci-dessous.',
    });
    return thread;
  } catch (e) {
    console.error('[SecretThread] meute impossible', e);
    return null;
  }
}

export async function syncWolfPackMembership(
  client: Client,
  session: GameSession
): Promise<void> {
  if (!session.wolfPackThreadId) return;
  const pack = await client.channels
    .fetch(session.wolfPackThreadId)
    .catch(() => null);
  if (!pack?.isThread()) return;

  const wolfSet = new Set(session.wolfIds());
  const botId = client.user?.id;

  const members = await pack.members.fetch().catch(() => null);
  if (members) {
    for (const m of members.values()) {
      if (m.id === botId) continue;
      if (!wolfSet.has(m.id)) {
        await pack.members.remove(m.id).catch(() => undefined);
      }
    }
  }
  for (const wid of wolfSet) {
    await pack.members.add(wid).catch(() => undefined);
  }
}

export async function ensureLoversThread(
  client: Client,
  session: GameSession,
  loverIds: string[]
): Promise<ThreadChannel | null> {
  if (loverIds.length < 2) return null;

  if (session.loversThreadId) {
    const ch = await client.channels
      .fetch(session.loversThreadId)
      .catch(() => null);
    if (ch?.isThread()) return ch;
  }

  const gameTextChannel = await fetchThreadParent(client, session);
  if (!gameTextChannel) return null;

  const label = loverIds
    .map((id) => (session.getPlayer(id)?.displayName ?? '?').slice(0, 18))
    .join(' · ');
  const rawName = `Amoureux — ${label}`.slice(0, 90);

  try {
    const thread = await gameTextChannel.threads.create({
      name: rawName.replace(/[^\w\u00C0-\u024f\s\-–—]/gi, '').trim() || 'amoureux',
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: 'Loup-Garou — fil des amoureux',
    });
    for (const id of loverIds) {
      await thread.members.add(id).catch(() => undefined);
    }
    session.loversThreadId = thread.id;
    return thread;
  } catch (e) {
    console.error('[SecretThread] fil amoureux impossible', e);
    return null;
  }
}
