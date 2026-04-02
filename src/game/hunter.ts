import type {
  AttachmentBuilder,
  Client,
  GuildTextBasedChannel,
} from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import { shouldRevealDeadRoles } from './composition';
import { Role } from '../types';
import type { GameSession } from './GameSession';
import { formatDeathAnnounces } from './deathAnnounce';
import { embedWithRoleCardThumbnail } from './roleCards';
import { roleCardSource } from '../utils/roleCardRemoteUrl';
import {
  buildAlivePlayerSelect,
  publicEmbed,
} from '../services/MessagingService';
import { sendComponentsToPlayerThread } from '../services/SecretThreadService';

export function hunterWaitKey(channelId: string, hunterId: string): string {
  return `${channelId}:hunter:${hunterId}`;
}

/** Salon public : annonce l’élimination du chasseur avant le menu dans son fil privé. */
export async function announceHunterDeathPublic(
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  hunterId: string
): Promise<void> {
  const reveal = shouldRevealDeadRoles(session.compositionConfig);
  const desc = reveal
    ? `${formatDeathAnnounces(session, [hunterId], true)}\n\n_Le **Chasseur** fait **son choix** dans **son fil privé** — le **tir** sera annoncé ici juste après, puis le récap des victimes._`
    : `<@${hunterId}> **est éliminé.**\n\n_S’il peut tirer, il choisit dans **son fil privé** ; le résultat sera annoncé ici ensuite._`;
  let embed = publicEmbed('Élimination', desc).setColor(0xe67e22);
  let files: AttachmentBuilder[] = [];
  if (reveal) {
    const r = session.getPlayer(hunterId)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(
        embed,
        r,
        roleCardSource(session.presetPublicCode, r)
      );
      embed = t.embed;
      files = t.files;
    }
  }
  await textChannel.send({ embeds: [embed], files });
}

/** Après le choix dans le fil privé : annonce publique de la victime du Chasseur. */
export async function announceHunterShotPublic(
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  hunterId: string,
  targetId: string
): Promise<void> {
  const reveal = shouldRevealDeadRoles(session.compositionConfig);
  const desc = reveal
    ? `<@${hunterId}> (**Chasseur**) emmène avec lui :\n${formatDeathAnnounces(session, [targetId], true)}`
    : `<@${targetId}> est **emporté** par la dernière volonté du **Chasseur**.`;
  let embed = publicEmbed('Tir du Chasseur', desc).setColor(0xe67e22);
  let files: AttachmentBuilder[] = [];
  if (reveal) {
    const r = session.getPlayer(targetId)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(
        embed,
        r,
        roleCardSource(session.presetPublicCode, r)
      );
      embed = t.embed;
      files = t.files;
    }
  }
  await textChannel.send({ embeds: [embed], files });
}

export async function runHunterShoot(
  client: Client,
  session: GameSession,
  hunterId: string,
  textChannel: GuildTextBasedChannel
): Promise<string | null> {
  const hunter = session.getPlayer(hunterId);
  if (!hunter || hunter.role !== Role.Hunter) return null;

  const alive = session.aliveIds().filter((id) => id !== hunterId);
  if (alive.length === 0) {
    await textChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Dernière volonté')
          .setDescription(
            'Aucune cible disponible pour le tir — la phase est ignorée.'
          )
          .setColor(0xed4245),
      ],
    });
    return null;
  }

  const key = hunterWaitKey(session.textChannelId, hunterId);
  const reveal = shouldRevealDeadRoles(session.compositionConfig);
  const embed = new EmbedBuilder()
    .setTitle('Dernière volonté — Chasseur')
    .setDescription(
      reveal
        ? 'Le village vient d’être prévenu. **Choisis un joueur vivant** ci-dessous : ton tir sera **annoncé tout de suite** dans le salon principal.'
        : 'Tu es le **Chasseur**, tu es **éliminé**. **Choisis un joueur vivant** ci-dessous — le résultat sera affiché dans le salon de partie.'
    )
    .setColor(0xe67e22);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:hunter`,
    'Tire sur…',
    alive,
    session.labelMap(),
    new Set([hunterId])
  );

    const ok = await sendComponentsToPlayerThread(
      client,
      session,
      hunterId,
    embed,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
  );

  if (!ok) {
    await textChannel.send({
      content:
        '**Chasseur** : impossible d’envoyer le tir dans le fil prévu — tir ignoré.',
    });
    return null;
  }

  const choice = await createWaiter(key, NIGHT_ACTION_MS);
  if (!choice) {
    await textChannel.send({
      content: '**Chasseur** : temps écoulé — aucun tir.',
    });
    return null;
  }
  return choice;
}

export function fulfillHunterSelect(
  channelId: string,
  hunterId: string,
  targetId: string
): boolean {
  return fulfillPending(hunterWaitKey(channelId, hunterId), targetId);
}
