import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import { Role } from '../types';
import type { GameSession } from './GameSession';
import { buildAlivePlayerSelect, publicEmbed } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const WC_COLOR = 0x27ae60;

function wildChildKey(channelId: string, childId: string): string {
  return `${channelId}:wildchild:${childId}`;
}

/**
 * Phase nuit 1 : l'Enfant Sauvage choisit son mod\u00e8le.
 */
export async function runWildChildPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  if (session.nightNumber !== 1) return;
  const wcId = session.wildChildId();
  if (!wcId) return;

  session.nightSubPhase = 'wildchild';

  const targets = session.aliveIds().filter((id) => id !== wcId);

  const embed = new EmbedBuilder()
    .setTitle('Enfant Sauvage \u2014 Choix du mod\u00e8le')
    .setDescription(
      'Choisis un **mod\u00e8le** parmi les joueurs vivants.\n\n' +
        'Si ton mod\u00e8le meurt \u00e0 n\u2019importe quel moment, tu te **transformes en Loup-Garou** et rejoins la meute.\n\n' +
        '_Tant que ton mod\u00e8le est vivant, tu joues du c\u00f4t\u00e9 du village._'
    )
    .setColor(WC_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:wildchild`,
    'Choisir mon mod\u00e8le\u2026',
    targets,
    session.labelMap(),
    new Set()
  );

  const ok = await sendInPlayerSecretThread(client, session, wcId, {
    content: `<@${wcId}> \u2014 **Enfant Sauvage** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    ],
  });

  if (!ok) return;

  const picked = await createWaiter(wildChildKey(session.textChannelId, wcId), NIGHT_ACTION_MS);

  if (!picked) {
    const fallback = targets[Math.floor(Math.random() * targets.length)];
    if (fallback) {
      session.wildChildModelId = fallback;
      const p = session.getPlayer(fallback);
      await sendInPlayerSecretThread(client, session, wcId, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Enfant Sauvage \u2014 Mod\u00e8le assign\u00e9 au hasard')
            .setDescription(
              `Temps \u00e9coul\u00e9 \u2014 ton mod\u00e8le est **${p?.displayName ?? '?'}** (tir\u00e9 au sort).`
            )
            .setColor(WC_COLOR),
        ],
      });
    }
    return;
  }

  session.wildChildModelId = picked;
  const model = session.getPlayer(picked);

  await sendInPlayerSecretThread(client, session, wcId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Enfant Sauvage \u2014 Mod\u00e8le choisi')
        .setDescription(
          `Ton mod\u00e8le est **${model?.displayName ?? '?'}** (<@${picked}>).\n\n` +
            '_S\u2019il meurt, tu deviendras Loup-Garou et rejoindras la meute._'
        )
        .setColor(WC_COLOR),
    ],
  });
}

/**
 * V\u00e9rifie si le mod\u00e8le de l\u2019Enfant Sauvage vient de mourir et d\u00e9clenche la transformation.
 */
export async function checkWildChildTransform(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  justDiedIds: string[]
): Promise<void> {
  if (session.wildChildBecameWolf) return;
  if (!session.wildChildModelId) return;
  if (!justDiedIds.includes(session.wildChildModelId)) return;

  const wcId = session.wildChildId();
  if (!wcId) return;

  const p = session.getPlayer(wcId);
  if (!p) return;

  session.wildChildBecameWolf = true;
  p.role = Role.Werewolf;

  await textChannel.send({
    embeds: [
      publicEmbed(
        'L\u2019Enfant Sauvage se transforme !',
        `**${p.displayName}** (\u003c@${wcId}\u003e) \u00e9tait l\u2019**Enfant Sauvage** \u2014 son mod\u00e8le est mort.\n\n` +
          'Il/elle rejoint d\u00e9sormais le **camp des Loups-Garous** !'
      ).setColor(0x1a252f),
    ],
  });

  await sendInPlayerSecretThread(client, session, wcId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Transformation en Loup-Garou')
        .setDescription(
          'Ton mod\u00e8le est mort\u2026 Tu es maintenant un **Loup-Garou** !\n\n' +
            'Tu rejoins la **meute**. Vote avec eux via `/lg-vote` chaque nuit.'
        )
        .setColor(0x992d22),
    ],
  });

  if (session.wolfPackThreadId) {
    try {
      const ch = await client.channels.fetch(session.wolfPackThreadId).catch(() => null);
      if (ch?.isThread()) {
        await ch.members.add(wcId);
        await ch.send({
          content:
            `\u{1F43A} **${p.displayName}** (<@${wcId}>) vient de rejoindre la meute \u2014 **Enfant Sauvage transform\u00e9** !`,
        });
      }
    } catch {
      /* ignore */
    }
  }
}

export function fulfillWildChild(channelId: string, childId: string, modelId: string): boolean {
  return fulfillPending(wildChildKey(channelId, childId), modelId);
}
