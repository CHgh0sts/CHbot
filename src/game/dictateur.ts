import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import type { GameSession } from './GameSession';
import {
  buildAlivePlayerSelect,
  publicEmbed,
} from '../services/MessagingService';
import { sendInPlayerSecretThread } from '../services/SecretThreadService';
import { roleLabelFr } from './composition';
import { Role } from '../types';
import { addDeadToNecromancerThread } from './necromancer';
import { demotePlayersToStageAudience } from '../services/StageVoiceService';

const DICT_COLOR = 0xc0392b;
const DICT_TRIGGER_MS = 30_000; // temps pour décider d'agir ou pas
const DICT_PICK_MS = 60_000;   // temps pour choisir la victime

function dictKey(channelId: string): string {
  return `${channelId}:dictateur:trigger`;
}
function dictPickKey(channelId: string): string {
  return `${channelId}:dictateur:pick`;
}

/**
 * Vérifie si la cible désignée par le Dictateur est un « ennemi »
 * (loup, solo qui gagne contre le village).
 */
function isDictateurCorrectTarget(session: GameSession, targetId: string): boolean {
  const p = session.getPlayer(targetId);
  if (!p) return false;
  if (session.isWolfRole(p.role)) return true;
  const soloEnnemis: Role[] = [
    Role.Pyromaniac,
    Role.Sectarian,
    Role.PiedPiper,
    Role.WhiteWerewolf,
  ];
  return soloEnnemis.includes(p.role);
}

/**
 * Appelé au début de chaque phase de vote du village.
 * Le Dictateur dispose de 30 s pour décider d'intervenir.
 * S'il intervient, il choisit une victime via un menu.
 *
 * @returns L'ID de la victime impos\u00e9e, ou `null` si le Dictateur n'intervient pas.
 */
export async function runDictateurPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  aliveIds: string[]
): Promise<string | null> {
  const dictId = session.dictateurId();
  if (!dictId || session.dictateurUsed) return null;

  const embed = new EmbedBuilder()
    .setTitle('\uD83D\uDC51 Dictateur \u2014 Intervenir ?')
    .setDescription(
      'Le vote du village est sur le point de commencer.\n\n' +
        'Voulez-vous **interrompre le vote** et d\u00e9signer vous-m\u00eame la victime ?\n\n' +
        '\u2022 **Intervenir** \u2014 vous vous r\u00e9v\u00e9lez et choisissez seul. Si vous ciblez un **ennemi**, vous devenez **Maire**. Sinon, vous **mourez**.\n' +
        '\u2022 **Laisser voter** \u2014 le vote se d\u00e9roule normalement.\n\n' +
        '_Vous avez **30 secondes** pour d\u00e9cider._'
    )
    .setColor(DICT_COLOR);

  const actBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:dictateur:act`)
    .setLabel('\uD83D\uDC51 J\u2019interviens !')
    .setStyle(ButtonStyle.Danger);

  const skipBtn = new ButtonBuilder()
    .setCustomId(`lg:${session.textChannelId}:dictateur:skip`)
    .setLabel('\u23ED\uFE0F Laisser voter')
    .setStyle(ButtonStyle.Secondary);

  const ok = await sendInPlayerSecretThread(client, session, dictId, {
    content: `<@${dictId}> \u2014 **Dictateur** : le vote va commencer.`,
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(actBtn, skipBtn),
    ],
  });
  if (!ok) return null;

  const trigger = await createWaiter(dictKey(session.textChannelId), DICT_TRIGGER_MS);
  if (!trigger || trigger !== 'act') return null;

  // Le Dictateur intervient — envoi du menu de choix
  const targets = aliveIds.filter((id) => id !== dictId);
  if (targets.length === 0) return null;

  const pickEmbed = new EmbedBuilder()
    .setTitle('\uD83D\uDC51 Dictateur \u2014 Choisir la victime')
    .setDescription(
      'Vous avez choisi d\u2019intervenir. **Choisissez la victime** que vous \u00e9liminez.\n\n' +
        '_Rappel : si vous ciblez un ennemi (loup ou solo) \u2192 vous devenez **Maire**. Sinon \u2192 vous **mourez**._'
    )
    .setColor(DICT_COLOR);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:dictateur:pick`,
    '\u00c9liminer\u2026',
    targets,
    session.labelMap(),
    new Set([dictId])
  );
  (menu as StringSelectMenuBuilder).setMinValues(1).setMaxValues(1);

  await sendInPlayerSecretThread(client, session, dictId, {
    embeds: [pickEmbed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });

  const victimId = await createWaiter(dictPickKey(session.textChannelId), DICT_PICK_MS);
  if (!victimId) return null;

  session.dictateurUsed = true;
  const dictPlayer = session.getPlayer(dictId);
  const victimPlayer = session.getPlayer(victimId);
  if (!dictPlayer || !victimPlayer) return null;

  // Annonce publique
  await textChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('\uD83D\uDC51 Le Dictateur intervient !')
        .setDescription(
          `**${dictPlayer.displayName}** r\u00e9v\u00e8le qu\u2019il \u00e9tait le **Dictateur** !\n\n` +
            `Il impose l\u2019\u00e9limination de **${victimPlayer.displayName}**.`
        )
        .setColor(DICT_COLOR),
    ],
  });

  const correct = isDictateurCorrectTarget(session, victimId);

  if (correct) {
    // Correct → Dictateur devient Maire
    session.mayorId = dictId;
    await textChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('\uD83C\uDF1F Cible correcte \u2014 Le Dictateur devient Maire !')
          .setDescription(
            `**${victimPlayer.displayName}** \u00e9tait bien un ennemi (**${roleLabelFr(victimPlayer.role)}**).\n\n` +
              `**${dictPlayer.displayName}** a vu juste \u2014 il est d\u00e9sormais **Maire** et son vote vaut **2 voix** lors des prochains votes.`
          )
          .setColor(0xf1c40f),
      ],
    });
  } else {
    // Mauvaise cible → Dictateur meurt
    session.kill(dictId);
    await addDeadToNecromancerThread(client, session, dictId);
    await demotePlayersToStageAudience(textChannel.guild, session, [dictId]);
    await textChannel.send({
      embeds: [
        publicEmbed(
          '\u274C Cible incorrecte \u2014 Le Dictateur tombe !',
          `**${victimPlayer.displayName}** \u00e9tait un **villageois innocent** (${roleLabelFr(victimPlayer.role)}).\n\n` +
            `**${dictPlayer.displayName}** paie sa t\u00e9m\u00e9rit\u00e9 \u2014 il est \u00e9limin\u00e9 sur le champ.`
        ).setColor(DICT_COLOR),
      ],
    });
  }

  return victimId;
}

export function fulfillDictateurTrigger(channelId: string, choice: string): boolean {
  return fulfillPending(dictKey(channelId), choice);
}

export function fulfillDictateurPick(channelId: string, victimId: string): boolean {
  return fulfillPending(dictPickKey(channelId), victimId);
}
