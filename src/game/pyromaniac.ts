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
import { buildAlivePlayerSelect } from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const PYRO_COLOR = 0xe74c3c;

function pyroKey(channelId: string): string {
  return `${channelId}:pyromaniac`;
}

/**
 * Phase du Pyromane : arrose 1 joueur ou d\u00e9clenche l\u2019incendie (tue tous les arros\u00e9s vivants).
 */
export async function runPyromaniacPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const pyroId = session.pyromaniacId();
  if (!pyroId || session.pyromaniacIgnited) return;

  session.nightSubPhase = 'pyromaniac';

  const targets = session.aliveIds().filter((id) => id !== pyroId);
  if (targets.length === 0) return;

  const dousedCount = [...session.pyromaniacDousedIds].filter((id) => {
    const p = session.getPlayer(id);
    return p && p.alive;
  }).length;

  const descLines = [
    `\u{1F6E2}\uFE0F **Joueurs arros\u00e9s (vivants)** : ${dousedCount}`,
    '',
    '**Option 1** \u2014 Choisir un joueur \u00e0 **arroser** (select)',
    '_Tu peux arroser un joueur d\u00e9j\u00e0 arros\u00e9 sans effet suppl\u00e9mentaire._',
  ];

  if (dousedCount >= 1) {
    descLines.push('', '**Option 2** \u2014 D\u00e9clencher l\u2019\ud83d\udd25 **Incendie** (tous les arros\u00e9s vivants meurent \u00e0 l\u2019aube).');
  }

  const embed = new EmbedBuilder()
    .setTitle('Pyromane \u2014 Action de nuit')
    .setDescription(descLines.join('\n'))
    .setColor(PYRO_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:pyromaniac`,
    'Arroser\u2026',
    targets,
    session.labelMap(),
    new Set()
  );
  (menu as StringSelectMenuBuilder).setMinValues(1).setMaxValues(1);

  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
  ];

  if (dousedCount >= 1) {
    const igniteBtn = new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:pyromaniac:ignite`)
      .setLabel('\ud83d\udd25 Incendier')
      .setStyle(ButtonStyle.Danger);
    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(igniteBtn));
  }

  const ok = await sendInPlayerSecretThread(client, session, pyroId, {
    content: `<@${pyroId}> \u2014 **Pyromane** (fil priv\u00e9).`,
    embeds: [embed],
    components,
  });

  if (!ok) return;

  const picked = await createWaiter(pyroKey(session.textChannelId), NIGHT_ACTION_MS);

  if (!picked) return;

  if (picked === 'ignite') {
    session.pyromaniacIgnited = true;
    const toKill = [...session.pyromaniacDousedIds].filter((id) => {
      const p = session.getPlayer(id);
      return p && p.alive;
    });
    for (const id of toKill) {
      if (!session.pendingNightDeaths.includes(id)) {
        session.pendingNightDeaths.push(id);
      }
    }
    await sendInPlayerSecretThread(client, session, pyroId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Pyromane \u2014 Incendie d\u00e9clench\u00e9 !')
          .setDescription(
            `\ud83d\udd25 L\u2019incendie va consumer **${toKill.length}** joueur(s) arros\u00e9(s) \u00e0 l\u2019aube.`
          )
          .setColor(PYRO_COLOR),
      ],
    });
  } else {
    session.pyromaniacDousedIds.add(picked);
    const p = session.getPlayer(picked);
    const name = p?.displayName ?? picked;
    await sendInPlayerSecretThread(client, session, pyroId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Pyromane \u2014 Arros\u00e9')
          .setDescription(`\u{1F6E2}\uFE0F **${name}** a \u00e9t\u00e9 arros\u00e9(e).`)
          .setColor(PYRO_COLOR),
      ],
    });
  }
}

export function fulfillPyromaniac(channelId: string, targetsCsv: string): boolean {
  return fulfillPending(pyroKey(channelId), targetsCsv);
}

export function fulfillPyromaniacIgnite(channelId: string): boolean {
  return fulfillPending(pyroKey(channelId), 'ignite');
}
