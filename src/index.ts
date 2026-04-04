import {
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  MessageFlags,
  Partials,
  type Guild,
  type TextBasedChannel,
} from 'discord.js';
import { discordToken, enablePrefixCommands } from './config';
import {
  registerSlashCommands,
  registerSlashCommandsForGuild,
} from './registerSlashCommands';
import { runLgTest } from './commands/lgTest';
import { handleLgInfo } from './game/lgInfo';
import {
  runLgConfig,
  runLgEnd,
  runLgJoin,
  runLgLeave,
  runLgSetup,
  runLgStart,
  runLgStatus,
  runLgVote,
} from './commands/lgOps';
import {
  normalizeDiscordPresetCode,
  presetFieldInvalid,
} from './utils/presetCode';
import { getSessionByTextChannel } from './game/GameManager';
import { Role } from './types';
import {
  fulfillGuard,
  fulfillLittleGirlSpy,
  fulfillSeer,
  fulfillThief,
  fulfillWitchKill,
  fulfillWitchSave,
} from './game/phases/nightPhase';
import { fulfillVote } from './game/phases/dayPhase';
import { fulfillCupidPick } from './game/cupid';
import { fulfillRaven } from './game/raven';
import { fulfillBigBadWolf } from './game/bigbadwolf';
import { fulfillWhiteWolf } from './game/whiteWolf';
import { fulfillPiedPiper } from './game/piedPiper';
import { fulfillWildChild } from './game/wildChild';
import { fulfillScapegoat } from './game/scapegoat';
import { fulfillFox } from './game/fox';
import { fulfillPyromaniac, fulfillPyromaniacIgnite } from './game/pyromaniac';
import { fulfillDocteur } from './game/docteur';
import { fulfillSectarian } from './game/sectarian';
import { fulfillDevotedServant } from './game/devotedServant';
import { fulfillInfectFather } from './game/infectFather';
import { fulfillDogWolf } from './game/dogWolf';
import { fulfillDictateurTrigger, fulfillDictateurPick } from './game/dictateur';
import { fulfillHackeur } from './game/hackeur';
import { fulfillHunterSelect } from './game/hunter';
import {
  handleAfterGameClose,
  handleAfterGameReplay,
} from './services/PostGameService';
import { cleanupOrphanGameChannels } from './services/orphanGameChannelsCleanup';

const PREFIX = '*';

/** Alias raccourcis : même effet que lg-* */
const PREFIX_ALIASES: Record<string, string> = {
  setup: 'lg-init',
  init: 'lg-init',
  config: 'lg-config',
  join: 'lg-join',
  leave: 'lg-leave',
  start: 'lg-start',
  end: 'lg-end',
  status: 'lg-status',
};

const baseIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
];
if (enablePrefixCommands) {
  baseIntents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents: baseIntents,
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Connecté en tant que ${c.user.tag}`);
  if (enablePrefixCommands) {
    console.log(
      '[prefix] Commandes *texte activées (Message Content). Sinon, utilise les / slash.'
    );
  } else {
    console.log(
      '[prefix] Commandes * désactivées (défaut). Mets PREFIX_COMMANDS=true dans .env + active Message Content Intent sur le portail Discord. Les / slash restent disponibles.'
    );
  }
  try {
    await registerSlashCommands(c);
  } catch (e) {
    console.error(
      '[slash] Enregistrement des commandes échoué — lance `npm run deploy` ou vérifie .env :',
      e
    );
  }

  try {
    await cleanupOrphanGameChannels(c);
  } catch (e) {
    console.error('[cleanup] Nettoyage des salons orphelins échoué :', e);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await registerSlashCommandsForGuild(guild.id);
  } catch (e) {
    console.error(
      `[slash] Échec enregistrement des / sur le serveur ${guild.id} :`,
      e
    );
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!enablePrefixCommands) return;
  if (message.author.bot || !message.guild || !message.channel) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

  const guildChannel = message.channel as import('discord.js').TextChannel;
  const rest = message.content.slice(PREFIX.length).trim();
  if (!rest) return;

  const space = rest.indexOf(' ');
  const cmd = (space === -1 ? rest : rest.slice(0, space)).toLowerCase();
  const argRest = space === -1 ? '' : rest.slice(space + 1).trim();

  const normalized = PREFIX_ALIASES[cmd] ?? cmd;

  try {
    const member = message.member;
    if (normalized === 'lg-init') {
      const parts = argRest.split(/\s+/).filter(Boolean);
      let presetCode: string | null = null;
      let nom = 'partie';
      const firstNorm =
        parts[0] != null ? normalizeDiscordPresetCode(parts[0]) : null;
      if (firstNorm) {
        presetCode = firstNorm;
        nom = parts.slice(1).join(' ') || 'partie';
      } else if (parts[0] != null && presetFieldInvalid(parts[0])) {
        await message.reply(
          'Code **preset** invalide : 5 caractères **A–Z** et **2–9** seulement (copie depuis le site).'
        );
        return;
      } else {
        nom = argRest || 'partie';
      }
      await runLgSetup(
        message.guild,
        guildChannel as import('discord.js').GuildTextBasedChannel,
        message.author.id,
        member,
        undefined,
        message,
        nom,
        null,
        presetCode
      );
      return;
    }

    if (normalized === 'lg-config') {
      await runLgConfig(guildChannel, message.author.id, member, undefined, message, {
        minPlayers: null,
        wolfCount: null,
        loupsAuto: null,
        includeSeer: null,
        includeWitch: null,
        includeHunter: null,
        includeCupid: null,
        includeGuard: null,
        includeThief: null,
        includeAngel: null,
        includeLittleGirl: null,
        includeRaven: null,
        includeRedRidingHood: null,
        includeFoolOfVillage: null,
        includeElder: null,
        includeBigBadWolf: null,
        includeWhiteWerewolf: null,
        includePiedPiper: null,
        includeRustySwordKnight: null,
        includeScapegoat: null,
        includeWildChild: null,
        includeFox: null,
        includePyromaniac: null,
        includeBearTamer: null,
        includeTwoSisters: null,
        includeThreeBrothers: null,
        includeDocteur: null,
        includeNecromancer: null,
        includeSectarian: null,
        includeDevotedServant: null,
        includeInfectFather: null,
        includeDogWolf: null,
        includeDictateur: null,
        includeHackeur: null,
        tiebreakerRandom: null,
        skipFirstNightKill: null,
        revealDeadRoles: null,
        darkNightMode: null,
        gossipSeerMode: null,
        tripleLoversMode: null,
        announceNightProtection: null,
        villageois: null,
        villageoisAuto: null,
      });
      return;
    }

    if (normalized === 'lg-join') {
      await runLgJoin(
        guildChannel,
        message.author.id,
        member,
        undefined,
        message
      );
      return;
    }

    if (normalized === 'lg-leave') {
      await runLgLeave(guildChannel, message.author.id, undefined, message);
      return;
    }

    if (normalized === 'lg-start') {
      await runLgStart(
        client,
        guildChannel,
        message.author.id,
        member,
        undefined,
        message
      );
      return;
    }

    if (normalized === 'lg-end') {
      await runLgEnd(
        client,
        message.guild,
        guildChannel,
        message.author.id,
        member,
        undefined,
        message
      );
      return;
    }

    if (normalized === 'lg-status') {
      await runLgStatus(guildChannel, undefined, message);
    }
  } catch (e) {
    console.error(e);
    await message.reply('Erreur lors de la commande.').catch(() => undefined);
  }
});

async function resolveGameTextChannel(
  guild: Guild,
  channel: TextBasedChannel
): Promise<import('discord.js').GuildTextBasedChannel | null> {
  const id = channel.isThread() ? channel.parentId : channel.id;
  if (!id) return null;
  const ch = await guild.channels.fetch(id).catch(() => null);
  if (ch?.isTextBased() && !ch.isDMBased()) {
    return ch as import('discord.js').GuildTextBasedChannel;
  }
  return null;
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlash(interaction);
      return;
    }
    if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
      return;
    }
    if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (e) {
    console.error(e);
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred) {
          await interaction
            .editReply({ content: 'Une erreur est survenue.' })
            .catch(() => undefined);
        } else if (!interaction.replied) {
          await interaction
            .reply({
              content: 'Une erreur est survenue.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => undefined);
        }
      }
    } catch {
      /* interaction expirée (10062) */
    }
  }
});

async function handleSlash(
  interaction: import('discord.js').ChatInputCommandInteraction
): Promise<void> {
  const { commandName, guild, channel, user } = interaction;
  if (!guild || !channel?.isTextBased()) {
    await interaction.reply({
      content:
        'Utilise cette commande dans un serveur (salon texte **ou** chat d’une **Scène** / vocal).',
      ephemeral: true,
    });
    return;
  }

  const textBasedChannel = channel as import('discord.js').GuildTextBasedChannel;
  const member = interaction.member;
  const gm = member instanceof GuildMember ? member : null;

  if (commandName === 'lg-init') {
    const nom = interaction.options.getString('nom') ?? 'partie';
    const presetRaw = interaction.options.getString('preset');
    if (presetFieldInvalid(presetRaw)) {
      await interaction.reply({
        content:
          'Le **preset** doit être un code **exact de 5 caractères** (lettres **A–Z** et chiffres **2–9** uniquement — pas de **0**, **O**, **1**, **I**). Copie-le depuis le site.',
        ephemeral: true,
      });
      return;
    }
    const presetCode = normalizeDiscordPresetCode(presetRaw);
    await runLgSetup(
      guild,
      textBasedChannel,
      user.id,
      gm,
      interaction,
      undefined,
      nom,
      null,
      presetCode
    );
    return;
  }

  if (commandName === 'lg-test') {
    await runLgTest(interaction);
    return;
  }

  if (commandName === 'lg-info') {
    await handleLgInfo(interaction);
    return;
  }

  const gameTextChannel = await resolveGameTextChannel(guild, channel);
  if (!gameTextChannel) {
    await interaction.reply({
      content: 'Salon de partie introuvable (fil ou salon invalide).',
      ephemeral: true,
    });
    return;
  }

  if (commandName === 'lg-vote') {
    const pseudo = interaction.options.getString('cible', true);
    await runLgVote(client, gameTextChannel, user.id, interaction, pseudo);
    return;
  }

  if (commandName === 'lg-config') {
    await runLgConfig(gameTextChannel, user.id, gm, interaction, undefined, {
      minPlayers: interaction.options.getInteger('min_joueurs'),
      wolfCount: interaction.options.getInteger('loups'),
      loupsAuto: interaction.options.getBoolean('loups_auto'),
      includeSeer: interaction.options.getBoolean('voyante'),
      includeWitch: interaction.options.getBoolean('sorciere'),
      includeHunter: interaction.options.getBoolean('chasseur'),
      includeCupid: interaction.options.getBoolean('cupidon'),
      includeGuard: interaction.options.getBoolean('garde'),
      includeThief: interaction.options.getBoolean('voleur'),
      includeAngel: interaction.options.getBoolean('ange'),
      includeLittleGirl: interaction.options.getBoolean('petite_fille'),
      includeRaven: interaction.options.getBoolean('corbeau'),
      includeRedRidingHood: interaction.options.getBoolean('chaperon_rouge'),
      includeFoolOfVillage: interaction.options.getBoolean('idiot_du_village'),
      includeElder: interaction.options.getBoolean('ancien'),
      includeBigBadWolf: interaction.options.getBoolean('grand_mechant_loup'),
      includeWhiteWerewolf: interaction.options.getBoolean('loup_blanc'),
      includePiedPiper: interaction.options.getBoolean('joueur_de_flute'),
      includeRustySwordKnight: interaction.options.getBoolean('chevalier_rouilee'),
      includeScapegoat: interaction.options.getBoolean('bouc_emissaire'),
      includeWildChild: interaction.options.getBoolean('enfant_sauvage'),
      includeFox: interaction.options.getBoolean('renard'),
      includePyromaniac: interaction.options.getBoolean('pyromane'),
      includeBearTamer: interaction.options.getBoolean('montreur_ours'),
      includeTwoSisters: interaction.options.getBoolean('deux_soeurs'),
      includeThreeBrothers: interaction.options.getBoolean('trois_freres'),
      includeDocteur: interaction.options.getBoolean('docteur'),
      includeNecromancer: interaction.options.getBoolean('necromancien'),
      includeSectarian: interaction.options.getBoolean('sectaire_abominable'),
      includeDevotedServant: interaction.options.getBoolean('servante_devouee'),
      includeInfectFather: interaction.options.getBoolean('infect_pere_loups'),
      includeDogWolf: interaction.options.getBoolean('chien_loup'),
      includeDictateur: interaction.options.getBoolean('dictateur'),
      includeHackeur: interaction.options.getBoolean('hackeur'),
      tiebreakerRandom: interaction.options.getBoolean('tiebreaker_random'),
      skipFirstNightKill: interaction.options.getBoolean('premiere_nuit_sans_meurtre'),
      revealDeadRoles: interaction.options.getBoolean('roles_morts_visibles'),
      darkNightMode: interaction.options.getBoolean('nuit_sombre'),
      gossipSeerMode: interaction.options.getBoolean('voyante_bavarde'),
      tripleLoversMode: interaction.options.getBoolean('menage_trois'),
      announceNightProtection: interaction.options.getBoolean(
        'protection_publique'
      ),
      villageois: interaction.options.getInteger('villageois'),
      villageoisAuto: interaction.options.getBoolean('villageois_auto'),
    });
    return;
  }

  if (commandName === 'lg-leave') {
    await runLgLeave(gameTextChannel, user.id, interaction, undefined);
    return;
  }

  if (commandName === 'lg-start') {
    await runLgStart(
      client,
      gameTextChannel,
      user.id,
      gm,
      interaction,
      undefined
    );
    return;
  }

  if (commandName === 'lg-end') {
    await runLgEnd(
      client,
      guild,
      gameTextChannel,
      user.id,
      gm,
      interaction,
      undefined
    );
    return;
  }

  if (commandName === 'lg-status') {
    await runLgStatus(gameTextChannel, interaction, undefined);
  }
}

async function handleSelect(
  interaction: import('discord.js').StringSelectMenuInteraction
): Promise<void> {
  const id = interaction.customId;
  if (!id.startsWith('lg:')) return;

  const parts = id.split(':');
  if (parts.length < 3) return;
  const channelId = parts[1];
  if (!channelId) return;

  if (parts[2] === 'thief' && parts.length >= 4) {
    const thiefId = parts[3];
    if (!thiefId) return;
    const sessionThief = getSessionByTextChannel(channelId);
    if (!sessionThief) {
      await interaction.reply({
        content: 'Partie inconnue ou terminée.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (interaction.user.id !== thiefId) return;
    const tTarget = interaction.values[0];
    if (!tTarget) return;
    await interaction.deferUpdate().catch(() => undefined);
    fulfillThief(channelId, thiefId, tTarget);
    return;
  }

  if (parts[2] === 'cupid' && parts.length >= 5) {
    const cupidId = parts[3];
    const stepRaw = parts[4];
    if (
      !cupidId ||
      (stepRaw !== '1' && stepRaw !== '2' && stepRaw !== '3')
    )
      return;
    const session = getSessionByTextChannel(channelId);
    if (!session) {
      await interaction.reply({
        content: 'Partie inconnue ou terminée.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (interaction.user.id !== cupidId) return;
    const target = interaction.values[0];
    if (!target) return;
    await interaction.deferUpdate().catch(() => undefined);
    const stepNum =
      stepRaw === '1' ? 1 : stepRaw === '2' ? 2 : 3;
    fulfillCupidPick(channelId, cupidId, stepNum, target);
    return;
  }

  const session = getSessionByTextChannel(channelId);
  if (!session) {
    await interaction.reply({
      content: 'Partie inconnue ou terminée.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const kind = parts[2];
  const target = interaction.values[0];
  if (!target) {
    await interaction.reply({
      content: 'Sélection invalide.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await interaction.deferUpdate();
  } catch {
    return;
  }

  if (kind === 'seer') {
    const seerId = session.seerId();
    if (interaction.user.id !== seerId) return;
    fulfillSeer(channelId, seerId!, target);
    return;
  }

  if (kind === 'guard' && parts.length >= 4) {
    const guardId = parts[3];
    if (!guardId || interaction.user.id !== guardId) return;
    fulfillGuard(channelId, guardId, target);
    return;
  }

  if (kind === 'witch' && parts[3] === 'kill') {
    const witchId = session.witchId();
    if (interaction.user.id !== witchId) return;
    fulfillWitchKill(channelId, target);
    return;
  }

  if (kind === 'vote') {
    if (!session.aliveIds().includes(interaction.user.id)) return;
    fulfillVote(channelId, interaction.user.id, target);
    return;
  }

  if (kind === 'hunter') {
    const hp = session.getPlayer(interaction.user.id);
    if (!hp || hp.role !== Role.Hunter) return;
    fulfillHunterSelect(channelId, interaction.user.id, target);
    return;
  }

  if (kind === 'raven') {
    const ravenId = session.ravenId();
    if (interaction.user.id !== ravenId) return;
    fulfillRaven(channelId, target);
  }

  if (kind === 'bigbadwolf') {
    const bbwId = session.bigBadWolfId();
    if (interaction.user.id !== bbwId) return;
    fulfillBigBadWolf(channelId, target);
  }

  if (kind === 'whitewolf') {
    const wwId = session.whiteWerewolfId();
    if (interaction.user.id !== wwId) return;
    fulfillWhiteWolf(channelId, target);
  }

  if (kind === 'piedpiper') {
    const piperId = session.piedPiperId();
    if (interaction.user.id !== piperId) return;
    fulfillPiedPiper(channelId, target);
  }

  if (kind === 'wildchild') {
    const wcId = session.wildChildId();
    if (interaction.user.id !== wcId) return;
    fulfillWildChild(channelId, wcId, target);
  }

  if (kind === 'scapegoat') {
    const sgId = [...session.players.values()].find(
      (p) => p.role === Role.Scapegoat && !p.alive
    )?.userId;
    if (interaction.user.id !== sgId) return;
    fulfillScapegoat(channelId, target);
  }

  if (kind === 'fox') {
    const foxId = session.foxId();
    if (interaction.user.id !== foxId) return;
    fulfillFox(channelId, target);
  }

  if (kind === 'pyromaniac') {
    const pyroId = session.pyromaniacId();
    if (interaction.user.id !== pyroId) return;
    fulfillPyromaniac(channelId, target);
  }

  if (kind === 'docteur') {
    if (interaction.user.id !== session.docteurId()) return;
    fulfillDocteur(channelId, target);
  }

  if (kind === 'sectarian') {
    if (interaction.user.id !== session.sectarianId()) return;
    fulfillSectarian(channelId, target);
  }

  if (kind === 'dictateur' && parts[3] === 'pick') {
    if (interaction.user.id !== session.dictateurId()) return;
    fulfillDictateurPick(channelId, target);
  }

  if (kind === 'hackeur') {
    if (interaction.user.id !== session.hackeurId()) return;
    fulfillHackeur(channelId, target);
  }
}

async function handleButton(
  interaction: import('discord.js').ButtonInteraction
): Promise<void> {
  const id = interaction.customId;
  if (!id.startsWith('lg:')) return;

  const parts = id.split(':');
  if (parts.length < 4) return;
  const channelId = parts[1];
  if (!channelId) return;

  if (parts[2] === 'aftergame') {
    if (parts[3] === 'replay') {
      await handleAfterGameReplay(interaction);
      return;
    }
    if (parts[3] === 'close') {
      await handleAfterGameClose(client, interaction);
      return;
    }
    return;
  }

  if (parts[2] === 'lobby' && parts[3] === 'join') {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'Utilise ce bouton dans un serveur.',
        ephemeral: true,
      });
      return;
    }
    const guildCh = await guild.channels.fetch(channelId).catch(() => null);
    if (!guildCh?.isTextBased() || guildCh.isDMBased()) {
      await interaction.reply({
        content: 'Salon de partie introuvable.',
        ephemeral: true,
      });
      return;
    }
    const tc = guildCh as import('discord.js').GuildTextBasedChannel;
    const member = interaction.member instanceof GuildMember ? interaction.member : null;
    await runLgJoin(tc, interaction.user.id, member, interaction, undefined);
    return;
  }

  if (parts[2] === 'lobby' && parts[3] === 'leave') {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'Utilise ce bouton dans un serveur.',
        ephemeral: true,
      });
      return;
    }
    const guildCh = await guild.channels.fetch(channelId).catch(() => null);
    if (!guildCh?.isTextBased() || guildCh.isDMBased()) {
      await interaction.reply({
        content: 'Salon de partie introuvable.',
        ephemeral: true,
      });
      return;
    }
    const tc = guildCh as import('discord.js').GuildTextBasedChannel;
    await runLgLeave(tc, interaction.user.id, interaction, undefined);
    return;
  }

  if (parts[2] === 'lobby' && parts[3] === 'start') {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'Utilise ce bouton dans un serveur.',
        ephemeral: true,
      });
      return;
    }
    const guildCh = await guild.channels.fetch(channelId).catch(() => null);
    if (!guildCh?.isTextBased() || guildCh.isDMBased()) {
      await interaction.reply({
        content: 'Salon de partie introuvable.',
        ephemeral: true,
      });
      return;
    }
    const tc = guildCh as import('discord.js').GuildTextBasedChannel;
    const member = interaction.member instanceof GuildMember ? interaction.member : null;
    await runLgStart(client, tc, interaction.user.id, member, interaction, undefined);
    return;
  }

  if (parts[2] === 'littlegirl' && (parts[3] === 'yes' || parts[3] === 'no')) {
    const sessionLg = getSessionByTextChannel(channelId);
    const lgId = sessionLg?.littleGirlId();
    if (!sessionLg || interaction.user.id !== lgId) {
      await interaction
        .reply({
          content: 'Ce choix est réservé à la **Petite fille**.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => undefined);
      return;
    }
    await interaction.deferUpdate().catch(() => undefined);
    fulfillLittleGirlSpy(channelId, parts[3] === 'yes');
    return;
  }

  const session = getSessionByTextChannel(channelId);
  if (!session) {
    await interaction.reply({
      content: 'Partie inconnue ou terminée.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  if (parts[2] === 'witch' && parts[3] === 'save' && parts[4]) {
    const witchId = session.witchId();
    if (interaction.user.id !== witchId) return;
    const yes = parts[4] === 'yes';
    fulfillWitchSave(channelId, yes ? 'yes' : 'no');
    return;
  }

  if (parts[2] === 'witch' && parts[3] === 'skip') {
    const witchId = session.witchId();
    if (interaction.user.id !== witchId) return;
    fulfillWitchKill(channelId, 'skip');
    return;
  }

  if (parts[2] === 'raven' && parts[3] === 'skip') {
    const ravenId = session.ravenId();
    if (interaction.user.id !== ravenId) return;
    fulfillRaven(channelId, 'skip');
    return;
  }

  if (parts[2] === 'bigbadwolf' && parts[3] === 'skip') {
    const bbwId = session.bigBadWolfId();
    if (interaction.user.id !== bbwId) return;
    fulfillBigBadWolf(channelId, 'skip');
  }

  if (parts[2] === 'whitewolf' && parts[3] === 'skip') {
    const wwId = session.whiteWerewolfId();
    if (interaction.user.id !== wwId) return;
    fulfillWhiteWolf(channelId, 'skip');
  }

  if (parts[2] === 'scapegoat' && parts[3] === 'skip') {
    const sgId = [...session.players.values()].find(
      (p) => p.role === Role.Scapegoat && !p.alive
    )?.userId;
    if (interaction.user.id !== sgId) return;
    fulfillScapegoat(channelId, 'skip');
  }

  if (parts[2] === 'pyromaniac' && parts[3] === 'ignite') {
    const pyroId = session.pyromaniacId();
    if (interaction.user.id !== pyroId) return;
    await interaction.deferUpdate().catch(() => null);
    fulfillPyromaniacIgnite(channelId);
  }

  if (parts[2] === 'devotedservant') {
    const servantId = session.devotedServantId();
    if (interaction.user.id !== servantId) return;
    await interaction.deferUpdate().catch(() => null);
    fulfillDevotedServant(channelId, parts[3] ?? 'no');
  }

  if (parts[2] === 'infectfather') {
    const infectId = session.infectFatherId();
    if (interaction.user.id !== infectId) return;
    await interaction.deferUpdate().catch(() => null);
    const choice = parts[3] ?? 'skip';
    fulfillInfectFather(channelId, choice);
  }

  if (parts[2] === 'dogwolf') {
    const dogId = session.dogWolfId();
    if (interaction.user.id !== dogId) return;
    await interaction.deferUpdate().catch(() => null);
    const choice = parts[3] ?? 'village';
    fulfillDogWolf(channelId, choice);
  }

  if (parts[2] === 'dictateur' && (parts[3] === 'act' || parts[3] === 'skip')) {
    const dictId = session.dictateurId();
    if (interaction.user.id !== dictId) return;
    await interaction.deferUpdate().catch(() => null);
    fulfillDictateurTrigger(channelId, parts[3]);
  }
}

function printMessageContentIntentHelp(): void {
  console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Erreur Discord : "Used disallowed intents"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tu as PREFIX_COMMANDS=true dans .env, donc le bot demande
  l'intent "Message Content". Discord le refuse si tu ne l'as
  pas activé sur le portail pour CETTE application.

  À faire :
  1) https://discord.com/developers/applications
  2) Clique sur ton application (même CLIENT_ID que dans .env)
  3) Onglet "Bot" → section "Privileged Gateway Intents"
  4) Coche "MESSAGE CONTENT INTENT"
  5) Clique "Save Changes" en bas
  6) Relance : npm run dev

  Alternative : enlève PREFIX_COMMANDS ou mets PREFIX_COMMANDS=false
  pour n'utiliser que les commandes / slash (sans intent privilégié).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

function isDisallowedIntentError(e: unknown): boolean {
  const s = String(e instanceof Error ? e.message : e);
  return s.includes('disallowed intents') || s.includes('Used disallowed intents');
}

function isInteractionExpiredError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as { code?: number; message?: string };
  if (o.code === 10062) return true;
  return (
    typeof o.message === 'string' &&
    (o.message.includes('10062') || o.message.includes('Unknown interaction'))
  );
}

process.on('uncaughtException', (err) => {
  if (isDisallowedIntentError(err) && enablePrefixCommands) {
    printMessageContentIntentHelp();
    process.exit(1);
  }
  if (isInteractionExpiredError(err)) {
    console.warn('[discord] Interaction expirée (10062), ignorée.');
    return;
  }
  throw err;
});

process.on('unhandledRejection', (reason) => {
  if (isDisallowedIntentError(reason) && enablePrefixCommands) {
    printMessageContentIntentHelp();
    process.exit(1);
  }
  if (isInteractionExpiredError(reason)) {
    console.warn('[discord] Interaction expirée (10062), promesse rejetée ignorée.');
    return;
  }
});

client.login(discordToken).catch((err: unknown) => {
  if (isDisallowedIntentError(err) && enablePrefixCommands) {
    printMessageContentIntentHelp();
  } else {
    console.error(err);
  }
  process.exit(1);
});

