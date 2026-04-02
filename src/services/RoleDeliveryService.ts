import { EmbedBuilder, type Client } from 'discord.js';
import { embedWithRoleCardLarge } from '../game/roleCards';
import type { GameSession } from '../game/GameSession';
import type { Role } from '../types';
import { roleCardSource } from '../utils/roleCardRemoteUrl';
import { getOrCreatePlayerSecretThread } from './SecretThreadService';

/** Envoie le rôle dans le fil privé du joueur (aucun MP). Grande carte d’image si URL / fichier. */
export async function deliverRoleToPlayer(
  client: Client,
  session: GameSession,
  userId: string,
  displayName: string,
  embed: EmbedBuilder,
  role: Role
): Promise<boolean> {
  const thread = await getOrCreatePlayerSecretThread(
    client,
    session,
    userId,
    displayName
  );
  if (!thread) return false;
  const prevId = session.privateRoleCardMessageId.get(userId);
  if (prevId) {
    await thread.messages
      .fetch(prevId)
      .then((m) => m.delete())
      .catch(() => undefined);
    session.privateRoleCardMessageId.delete(userId);
  }
  try {
    const { embed: withCard, files } = embedWithRoleCardLarge(
      EmbedBuilder.from(embed),
      role,
      roleCardSource(session.presetPublicCode, role)
    );
    const msg = await thread.send({
      content: `<@${userId}> — **Ton rôle** (visible uniquement dans ce fil).`,
      embeds: [withCard],
      files,
    });
    session.privateRoleCardMessageId.set(userId, msg.id);
    return true;
  } catch {
    return false;
  }
}
