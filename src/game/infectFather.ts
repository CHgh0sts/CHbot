import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import {
  sendInPlayerSecretThread,
  ensureWolfPackThread,
} from '../services/SecretThreadService';
import { Role } from '../types';

const INFECT_COLOR = 0x2e4053;

function infectKey(channelId: string): string {
  return `${channelId}:infectfather`;
}

/**
 * Apr\u00e8s que les loups ont vot\u00e9 leur victime (wolfTargetId d\u00e9fini),
 * l\u2019Infect P\u00e8re peut choisir d\u2019**infecter** la victime plut\u00f4t que de la tuer.
 */
export async function runInfectFatherPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const infectId = session.infectFatherId();
  if (!infectId || session.infectFatherUsed || !session.wolfTargetId) return;

  session.nightSubPhase = 'infectfather';

  const victim = session.getPlayer(session.wolfTargetId);
  if (!victim || !victim.alive) return;

  const embed = new EmbedBuilder()
    .setTitle('Infect P\u00e8re des Loups \u2014 Infecter ?')
    .setDescription(
      `\u{1F9DF} La meute a d\u00e9sign\u00e9 **${victim.displayName}** comme victime.\n\n` +
        'Voulez-vous l\u2019**infecter** plut\u00f4t que de la tuer ?\n\n' +
        '\u2022 **Infecter** \u2014 la victime devient un loup secr\u00e8tement, aucune mort annonc\u00e9e, pouvoir consomm\u00e9.\n' +
        '\u2022 **Tuer normalement** \u2014 mort classique \u00e0 l\u2019aube.\n\n' +
        '_Cette capacit\u00e9 ne peut \u00eatre utilis\u00e9e qu\u2019**une seule fois** par partie._'
    )
    .setColor(INFECT_COLOR);

  const infectBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:infectfather:infect`)
    .setLabel('\u{1F9DF} Infecter')
    .setStyle(ButtonStyle.Danger);

  const skipBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:infectfather:skip`)
    .setLabel('\u26A0\uFE0F Tuer normalement')
    .setStyle(ButtonStyle.Secondary);

  const ok = await sendInPlayerSecretThread(client, session, infectId, {
    content: `<@${infectId}> \u2014 **Infect P\u00e8re des Loups** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(infectBtn, skipBtn),
    ],
  });
  if (!ok) return;

  const result = await createWaiter(
    infectKey(session.textChannelId),
    Math.floor(NIGHT_ACTION_MS / 2)
  );
  if (!result || result === 'skip') return;

  // Infect !
  session.infectFatherUsed = true;
  const victimId = session.wolfTargetId;
  session.wolfTargetId = null; // Annule la mort des loups
  session.infectFatherInfectedId = victimId;

  const victimPlayer = session.getPlayer(victimId);
  if (!victimPlayer) return;

  victimPlayer.role = Role.Werewolf;

  // Ajouter au fil Meute
  const packThread = await ensureWolfPackThread(client, session);
  if (packThread) {
    await packThread.members.add(victimId).catch(() => null);
    await packThread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\u{1F9DF} Un nouveau loup dans la meute !')
          .setDescription(
            `**${victimPlayer.displayName}** a \u00e9t\u00e9 infect\u00e9(e) par l\u2019Infect P\u00e8re des Loups \u2014 bienvenue dans la meute !\n\n` +
              '_Le village ne saura pas ce qui s\u2019est pass\u00e9 cette nuit._'
          )
          .setColor(INFECT_COLOR),
      ],
    });
  }

  await sendInPlayerSecretThread(client, session, victimId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('\u{1F9DF} Vous avez \u00e9t\u00e9 infect\u00e9(e) !')
        .setDescription(
          'Cette nuit, l\u2019Infect P\u00e8re des Loups vous a transform\u00e9(e) en **Loup-Garou**.\n\n' +
            'Vous \u00eates d\u00e9sormais dans la **meute** \u2014 consultez le fil Meute.\n' +
            '_Le village ne sait rien._'
        )
        .setColor(INFECT_COLOR),
    ],
  });

  await sendInPlayerSecretThread(client, session, infectId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Infect P\u00e8re \u2014 Infection r\u00e9ussie')
        .setDescription(
          `\u{1F9DF} **${victimPlayer.displayName}** est d\u00e9sormais un loup. Votre pouvoir est consomm\u00e9.`
        )
        .setColor(INFECT_COLOR),
    ],
  });
}

export function fulfillInfectFather(channelId: string, choice: string): boolean {
  return fulfillPending(infectKey(channelId), choice);
}
