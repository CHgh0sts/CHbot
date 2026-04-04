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

const RAVEN_COLOR = 0x2c2c54;

function ravenKey(channelId: string): string {
  return `${channelId}:raven`;
}

export async function runRavenPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const ravenId = session.ravenId();
  if (!ravenId) return;
  if (session.elderCursed) return;

  session.nightSubPhase = 'raven';

  const targets = session.aliveIds().filter((id) => id !== ravenId);
  if (targets.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Corbeau \u2014 Nuit')
    .setDescription(
      'D\u00e9signe un joueur vivant \u00e0 **marquer** cette nuit.\n\n' +
        'Demain, lors du vote du village, ce joueur recevra **+2 votes** suppl\u00e9mentaires contre lui.\n' +
        'Le salon public annoncera qu\'un joueur a \u00e9t\u00e9 marqu\u00e9, **sans** r\u00e9v\u00e9ler ton identit\u00e9.\n\n' +
        '_Tu peux aussi passer ton tour : rien ne se passera._'
    )
    .setColor(RAVEN_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:raven`,
    'Marquer\u2026',
    targets,
    session.labelMap(),
    new Set([ravenId])
  );

  const skipRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:raven:skip`)
      .setLabel('Passer mon tour')
      .setStyle(ButtonStyle.Secondary)
  );

  const ok = await sendInPlayerSecretThread(client, session, ravenId, {
    content: `<@${ravenId}> \u2014 **R\u00e9ponds ici** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      skipRow,
    ],
  });

  if (!ok) {
    await textChannel.send({
      content: '**Corbeau** : impossible d\'envoyer l\'action dans le fil \u2014 tour ignor\u00e9.',
    });
    return;
  }

  const picked = await createWaiter(ravenKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked || picked === 'skip') {
    await sendInPlayerSecretThread(client, session, ravenId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Corbeau')
          .setDescription('Tu as pass\u00e9 ton tour \u2014 aucun joueur n\'est marqu\u00e9 cette nuit.')
          .setColor(RAVEN_COLOR),
      ],
    });
    return;
  }

  const target = session.getPlayer(picked);
  if (!target) return;

  session.ravenTargetId = picked;

  await sendInPlayerSecretThread(client, session, ravenId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Corbeau \u2014 Marquage')
        .setDescription(
          `Tu as marqu\u00e9 **${target.displayName}**.\n\n` +
            'Lors du prochain vote du village, ce joueur recevra **+2 votes** suppl\u00e9mentaires.'
        )
        .setColor(RAVEN_COLOR),
    ],
  });

  await textChannel.send({
    embeds: [
      publicEmbed(
        'Le Corbeau a parl\u00e9\u2026',
        'Un joueur a \u00e9t\u00e9 **marqu\u00e9** cette nuit par le Corbeau. Demain, ce joueur aura **+2 votes** suppl\u00e9mentaires lors du vote du village.'
      ).setColor(RAVEN_COLOR),
    ],
  });
}

export function fulfillRaven(channelId: string, targetOrSkip: string): boolean {
  return fulfillPending(ravenKey(channelId), targetOrSkip);
}
