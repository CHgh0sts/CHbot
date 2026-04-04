import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import { buildAlivePlayerSelect } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const FOX_COLOR = 0xe67e22;

function foxKey(channelId: string): string {
  return `${channelId}:fox`;
}

/**
 * Phase du Renard : il flairer 3 joueurs et apprend si au moins l\u2019un est un loup.
 * Si aucun loup n\u2019est parmi eux, il perd son pouvoir d\u00e9finitivement.
 */
export async function runFoxPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const foxId = session.foxId();
  if (!foxId || session.foxLostPower) return;

  session.nightSubPhase = 'fox';

  const targets = session.aliveIds().filter((id) => id !== foxId);
  if (targets.length === 0) return;

  const sniffCount = Math.min(3, targets.length);

  const embed = new EmbedBuilder()
    .setTitle('Renard \u2014 Flairage')
    .setDescription(
      `Choisis **${sniffCount === 1 ? '1 joueur' : sniffCount === 2 ? '2 joueurs' : '3 joueurs'}** \u00e0 flairer.\n\n` +
        'Le bot te r\u00e9pondra :\n' +
        '> **\u{1F43E} Un loup se cache parmi eux !** — garde ton pouvoir\n' +
        '> **\u{1F6AB} Aucun loup parmi eux.** — tu **perds ton pouvoir** d\u00e9finitivement\n\n' +
        '_Tu ne sais pas lequel est loup, seulement s\u2019il y en a un._'
    )
    .setColor(FOX_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:fox`,
    'Flairer\u2026',
    targets,
    session.labelMap(),
    new Set()
  );

  (menu as StringSelectMenuBuilder).setMinValues(sniffCount).setMaxValues(sniffCount);

  const ok = await sendInPlayerSecretThread(client, session, foxId, {
    content: `<@${foxId}> \u2014 **Renard** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(foxKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked) {
    session.foxLostPower = true;
    await sendInPlayerSecretThread(client, session, foxId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Renard \u2014 Temps \u00e9coul\u00e9')
          .setDescription('Tu n\u2019as pas fleir\u00e9 \u2014 tu **perds ton pouvoir** d\u00e9finitivement.')
          .setColor(FOX_COLOR),
      ],
    });
    return;
  }

  const ids = picked.split(',').filter(Boolean);
  const hasWolf = ids.some((id) => {
    const p = session.getPlayer(id);
    return p && p.alive && session.isWolfRole(p.role);
  });

  if (hasWolf) {
    await sendInPlayerSecretThread(client, session, foxId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Renard \u2014 R\u00e9sultat')
          .setDescription('\u{1F43E} **Un loup se cache parmi les joueurs fleur\u00e9s !**\n\nTon pouvoir est **conserv\u00e9**.')
          .setColor(FOX_COLOR),
      ],
    });
  } else {
    session.foxLostPower = true;
    await sendInPlayerSecretThread(client, session, foxId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Renard \u2014 R\u00e9sultat')
          .setDescription('\u{1F6AB} **Aucun loup parmi les joueurs fleur\u00e9s.**\n\nTu **perds ton pouvoir** d\u00e9finitivement.')
          .setColor(FOX_COLOR),
      ],
    });
  }
}

export function fulfillFox(channelId: string, targetsCsv: string): boolean {
  return fulfillPending(foxKey(channelId), targetsCsv);
}
