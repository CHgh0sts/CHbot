import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import { buildAlivePlayerSelect, publicEmbed } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const PP_COLOR = 0xe91e63;

function piedPiperKey(channelId: string): string {
  return `${channelId}:piedpiper`;
}

/**
 * Phase du Joueur de Fl\u00fbte : ensorcelle 2 joueurs vivants non encore ensorcel\u00e9s.
 */
export async function runPiedPiperPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const piperId = session.piedPiperId();
  if (!piperId) return;

  session.nightSubPhase = 'piedpiper';

  const targets = session
    .aliveIds()
    .filter(
      (id) => id !== piperId && !session.enchantedPlayerIds.has(id)
    );

  if (targets.length === 0) {
    return;
  }

  const enchantCount = Math.min(2, targets.length);

  const embed = new EmbedBuilder()
    .setTitle('Joueur de Fl\u00fbte \u2014 Ensorcellem ent')
    .setDescription(
      `Choisis **${enchantCount === 1 ? '1 joueur' : '2 joueurs'}** \u00e0 ensorceler (ils ne se savent pas ensorcel\u00e9s).\n\n` +
        `**D\u00e9j\u00e0 ensorcel\u00e9s** : ${session.enchantedPlayerIds.size === 0 ? '_aucun_' : `${session.enchantedPlayerIds.size} joueur(s)`}\n\n` +
        '_Tu gagnes quand **tous les survivants** (sauf toi) sont ensorcel\u00e9s._'
    )
    .setColor(PP_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:piedpiper`,
    'Ensorceler\u2026',
    targets,
    session.labelMap(),
    new Set()
  );

  if (enchantCount === 2) {
    (menu as import('discord.js').StringSelectMenuBuilder)
      .setMinValues(1)
      .setMaxValues(2);
  }

  const ok = await sendInPlayerSecretThread(client, session, piperId, {
    content: `<@${piperId}> \u2014 **Joueur de Fl\u00fbte** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(piedPiperKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked) {
    await sendInPlayerSecretThread(client, session, piperId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Joueur de Fl\u00fbte')
          .setDescription('Temps \u00e9coul\u00e9 \u2014 aucun joueur ensorcel\u00e9 cette nuit.')
          .setColor(PP_COLOR),
      ],
    });
    return;
  }

  const ids = picked.split(',').filter(Boolean);
  for (const id of ids) {
    session.enchantedPlayerIds.add(id);
  }

  const names = ids
    .map((id) => session.getPlayer(id)?.displayName ?? `<@${id}>`)
    .join(', ');

  await sendInPlayerSecretThread(client, session, piperId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Joueur de Fl\u00fbte \u2014 Ensorcellem ent')
        .setDescription(
          `Tu as ensorcel\u00e9 : **${names}**.\n\n` +
            `**Total ensorcel\u00e9s** : ${session.enchantedPlayerIds.size} joueur(s).`
        )
        .setColor(PP_COLOR),
    ],
  });

  await textChannel.send({
    embeds: [
      publicEmbed(
        'Une m\u00e9lodie dans la nuit\u2026',
        'Une m\u00e9lodie envo\u00fbtante s\u2019\u00e9l\u00e8ve dans l\u2019obscurit\u00e9. Certains villageois semblent charmed\u00e9s.'
      ).setColor(PP_COLOR),
    ],
  });
}

export function fulfillPiedPiper(channelId: string, targetsCsv: string): boolean {
  return fulfillPending(piedPiperKey(channelId), targetsCsv);
}
