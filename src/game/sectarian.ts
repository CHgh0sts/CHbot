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

const SECT_COLOR = 0x8e44ad;

function sectarianKey(channelId: string): string {
  return `${channelId}:sectarian`;
}

/** Nuit 1 : r\u00e9partir tous les joueurs en 2 groupes al\u00e9atoires et notifier le Sectaire. */
export async function initSectarianGroups(
  client: Client,
  session: GameSession
): Promise<void> {
  const sectId = session.sectarianId();
  if (!sectId) return;

  const allIds = [...session.players.keys()];
  const shuffled = [...allIds].sort(() => Math.random() - 0.5);
  const half = Math.ceil(shuffled.length / 2);

  for (let i = 0; i < shuffled.length; i++) {
    session.sectarianGroups.set(shuffled[i]!, i < half ? 'A' : 'B');
  }

  const mySide = session.sectarianGroups.get(sectId) ?? 'A';
  const myGroup = allIds
    .filter((id) => session.sectarianGroups.get(id) === mySide)
    .map((id) => {
      const p = session.getPlayer(id);
      return id === sectId ? `**${p?.displayName ?? id}** (vous)` : `**${p?.displayName ?? id}**`;
    })
    .join(', ');

  await sendInPlayerSecretThread(client, session, sectId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Sectaire Abominable \u2014 Groupes secrets')
        .setDescription(
          `\u{1F52E} Les joueurs ont \u00e9t\u00e9 r\u00e9partis en **deux groupes secrets** (A et B).\n\n` +
            `Vous \u00eates dans le **Groupe ${mySide}**.\n` +
            `Votre groupe : ${myGroup}\n\n` +
            '_Vous gagnez quand **tous les survivants** (vous compris) sont du m\u00eame groupe._'
        )
        .setColor(SECT_COLOR),
    ],
  });
}

/** Chaque nuit : le Sectaire inspecte un joueur et apprend son groupe. */
export async function runSectarianPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const sectId = session.sectarianId();
  if (!sectId || session.sectarianGroups.size === 0) return;

  session.nightSubPhase = 'sectarian';

  const targets = session.aliveIds().filter((id) => id !== sectId);
  if (targets.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Sectaire Abominable \u2014 Inspection')
    .setDescription(
      '\u{1F52E} Choisissez un joueur vivant \u00e0 **inspecter**.\n\n' +
        "Le bot vous indiquera son **groupe** (A ou B)."
    )
    .setColor(SECT_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:sectarian`,
    'Inspecter\u2026',
    targets,
    session.labelMap(),
    new Set()
  );
  (menu as StringSelectMenuBuilder).setMinValues(1).setMaxValues(1);

  const ok = await sendInPlayerSecretThread(client, session, sectId, {
    content: `<@${sectId}> \u2014 **Sectaire Abominable** (fil priv\u00e9).`,
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
  if (!ok) return;

  const picked = await createWaiter(sectarianKey(session.textChannelId), NIGHT_ACTION_MS);
  if (!picked) return;

  const group = session.sectarianGroups.get(picked) ?? '?';
  const p = session.getPlayer(picked);

  await sendInPlayerSecretThread(client, session, sectId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Sectaire Abominable \u2014 R\u00e9sultat')
        .setDescription(
          `\u{1F52E} **${p?.displayName ?? picked}** appartient au **Groupe ${group}**.`
        )
        .setColor(SECT_COLOR),
    ],
  });
}

export function fulfillSectarian(channelId: string, target: string): boolean {
  return fulfillPending(sectarianKey(channelId), target);
}
