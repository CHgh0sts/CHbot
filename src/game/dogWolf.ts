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

const DOG_COLOR = 0x7f8c8d;

function dogWolfKey(channelId: string): string {
  return `${channelId}:dogwolf`;
}

/**
 * Nuit 1 : le Chien-Loup choisit son camp (Village ou Loups).
 */
export async function runDogWolfPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const dogId = session.dogWolfId();
  if (!dogId || session.dogWolfChoseSide) return;

  session.nightSubPhase = 'dogwolf';

  const embed = new EmbedBuilder()
    .setTitle('Chien-Loup \u2014 Choisissez votre camp')
    .setDescription(
      '\uD83D\uDC3A\uD83D\uDC68\u200D\uD83C\uDF3E Vous \u00eates le **Chien-Loup**. Ce soir, vous devez choisir votre camp pour toute la partie :\n\n' +
        '\u2022 \uD83D\uDC3A **Loups** \u2014 vous rejoignez la meute secr\u00e8tement. Les loups seront inform\u00e9s. Vous gagnez avec eux.\n' +
        '\u2022 \uD83C\uDFD8\uFE0F **Village** \u2014 vous jouez comme un villageois ordinaire. Vous gagnez avec le village.\n\n' +
        '_Le village ne saura pas quel camp vous avez choisi._'
    )
    .setColor(DOG_COLOR);

  const wolfBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:dogwolf:wolf`)
    .setLabel('\uD83D\uDC3A Rejoindre les Loups')
    .setStyle(ButtonStyle.Danger);

  const villageBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:dogwolf:village`)
    .setLabel('\uD83C\uDFD8\uFE0F Rester au Village')
    .setStyle(ButtonStyle.Success);

  const ok = await sendInPlayerSecretThread(client, session, dogId, {
    content: `<@${dogId}> \u2014 **Chien-Loup** (fil priv\u00e9).`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(wolfBtn, villageBtn),
    ],
  });
  if (!ok) return;

  const picked = await createWaiter(dogWolfKey(session.textChannelId), NIGHT_ACTION_MS);

  session.dogWolfChoseSide = true;

  if (!picked || picked === 'village') {
    session.dogWolfIsWolf = false;
    await sendInPlayerSecretThread(client, session, dogId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Chien-Loup \u2014 Camp Village')
          .setDescription(
            '\uD83C\uDFD8\uFE0F Vous avez choisi le **Village**. Vous jouez du c\u00f4t\u00e9 du village pour toute la partie.'
          )
          .setColor(0x57f287),
      ],
    });
  } else {
    session.dogWolfIsWolf = true;

    // Rejoindre le fil Meute
    const packThread = await ensureWolfPackThread(client, session);
    if (packThread) {
      await packThread.members.add(dogId).catch(() => null);
      await packThread.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('\uD83D\uDC3A Le Chien-Loup rejoint la meute !')
            .setDescription(
              `**${session.getPlayer(dogId)?.displayName ?? dogId}** a choisi de rejoindre les Loups \u2014 bienvenue dans la meute !`
            )
            .setColor(DOG_COLOR),
        ],
      });
    }

    await sendInPlayerSecretThread(client, session, dogId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Chien-Loup \u2014 Camp Loups')
          .setDescription(
            '\uD83D\uDC3A Vous avez choisi les **Loups**. Vous \u00eates d\u00e9sormais dans la meute \u2014 consultez le fil Meute.'
          )
          .setColor(0xed4245),
      ],
    });
  }
}

export function fulfillDogWolf(channelId: string, choice: string): boolean {
  return fulfillPending(dogWolfKey(channelId), choice);
}
