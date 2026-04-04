import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';
import { roleLabelFr } from './composition';

const NECRO_COLOR = 0x6c3483;

function necroKey(channelId: string): string {
  return `${channelId}:necromancer`;
}

export async function runNecromancerPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const necroId = session.necromancerId();
  if (!necroId) return;

  const dead = [...session.players.values()].filter((p) => !p.alive);
  if (dead.length === 0) return;

  session.nightSubPhase = 'necromancer';

  const options = dead.map((p) => ({
    label: p.displayName.slice(0, 25),
    value: p.userId,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`lg:${session.textChannelId}:necromancer`)
    .setPlaceholder('Choisir un mort \u00e0 inspecter\u2026')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const embed = new EmbedBuilder()
    .setTitle('N\u00e9cromancien \u2014 Oracle des morts')
    .setDescription(
      '\u{1F480} Choisissez un joueur **mort** \u00e0 consulter.\n\n' +
        "Le bot vous r\u00e9v\u00e9lera son **r\u00f4le exact**."
    )
    .setColor(NECRO_COLOR);

  const ok = await sendInPlayerSecretThread(client, session, necroId, {
    content: `<@${necroId}> \u2014 **N\u00e9cromancien** (fil priv\u00e9).`,
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
  if (!ok) return;

  const picked = await createWaiter(necroKey(session.textChannelId), NIGHT_ACTION_MS);
  if (!picked) return;

  const target = session.getPlayer(picked);
  if (!target) return;

  await sendInPlayerSecretThread(client, session, necroId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('N\u00e9cromancien \u2014 R\u00e9v\u00e9lation')
        .setDescription(
          `\u{1F480} L\u2019esprit de **${target.displayName}** vous murmure\u2026\n\n` +
            `\u2666\uFE0F R\u00f4le : **${roleLabelFr(target.role)}**`
        )
        .setColor(NECRO_COLOR),
    ],
  });
}

export function fulfillNecromancer(channelId: string, target: string): boolean {
  return fulfillPending(necroKey(channelId), target);
}
