import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import { buildAlivePlayerSelect, publicEmbed } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const WW_COLOR = 0xecf0f1;

function whiteWolfKey(channelId: string): string {
  return `${channelId}:whitewolf`;
}

/**
 * Phase du Loup-Blanc : toutes les nuits paires, il peut \u00e9liminer un loup de la meute en secret.
 */
export async function runWhiteWolfPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const wwId = session.whiteWerewolfId();
  if (!wwId) return;
  if (session.nightNumber % 2 !== 0) return;

  session.nightSubPhase = 'whitewolf';

  const wolfTargets = session
    .wolfIds()
    .filter((id) => id !== wwId);

  if (wolfTargets.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Loup-Blanc \u2014 Frappe secr\u00e8te')
    .setDescription(
      'Nuit paire : tu peux **\u00e9liminer un loup-garou** de la meute en secret (ou passer).\n\n' +
        '_Les autres loups ne sauront pas que c\u2019est toi. Annonce au lever du soleil si tu frappes._'
    )
    .setColor(WW_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:whitewolf`,
    'Tuer un loup\u2026',
    wolfTargets,
    session.labelMap(),
    new Set()
  );

  const skipRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:whitewolf:skip`)
      .setLabel('Passer')
      .setStyle(ButtonStyle.Secondary)
  );

  const ok = await sendInPlayerSecretThread(client, session, wwId, {
    content: `<@${wwId}> \u2014 **Loup-Blanc** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      skipRow,
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(whiteWolfKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked || picked === 'skip') {
    await sendInPlayerSecretThread(client, session, wwId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Loup-Blanc')
          .setDescription('Tu as pass\u00e9 ton tour \u2014 aucun loup \u00e9limin\u00e9 cette nuit.')
          .setColor(WW_COLOR),
      ],
    });
    return;
  }

  const target = session.getPlayer(picked);
  if (!target) return;

  session.pendingNightDeaths.push(picked);

  await sendInPlayerSecretThread(client, session, wwId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Loup-Blanc \u2014 Victoire')
        .setDescription(
          `Tu as \u00e9limin\u00e9 **${target.displayName}** en secret.\n\n` +
            '_Sa mort sera annonc\u00e9e au lever du soleil parmi les autres victimes._'
        )
        .setColor(WW_COLOR),
    ],
  });

  await textChannel.send({
    embeds: [
      publicEmbed(
        'Un trouble dans la meute\u2026',
        'Quelque chose d\u2019inhabituel s\u2019est pass\u00e9 cette nuit au sein des loups.'
      ).setColor(WW_COLOR),
    ],
  });
}

export function fulfillWhiteWolf(channelId: string, targetOrSkip: string): boolean {
  return fulfillPending(whiteWolfKey(channelId), targetOrSkip);
}
