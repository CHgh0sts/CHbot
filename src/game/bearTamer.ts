import type { Client, GuildTextBasedChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import type { GameSession } from './GameSession';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';

const BEAR_COLOR = 0x8b4513;

/**
 * Nuit 1 : assigne 2 voisins al\u00e9atoires \u00e0 l\u2019Ours de Monsieur Ours et l\u2019en informe.
 */
export async function initBearTamerNeighbors(
  client: Client,
  session: GameSession
): Promise<void> {
  const bearId = session.bearTamerId();
  if (!bearId) return;

  const others = session.aliveIds().filter((id) => id !== bearId);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const neighbors = shuffled.slice(0, Math.min(2, shuffled.length));
  session.bearTamerNeighborIds = neighbors;

  const names = neighbors.map((id) => {
    const p = session.getPlayer(id);
    return p?.displayName ?? id;
  });

  await sendInPlayerSecretThread(client, session, bearId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Ours de Monsieur Ours \u2014 Voisins secrets')
        .setDescription(
          `\u{1F43B} Tes **voisins secrets** (assign\u00e9s pour toute la partie) sont :\n\n` +
            names.map((n) => `\u2022 **${n}**`).join('\n') +
            '\n\n\u00c0 chaque **aube**, si l\u2019un d\u2019eux est encore en vie et **loup-garou**, l\u2019ours grognera publiquement.'
        )
        .setColor(BEAR_COLOR),
    ],
  });
}

/**
 * \u00c0 chaque aube : annon\u00e7ons si l\u2019ours grogne (un voisin loup vivant).
 */
export async function checkBearTamerGrowl(
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const bearId = session.bearTamerId();
  if (!bearId || session.bearTamerNeighborIds.length === 0) return;

  const wolfNeighbor = session.bearTamerNeighborIds.some((id) => {
    const p = session.getPlayer(id);
    return p && p.alive && session.isWolfRole(p.role);
  });

  if (wolfNeighbor) {
    await textChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\u{1F43B} L\u2019ours grogne !')
          .setDescription(
            'Ce matin, l\u2019ours de Monsieur Ours **grogne** avec force.\n' +
              '_L\u2019un des voisins secrets de Monsieur Ours est un **loup-garou**._'
          )
          .setColor(BEAR_COLOR),
      ],
    });
  }
  // Pas d'annonce si silencieux (le silence est aussi informatif, mais pour ne pas trop guider)
}
