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

const DOCTEUR_COLOR = 0x1abc9c;

function docteurKey(channelId: string): string {
  return `${channelId}:docteur`;
}

export async function runDocteurPhase(
  client: Client,
  session: GameSession,
  _textChannel: GuildTextBasedChannel
): Promise<void> {
  const docteurId = session.docteurId();
  if (!docteurId || session.docteurCharges <= 0) return;

  session.nightSubPhase = 'docteur';

  const targets = session.aliveIds();

  const embed = new EmbedBuilder()
    .setTitle('Docteur \u2014 Soin de nuit')
    .setDescription(
      `\u{1FA79} Vous disposez de **${session.docteurCharges}** charge${session.docteurCharges > 1 ? 's' : ''} restante${session.docteurCharges > 1 ? 's' : ''}.\n\n` +
        'Choisissez un joueur \u00e0 **prot\u00e9ger** cette nuit (y compris vous-m\u00eame).\n' +
        '_Si ce joueur est attaqu\u00e9 par les loups, il survivra._'
    )
    .setColor(DOCTEUR_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:docteur`,
    'Prot\u00e9ger\u2026',
    targets,
    session.labelMap(),
    new Set()
  );
  (menu as StringSelectMenuBuilder).setMinValues(1).setMaxValues(1);

  const ok = await sendInPlayerSecretThread(client, session, docteurId, {
    content: `<@${docteurId}> \u2014 **Docteur** (fil priv\u00e9).`,
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
  if (!ok) return;

  const picked = await createWaiter(docteurKey(session.textChannelId), NIGHT_ACTION_MS);
  if (!picked) return;

  session.docteurCharges--;
  session.guardProtectedUserId = picked;

  const p = session.getPlayer(picked);
  const name = p?.displayName ?? picked;

  await sendInPlayerSecretThread(client, session, docteurId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Docteur \u2014 Patient soign\u00e9')
        .setDescription(
          `\u{1FA79} **${name}** est prot\u00e9g\u00e9(e) cette nuit.\n` +
            `\u{1FA77} Charges restantes : **${session.docteurCharges}**`
        )
        .setColor(DOCTEUR_COLOR),
    ],
  });
}

export function fulfillDocteur(channelId: string, target: string): boolean {
  return fulfillPending(docteurKey(channelId), target);
}
