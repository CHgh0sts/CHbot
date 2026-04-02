import {
  ChannelType,
  type Guild,
  type GuildMember,
  type StageChannel,
} from 'discord.js';
import type { GameSession } from '../game/GameSession';

function stageChannelId(session: GameSession): string {
  return session.voiceChannelId ?? session.textChannelId;
}

async function fetchGameStageChannel(
  guild: Guild,
  session: GameSession
): Promise<StageChannel | null> {
  const sid = stageChannelId(session);
  const ch = await guild.channels.fetch(sid).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildStageVoice) return null;
  return ch;
}

/** Coupe le **micro serveur** de tous les connectés sur la scène (nuit : silence vocal). */
export async function serverMuteAllOnGameStage(
  guild: Guild,
  session: GameSession
): Promise<void> {
  const stage = await fetchGameStageChannel(guild, session);
  if (!stage) return;
  for (const [, member] of stage.members) {
    try {
      await member.voice.setMute(true);
    } catch (e) {
      console.warn('[stage] server mute nuit', member.id, e);
    }
  }
}

/** Réactive le micro serveur pour tous sur la scène (jour ou fin de partie). */
export async function serverUnmuteAllOnGameStage(
  guild: Guild,
  session: GameSession
): Promise<void> {
  const stage = await fetchGameStageChannel(guild, session);
  if (!stage) return;
  for (const [, member] of stage.members) {
    try {
      await member.voice.setMute(false);
    } catch (e) {
      console.warn('[stage] server unmute', member.id, e);
    }
  }
}

/** Après **Rejoindre** : place le membre sur la scène et le passe **orateur** (intervenant). */
export async function promoteJoinedPlayerToStageSpeaker(
  guild: Guild,
  session: GameSession,
  member: GuildMember | null
): Promise<void> {
  if (!member) return;
  const sid = stageChannelId(session);
  const stage = await guild.channels.fetch(sid).catch(() => null);
  if (!stage || stage.type !== ChannelType.GuildStageVoice) return;

  try {
    if (member.voice.channelId !== sid) {
      await member.voice.setChannel(sid);
    }
  } catch {
    /* permissions / pas dans un autre salon vocal */
  }

  try {
    await member.voice.setSuppressed(false);
  } catch {
    /* déjà orateur ou limite API */
  }
}

/** Joueurs **morts** : restent sur la scène en **auditeur** (micro scène coupé). */
export async function demotePlayersToStageAudience(
  guild: Guild,
  session: GameSession,
  userIds: Iterable<string>
): Promise<void> {
  const sid = stageChannelId(session);
  const stage = await guild.channels.fetch(sid).catch(() => null);
  if (!stage || stage.type !== ChannelType.GuildStageVoice) return;

  for (const uid of userIds) {
    const m = await guild.members.fetch(uid).catch(() => null);
    if (!m?.voice.channelId || m.voice.channelId !== sid) continue;
    try {
      await m.voice.setSuppressed(true);
    } catch (e) {
      console.warn('[stage] demote audience', uid, e);
    }
  }
}

/** Quitte le lobby : déconnecte du vocal de la partie si encore dessus. */
export async function disconnectLobbyPlayerFromStage(
  guild: Guild,
  session: GameSession,
  userId: string
): Promise<void> {
  const sid = stageChannelId(session);
  const m = await guild.members.fetch(userId).catch(() => null);
  if (!m?.voice.channelId || m.voice.channelId !== sid) return;
  try {
    await m.voice.disconnect();
  } catch {
    /* */
  }
}
