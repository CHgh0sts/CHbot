import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import type { GameSession } from './GameSession';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';
import { roleLabelFr } from './composition';

const SERVANT_COLOR = 0xf39c12;
const SERVANT_DECISION_MS = 45_000;

function servantKey(channelId: string): string {
  return `${channelId}:devotedservant`;
}

/**
 * Appel\u00e9 apr\u00e8s la d\u00e9signation de la victime du vote du village.
 * La Servante D\u00e9vou\u00e9e peut choisir de **prendre la place** de la victime.
 *
 * - Si elle accepte : la victime est \u00e9limin\u00e9e, la Servante prend son r\u00f4le et reste en vie.
 * - Si elle refuse ou ne r\u00e9pond pas : le vote se d\u00e9roule normalement.
 *
 * @returns `true` si la Servante a intercept\u00e9 l\u2019\u00e9limination.
 */
export async function runDevotedServantChoice(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  victimId: string
): Promise<boolean> {
  const servantId = session.devotedServantId();
  if (!servantId || session.devotedServantUsed) return false;
  if (servantId === victimId) return false; // elle est elle-m\u00eame la victime : ne s\u2019applique pas

  const victim = session.getPlayer(victimId);
  if (!victim || !victim.alive) return false;

  const embed = new EmbedBuilder()
    .setTitle('\uD83E\uDDD5 Servante D\u00e9vou\u00e9e \u2014 Prendre sa place ?')
    .setDescription(
      `Le village a vot\u00e9 l\u2019\u00e9limination de **${victim.displayName}**.\n\n` +
        'Voulez-vous **prendre sa place** ?\n\n' +
        `\u2022 **Oui** \u2014 vous vous d\u00e9voilez, prenez le r\u00f4le **${roleLabelFr(victim.role)}** et continuez la partie. ${victim.displayName} est quand m\u00eame \u00e9limin\u00e9(e).\n` +
        '\u2022 **Non** \u2014 le vote s\u2019applique normalement.\n\n' +
        `_Vous avez **45 secondes** pour d\u00e9cider. Sans r\u00e9ponse, vous passez votre tour._`
    )
    .setColor(SERVANT_COLOR);

  const yesBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:devotedservant:yes`)
    .setLabel('\uD83E\uDDD5 Prendre sa place')
    .setStyle(ButtonStyle.Primary);

  const noBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:devotedservant:no`)
    .setLabel('\u274C Laisser le vote s\u2019appliquer')
    .setStyle(ButtonStyle.Secondary);

  const ok = await sendInPlayerSecretThread(client, session, servantId, {
    content: `<@${servantId}> \u2014 **Servante D\u00e9vou\u00e9e** : d\u00e9cidez vite !`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(yesBtn, noBtn),
    ],
  });
  if (!ok) return false;

  const answer = await createWaiter(servantKey(session.textChannelId), SERVANT_DECISION_MS);
  if (!answer || answer !== 'yes') return false;

  // La Servante prend la place
  session.devotedServantUsed = true;
  const servant = session.getPlayer(servantId);
  if (!servant) return false;

  const newRole = victim.role;
  servant.role = newRole;

  await textChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('\uD83E\uDDD5 La Servante D\u00e9vou\u00e9e intervient !')
        .setDescription(
          `**${servant.displayName}** \u00e9tait la **Servante D\u00e9vou\u00e9e** !\n\n` +
            `Elle se d\u00e9voile et prend le r\u00f4le de **${victim.displayName}** \u2014 **${roleLabelFr(newRole)}** \u2014 et continuera la partie avec ce r\u00f4le et ses pouvoirs.\n\n` +
            `**${victim.displayName}** est tout de m\u00eame \u00e9limin\u00e9(e).`
        )
        .setColor(SERVANT_COLOR),
    ],
  });

  return true;
}

export function fulfillDevotedServant(channelId: string, answer: string): boolean {
  return fulfillPending(servantKey(channelId), answer);
}
