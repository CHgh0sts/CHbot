import type { GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { MAX_PLAYERS } from '../config';
import { formatCompositionReadable } from '../game/composition';
import type { GameSession } from '../game/GameSession';

export function buildLobbyEmbed(session: GameSession): EmbedBuilder {
  const count = session.lobbyPlayers.size;
  const minStart = session.compositionConfig.minPlayers;
  const list =
    [...session.lobbyPlayers].map((id) => `• <@${id}>`).join('\n') ||
    '_(aucun joueur)_';

  const presetLine = session.presetPublicCode
    ? `\n**Preset (site) :** \`${session.presetPublicCode}\` — composition chargée depuis le site.\n`
    : '';

  return new EmbedBuilder()
    .setTitle('Loup-Garou — Lobby')
    .setDescription(
      `**Inscrits :** ${count} / ${minStart} _(max ${MAX_PLAYERS})_${presetLine}\n${list}`
    )
    .addFields(
      {
        name: 'Réglages de la partie',
        value: formatCompositionReadable(
          session.compositionConfig,
          session.lobbyPlayers.size
        ),
        inline: false,
      },
      {
        name: 'Étapes',
        value:
          `1. Entre sur la **Scène** (salon vocal ci-dessus) puis clique **Rejoindre** _(\`/lg-leave\` / \`*leave\` si besoin)_\n` +
          `2. Hôte : \`/lg-config\` pour modifier les paramètres\n` +
          `3. Au moins **${minStart}** joueur(s), puis **Lancer la partie** ou \`/lg-start\`\n\n` +
          `**Vivants** = **orateurs** sur la scène ; **morts** = **auditeurs** (micro scène coupé). Fils secrets : salon technique \`…-fils\` (invisible aux autres).`,
        inline: false,
      }
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Mis à jour à chaque arrivée ou départ.' });
}

export function buildLobbyComponents(
  session: GameSession
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:lobby:join`)
        .setLabel('Rejoindre')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:lobby:leave`)
        .setLabel('Quitter')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:lobby:start`)
        .setLabel('Lancer la partie')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

export async function sendLobbyMessage(
  channel: GuildTextBasedChannel,
  session: GameSession
): Promise<void> {
  const msg = await channel.send({
    embeds: [buildLobbyEmbed(session)],
    components: buildLobbyComponents(session),
  });
  session.lobbyMessageId = msg.id;
}

export async function refreshLobbyMessage(
  session: GameSession,
  channel: GuildTextBasedChannel
): Promise<void> {
  if (!session.lobbyMessageId || session.phase !== 'lobby') return;
  const msg = await channel.messages
    .fetch(session.lobbyMessageId)
    .catch(() => null);
  if (!msg?.editable) return;
  await msg.edit({
    embeds: [buildLobbyEmbed(session)],
    components: buildLobbyComponents(session),
  });
}
