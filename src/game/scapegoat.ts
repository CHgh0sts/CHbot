import type { Client } from 'discord.js';
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
import { buildAlivePlayerSelect } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const SG_COLOR = 0x95a5a6;
const SCAPEGOAT_CHOICE_MS = Math.min(NIGHT_ACTION_MS, 60_000);

function scapegoatChoiceKey(channelId: string): string {
  return `${channelId}:scapegoat:choice`;
}

/**
 * Apr\u00e8s que le Bouc \u00c9missaire a \u00e9t\u00e9 \u00e9limin\u00e9 lors d\u2019une \u00e9galit\u00e9, il choisit
 * quels joueurs seront **interdits de voter** lors du prochain vote du village.
 * Si temps \u00e9coul\u00e9 ou pas de s\u00e9lection, tout le monde vote normalement.
 */
export async function runScapegoatDeathChoice(
  client: Client,
  session: GameSession,
  scapegoatId: string
): Promise<void> {
  const alive = session.aliveIds();
  if (alive.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Bouc \u00c9missaire \u2014 Interdiction de vote')
    .setDescription(
      'Tu as \u00e9t\u00e9 sacrifi\u00e9·e lors de l\u2019\u00e9galit\u00e9. En compensation, **tu choisis qui NE POURRA PAS voter** lors du prochain vote du village.\n\n' +
        'S\u00e9lectionne z\u00e9ro ou plusieurs joueurs \u00e0 interdire (tu peux tout interdire ou ne rien interdire).\n\n' +
        `Tu as **${Math.floor(SCAPEGOAT_CHOICE_MS / 1000)} s** pour d\u00e9cider.`
    )
    .setColor(SG_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:scapegoat`,
    'Interdire de voter\u2026',
    alive,
    session.labelMap(),
    new Set()
  );

  (menu as StringSelectMenuBuilder).setMinValues(0).setMaxValues(alive.length);

  const skipRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:scapegoat:skip`)
      .setLabel('Tout le monde peut voter')
      .setStyle(ButtonStyle.Secondary)
  );

  const ok = await sendInPlayerSecretThread(client, session, scapegoatId, {
    content: `<@${scapegoatId}> \u2014 **Bouc \u00c9missaire** : choisis les interdits de vote.`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      skipRow,
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(scapegoatChoiceKey(session.textChannelId), SCAPEGOAT_CHOICE_MS);

  if (!picked || picked === 'skip') {
    session.scapegoatVoteBannedIds = new Set();
    await sendInPlayerSecretThread(client, session, scapegoatId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Bouc \u00c9missaire')
          .setDescription('Aucune interdiction \u2014 tout le monde pourra voter.')
          .setColor(SG_COLOR),
      ],
    });
    return;
  }

  const banned = picked.split(',').filter((id) => alive.includes(id));
  session.scapegoatVoteBannedIds = new Set(banned);

  const names = banned
    .map((id) => session.getPlayer(id)?.displayName ?? `<@${id}>`)
    .join(', ');

  await sendInPlayerSecretThread(client, session, scapegoatId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Bouc \u00c9missaire \u2014 Interdictions appliqu\u00e9es')
        .setDescription(
          banned.length === 0
            ? 'Aucune interdiction \u2014 tout le monde peut voter.'
            : `Interdits de vote pour le prochain tour : **${names}**`
        )
        .setColor(SG_COLOR),
    ],
  });
}

export function fulfillScapegoat(channelId: string, bannedCsvOrSkip: string): boolean {
  return fulfillPending(scapegoatChoiceKey(channelId), bannedCsvOrSkip);
}
