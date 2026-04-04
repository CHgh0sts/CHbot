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

const BBW_COLOR = 0x6c3483;

function bigBadWolfKey(channelId: string): string {
  return `${channelId}:bigbadwolf`;
}

/**
 * Phase du Grand Méchant Loup : après le vote de meute, il peut tuer un joueur
 * supplémentaire tant qu'aucun loup n'est mort.
 */
export async function runBigBadWolfPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const bbwId = session.bigBadWolfId();
  if (!bbwId) return;

  if (session.anyWolfEverDied()) return;

  session.nightSubPhase = 'bigbadwolf';

  const wolfVictim = session.wolfTargetId;
  const targets = session
    .aliveIds()
    .filter(
      (id) =>
        !session.isWolfRole(session.getPlayer(id)?.role ?? ('' as never)) &&
        id !== wolfVictim
    );

  if (targets.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Grand M\u00e9chant Loup \u2014 Extra-kill')
    .setDescription(
      'Aucun loup n\u2019est mort : tu peux **d\u00e9vorer un joueur suppl\u00e9mentaire** cette nuit.\n\n' +
        '_Ce joueur est diff\u00e9rent de la cible de la meute. Les victimes seront annonc\u00e9es ensemble au lever du soleil._\n\n' +
        'Tu peux aussi **passer** : rien de plus cette nuit.'
    )
    .setColor(BBW_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:bigbadwolf`,
    'D\u00e9vorer\u2026',
    targets,
    session.labelMap(),
    new Set()
  );

  const skipRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:bigbadwolf:skip`)
      .setLabel('Passer')
      .setStyle(ButtonStyle.Secondary)
  );

  const ok = await sendInPlayerSecretThread(client, session, bbwId, {
    content: `<@${bbwId}> \u2014 **Grand M\u00e9chant Loup** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      skipRow,
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(bigBadWolfKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked || picked === 'skip') {
    await sendInPlayerSecretThread(client, session, bbwId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Grand M\u00e9chant Loup')
          .setDescription('Tu as pass\u00e9 ton tour \u2014 aucun joueur suppl\u00e9mentaire ce soir.')
          .setColor(BBW_COLOR),
      ],
    });
    return;
  }

  const target = session.getPlayer(picked);
  if (!target) return;

  session.pendingNightDeaths.push(picked);

  await sendInPlayerSecretThread(client, session, bbwId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Grand M\u00e9chant Loup \u2014 Victoire')
        .setDescription(
          `Tu as d\u00e9vor\u00e9 **${target.displayName}** en secret.\n\n` +
            '_Les deux victimes seront annonc\u00e9es ensemble au lever du soleil._'
        )
        .setColor(BBW_COLOR),
    ],
  });

  await textChannel.send({
    embeds: [
      publicEmbed(
        'Une pr\u00e9sence s\u2019agite dans la nuit\u2026',
        'Une ombre f\u00e9roce r\u00f4de dans le village. Le calme apparent cache peut-\u00eatre plus d\u2019un pr\u00e9dateur ce soir.'
      ).setColor(BBW_COLOR),
    ],
  });
}

export function fulfillBigBadWolf(channelId: string, targetOrSkip: string): boolean {
  return fulfillPending(bigBadWolfKey(channelId), targetOrSkip);
}
