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
import {
  ensureWolfPackThread,
  sendComponentsToPlayerThread,
  sendInPlayerSecretThread,
} from '../services/SecretThreadService';
import { roleLabelFr } from './composition';
import { Role } from '../types';
import { addDeadToNecromancerThread } from './necromancer';

const HACKEUR_COLOR = 0x1abc9c;

function hackeurKey(channelId: string): string {
  return `${channelId}:hackeur:pick`;
}

/**
 * Phase Nuit 1 : le Hackeur choisit sa cible.
 */
export async function runHackeurPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const hackId = session.hackeurId();
  if (!hackId) return;

  session.nightSubPhase = 'hackeur';
  const targets = session.aliveIds().filter((id) => id !== hackId);
  if (targets.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle('\uD83D\uDCBB Hackeur \u2014 Nuit 1')
    .setDescription(
      'Choisissez un joueur \u00e0 **pirater**.\n\n' +
        '\u2022 Lorsque ce joueur **mourra**, son r\u00f4le ne sera **pas r\u00e9v\u00e9l\u00e9** publiquement.\n' +
        '\u2022 Vous **h\u00e9riterez secr\u00e8tement** de son r\u00f4le et de ses pouvoirs.\n' +
        '\u2022 Avant ce vol, la Voyante vous voit comme un **r\u00f4le village al\u00e9atoire**.'
    )
    .setColor(HACKEUR_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:hackeur`,
    'Pirater\u2026',
    targets,
    session.labelMap(),
    new Set([hackId])
  );
  (menu as StringSelectMenuBuilder).setMinValues(1).setMaxValues(1);

  const ok = await sendComponentsToPlayerThread(client, session, hackId, embed, [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
  ]);

  if (!ok) {
    await textChannel.send({
      content: '**Hackeur** : impossible d\u2019envoyer l\u2019action \u2014 tour ignor\u00e9.',
    });
    return;
  }

  const picked = await createWaiter(hackeurKey(session.textChannelId), NIGHT_ACTION_MS);
  if (!picked) {
    await textChannel.send({
      content: '**Hackeur** : aucune cible choisie (temps \u00e9coul\u00e9) \u2014 aucun piratage programm\u00e9.',
    });
    return;
  }

  session.hackeurTargetId = picked;
  const targetName = session.getPlayer(picked)?.displayName ?? `<@${picked}>`;

  await sendInPlayerSecretThread(client, session, hackId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('\uD83D\uDCBB Cible s\u00e9lectionn\u00e9e')
        .setDescription(
          `**${targetName}** est votre cible.\n\nLorsqu'il mourra, vous h\u00e9riterez de son r\u00f4le et de ses pouvoirs.`
        )
        .setColor(HACKEUR_COLOR),
    ],
  });
}

/**
 * Appelé lors de la mort d'un joueur.
 * Retourne `true` si ce joueur était la cible du Hackeur (vol effectué).
 * Doit être appelé **avant** `session.kill(deadId)` pour que le rôle soit encore accessible.
 */
export async function processHackeurTargetDeath(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  deadId: string
): Promise<boolean> {
  if (!session.hackeurTargetId || deadId !== session.hackeurTargetId) return false;
  if (session.hackeurHasStolen) return false;

  const hackId = session.hackeurPlayerId;
  if (!hackId) return false;
  const hackPlayer = session.getPlayer(hackId);
  if (!hackPlayer || !hackPlayer.alive) return false;

  const deadPlayer = session.getPlayer(deadId);
  if (!deadPlayer) return false;

  const stolenRole = deadPlayer.role;
  session.hackeurHasStolen = true;
  session.hackeurStolenRole = stolenRole;

  // Le Hackeur prend le rôle volé
  hackPlayer.role = stolenRole;

  // Initialiser l'état du rôle volé (version neuve)
  initStolenRoleState(session, stolenRole);

  // Si c'est un rôle loup : ajouter au fil Meute
  if (session.isWolfRole(stolenRole)) {
    await ensureWolfPackThread(client, session);
    const wolfThreadId = session.wolfPackThreadId;
    const wolfThread = wolfThreadId
      ? textChannel.guild.channels.cache.get(wolfThreadId)
      : null;
    if (wolfThread?.isThread()) {
      await wolfThread.members.add(hackId).catch(() => null);
      await wolfThread.send({
        content:
          `<@${hackId}> a rejoint la meute ! ` +
          `\uD83D\uDCBB _Piratage de **${roleLabelFr(stolenRole)}** r\u00e9ussi._`,
      });
    }
  }

  // Ajouter la cible morte au fil du Nécromancien
  await addDeadToNecromancerThread(client, session, deadId);

  // Message privé au Hackeur
  await sendInPlayerSecretThread(client, session, hackId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('\uD83D\uDCBB Piratage r\u00e9ussi !')
        .setDescription(
          `**${deadPlayer.displayName}** est mort.\n\n` +
            `Vous avez h\u00e9rit\u00e9 de son r\u00f4le : **${roleLabelFr(stolenRole)}**.\n\n` +
            `Vous jouez d\u00e9sormais comme un **${roleLabelFr(stolenRole)}** et votre camp de victoire change en cons\u00e9quence.`
        )
        .setColor(HACKEUR_COLOR),
    ],
  });

  return true;
}

function initStolenRoleState(session: GameSession, role: Role): void {
  switch (role) {
    case Role.Witch:
      session.witchLifePotion = true;
      session.witchDeathPotion = true;
      break;
    case Role.Docteur:
      session.docteurCharges = 3;
      break;
    case Role.Guard:
      session.guardLastProtectedId = null;
      break;
    default:
      break;
  }
}

export function fulfillHackeur(channelId: string, targetId: string): boolean {
  return fulfillPending(hackeurKey(channelId), targetId);
}
