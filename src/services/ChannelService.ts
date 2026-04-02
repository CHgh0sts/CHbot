import type {
  Guild,
  GuildChannel,
  GuildChannelCreateOptions,
  OverwriteResolvable,
  StageChannel,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import {
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  StageInstancePrivacyLevel,
} from 'discord.js';
import type { GameSession } from '../game/GameSession';

/** Préfixe des salons créés par `/lg-init` (scène + fils techniques). */
export const LG_GAME_CHANNEL_PREFIX = 'lg-';

/** Suffixe du salon **texte caché** servant de parent aux fils privés (Discord n’autorise pas fils privés sur la scène seule). */
export const LG_THREAD_PARENT_SUFFIX = '-fils';

const BOT_REQUIRED = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.MuteMembers,
]);

function cloneOverwritesFromSource(
  guild: Guild,
  sourceChannel: GuildChannel
): OverwriteResolvable[] {
  const bot = guild.members.me;
  const list: OverwriteResolvable[] = [];
  let seenBot = false;

  for (const ow of sourceChannel.permissionOverwrites.cache.values()) {
    if (bot && ow.id === bot.id) {
      seenBot = true;
      const allow = new PermissionsBitField(ow.allow);
      allow.add(BOT_REQUIRED);
      list.push({
        id: ow.id,
        type: ow.type,
        allow: allow.bitfield,
        deny: ow.deny.bitfield,
      });
    } else {
      list.push({
        id: ow.id,
        type: ow.type,
        allow: ow.allow.bitfield,
        deny: ow.deny.bitfield,
      });
    }
  }

  if (bot && !seenBot) {
    list.push({
      id: bot.id,
      allow: BOT_REQUIRED,
      deny: 0n,
    });
  }

  return list;
}

export type GamePartyChannels = {
  stage: StageChannel;
  threadParent: TextChannel;
};

/**
 * Crée une **Scène** (conférence) + un salon texte technique pour les fils privés.
 * Les annonces publiques vont dans le **chat de la scène** ; les fils restent sur le salon `-fils` (masqué pour @everyone).
 */
export async function createGamePartyChannels(
  guild: Guild,
  permsSourceChannel: GuildChannel,
  name: string
): Promise<GamePartyChannels> {
  const safeName = name.slice(0, 70) || 'partie';
  const parentCategoryId = permsSourceChannel.parentId;

  if (permsSourceChannel.permissionOverwrites.cache.size === 0) {
    await permsSourceChannel.fetch().catch(() => undefined);
  }

  const cloned = cloneOverwritesFromSource(guild, permsSourceChannel);
  const baseSlug = `${LG_GAME_CHANNEL_PREFIX}${safeName}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 55);

  const stageName = baseSlug.slice(0, 90);
  const threadParentName =
    `${baseSlug}${LG_THREAD_PARENT_SUFFIX}`.slice(0, 90);

  const stageOpts: GuildChannelCreateOptions = {
    name: stageName,
    type: ChannelType.GuildStageVoice,
    parent: parentCategoryId ?? undefined,
  };
  if (cloned.length > 0) stageOpts.permissionOverwrites = cloned;

  const stage = (await guild.channels.create(
    stageOpts
  )) as unknown as StageChannel;

  const bot = guild.members.me;
  if (bot) {
    await stage.permissionOverwrites.edit(bot, {
      ViewChannel: true,
      Connect: true,
      SendMessages: true,
      ManageMessages: true,
      ReadMessageHistory: true,
      EmbedLinks: true,
      AttachFiles: true,
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      RequestToSpeak: true,
      CreatePrivateThreads: true,
      SendMessagesInThreads: true,
    });
  }

  // La scène ne doit pas hériter des refus @everyone du salon source (ex. salon staff) :
  // tout membre du serveur doit voir le salon, lire le chat de la scène et se connecter en auditeur.
  await stage.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: true,
    Connect: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AddReactions: true,
  });

  await stage.createStageInstance({
    topic:
      'Loup-Garou — entre sur la **Scène** (vocal), puis clique sur **Rejoindre** dans ce chat.',
    privacyLevel: StageInstancePrivacyLevel.GuildOnly,
  });

  const threadOpts: GuildChannelCreateOptions = {
    name: threadParentName,
    type: ChannelType.GuildText,
    parent: parentCategoryId ?? undefined,
  };
  if (cloned.length > 0) threadOpts.permissionOverwrites = cloned;

  const threadParent = (await guild.channels.create(threadOpts)) as TextChannel;

  if (bot) {
    await threadParent.permissionOverwrites.edit(bot, {
      ViewChannel: true,
      SendMessages: true,
      ManageMessages: true,
      ManageThreads: true,
      ReadMessageHistory: true,
      EmbedLinks: true,
      AttachFiles: true,
      CreatePrivateThreads: true,
      SendMessagesInThreads: true,
    });
  }

  await threadParent.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: false,
  });

  return { stage, threadParent };
}

export async function grantPlayerGameAccess(
  stage: StageChannel,
  threadParent: TextChannel,
  userId: string
): Promise<void> {
  await stage.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    Connect: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });
  await threadParent.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    SendMessagesInThreads: true,
  });
}

export async function revokePlayerGameAccess(
  stage: StageChannel,
  threadParent: TextChannel,
  userId: string
): Promise<void> {
  await stage.permissionOverwrites.delete(userId).catch(() => undefined);
  await threadParent.permissionOverwrites.delete(userId).catch(() => undefined);
}

export async function fetchPartyChannels(
  guild: Guild,
  session: Pick<GameSession, 'textChannelId' | 'threadParentChannelId'>
): Promise<{ stage: StageChannel | null; threadParent: TextChannel | null }> {
  const s = await guild.channels.fetch(session.textChannelId).catch(() => null);
  const t = await guild.channels
    .fetch(session.threadParentChannelId)
    .catch(() => null);
  return {
    stage: s?.type === ChannelType.GuildStageVoice ? (s as StageChannel) : null,
    threadParent: t?.type === ChannelType.GuildText ? (t as TextChannel) : null,
  };
}

export async function deleteGamePartyChannels(
  threadParent: TextChannel,
  stage: StageChannel,
  reason = 'Fin de partie Loup-Garou'
): Promise<void> {
  await threadParent.delete(reason).catch(() => undefined);
  await stage.delete(reason).catch(() => undefined);
}

/** @deprecated Utiliser deleteGamePartyChannels — conservé pour appels isolés. */
export async function deleteGameTextChannel(
  textChannel: TextChannel,
  reason = 'Fin de partie LG'
): Promise<void> {
  await textChannel.delete(reason);
}

export async function resolveVoiceChannel(
  guild: Guild,
  voiceChannelId: string | null
): Promise<VoiceChannel | null> {
  if (!voiceChannelId) return null;
  const ch = await guild.channels.fetch(voiceChannelId).catch(() => null);
  if (!ch || !ch.isVoiceBased()) return null;
  return ch as VoiceChannel;
}
