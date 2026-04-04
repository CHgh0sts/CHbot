import {
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type GuildChannel,
  type GuildTextBasedChannel,
  type Message,
  PermissionFlagsBits,
} from 'discord.js';
import { MAX_PLAYERS } from '../config';
import { fetchPartyPresetComposition } from '../services/StatsApiService';
import { normalizePartyPresetComposition } from '../game/partyPresetNormalize';
import { normalizeDiscordPresetCode } from '../utils/presetCode';
import type { CompositionConfig } from '../game/composition';
import type { LgConfigOptions } from '../types/lgConfig';
import { checkCompositionTierGate } from '../services/compositionTierGate';
import {
  CONFIG_MAX_WOLVES,
  CONFIG_MIN_PLAYERS,
  fixedCompositionTotal,
  formatCompositionReadable,
  roleLabelFr,
  rolePowerBlurb,
  villagerCountToMatchMinPlayers,
} from '../game/composition';
import {
  createGamePartyChannels,
  deleteGamePartyChannels,
  fetchPartyChannels,
  grantPlayerGameAccess,
  revokePlayerGameAccess,
} from '../services/ChannelService';
import {
  disconnectLobbyPlayerFromStage,
  promoteJoinedPlayerToStageSpeaker,
  serverUnmuteAllOnGameStage,
} from '../services/StageVoiceService';
import { GameSession } from '../game/GameSession';
import {
  getSessionByTextChannel,
  registerSession,
  removeSession,
} from '../game/GameManager';
import { resolvePlayerTargetByQuery } from '../game/playerResolve';
import { refreshWolfVoteBoard, runNightSequence } from '../game/phases/nightPhase';
import { cancelAllForChannel } from '../interaction/pending';
import { deliverRoleToPlayer } from '../services/RoleDeliveryService';
import {
  refreshLobbyMessage,
  sendLobbyMessage,
} from '../services/LobbyMessageService';
import { deleteAllGameThreads } from '../services/PostGameService';

type Reply = (content: string, ephemeral?: boolean) => Promise<void>;

/**
 * À appeler **avant** tout travail lent (refresh lobby, permissions, etc.) pour éviter
 * DiscordAPIError[10062] « Unknown interaction » (~3 s max sans réponse).
 */
async function deferEphemeralIfInteraction(
  interaction: ChatInputCommandInteraction | ButtonInteraction | undefined
): Promise<void> {
  if (!interaction) return;
  if (interaction.deferred || interaction.replied) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

function createAdaptiveReply(
  interaction: ChatInputCommandInteraction | ButtonInteraction | undefined,
  message: Message | undefined
): Reply {
  return async (content, ephemeral = true) => {
    if (interaction) {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content });
        } else {
          await interaction.reply({
            content,
            flags: ephemeral ? MessageFlags.Ephemeral : undefined,
          });
        }
      } catch (err) {
        console.error('[interaction reply]', err);
      }
    } else if (message) {
      await message.reply(content).catch((e) => console.error(e));
    }
  };
}

function memberPerms(
  member: GuildMember | null,
  interaction?: ChatInputCommandInteraction | ButtonInteraction
): { manageChannels: boolean; manageGuild: boolean } {
  if (interaction?.memberPermissions) {
    return {
      manageChannels: interaction.memberPermissions.has(
        PermissionFlagsBits.ManageChannels
      ),
      manageGuild: interaction.memberPermissions.has(
        PermissionFlagsBits.ManageGuild
      ),
    };
  }
  if (member?.permissions) {
    return {
      manageChannels: member.permissions.has(PermissionFlagsBits.ManageChannels),
      manageGuild: member.permissions.has(PermissionFlagsBits.ManageGuild),
    };
  }
  return { manageChannels: false, manageGuild: false };
}

/** Salon dont on copie les permissions (fil → parent). */
function resolvePermsSourceChannel(channel: GuildTextBasedChannel): GuildChannel {
  if (channel.isThread()) {
    const p = channel.parent;
    if (!p) throw new Error('THREAD_PARENT');
    return p as GuildChannel;
  }
  return channel as unknown as GuildChannel;
}

async function deferredReply(
  interaction: ChatInputCommandInteraction | undefined,
  message: Message | undefined,
  run: () => Promise<string>
): Promise<void> {
  if (interaction) {
    await interaction.deferReply({ ephemeral: true });
    const text = await run();
    await interaction.editReply({ content: text });
    return;
  }
  if (message) {
    const pending = await message.reply('…');
    const text = await run();
    await pending.edit(text);
  }
}

export async function runLgSetup(
  guild: Guild,
  sourceChannel: GuildTextBasedChannel,
  userId: string,
  member: GuildMember | null,
  interaction: ChatInputCommandInteraction | undefined,
  message: Message | undefined,
  nom: string,
  _vocalChannelId: string | null,
  /** Code 5 car. depuis le site (optionnel) */
  presetCode: string | null
): Promise<void> {
  const reply: Reply = async (c, ep = true) => {
    if (interaction) await interaction.reply({ content: c, ephemeral: ep });
    else if (message) await message.reply(c);
  };

  const { manageChannels } = memberPerms(member, interaction);
  if (!manageChannels) {
    await reply('Tu as besoin de la permission **Gérer les salons**.');
    return;
  }

  let permsSource: GuildChannel;
  try {
    permsSource = resolvePermsSourceChannel(sourceChannel);
  } catch {
    await reply('Impossible de déterminer le salon parent pour copier les permissions.');
    return;
  }

  if (interaction) {
    await interaction.deferReply({ ephemeral: true });
  }

  try {
    let presetComposition: CompositionConfig | null = null;
    const presetNorm = normalizeDiscordPresetCode(presetCode);
    if (presetNorm) {
      const raw = await fetchPartyPresetComposition(presetNorm);
      if (!raw) {
        const err = `Code preset **${presetNorm}** introuvable (vérifie sur le site ou la variable \`STATS_API_BASE_URL\` du bot).`;
        if (interaction) {
          await interaction.editReply({ content: err });
        } else if (message) {
          await message.reply(err);
        }
        return;
      }
      presetComposition = normalizePartyPresetComposition(raw);
      if (!presetComposition) {
        const err = `Preset **${presetNorm}** invalide (composition incohérente).`;
        if (interaction) {
          await interaction.editReply({ content: err });
        } else if (message) {
          await message.reply(err);
        }
        return;
      }
    }

    const { stage, threadParent } = await createGamePartyChannels(
      guild,
      permsSource,
      nom
    );

    const session = new GameSession(
      stage.id,
      threadParent.id,
      guild.id,
      permsSource.parentId,
      userId
    );
    if (presetComposition && presetNorm) {
      session.compositionConfig = presetComposition;
      session.presetPublicCode = presetNorm;
    }
    session.lobbyPlayers.add(userId);
    session.voiceChannelId = stage.id;
    registerSession(session);
    await grantPlayerGameAccess(stage, threadParent, userId);

    await sendLobbyMessage(stage, session);

    try {
      await sourceChannel.send({
        content:
          `**Loup-Garou** — **Scène** créée : ${stage}\n` +
          `Rejoins le **vocal** de la scène, puis le bouton **Rejoindre** dans le chat de la scène _(\`*join\`)_.` +
          (presetNorm
            ? `\n_Config du site (**${presetNorm}**) appliquée._`
            : ''),
      });
    } catch (sendErr) {
      console.error('Annonce /lg-init :', sendErr);
    }

    if (interaction) {
      await interaction.editReply({
        content:
          `Partie créée : ${stage}\n` +
          `Un message avec le lien a été posté dans ce salon.` +
          (presetNorm
            ? `\nPreset **${presetNorm}** appliqué.`
            : ''),
      });
    }
  } catch (e) {
    console.error(e);
    const err =
      'Échec de la création du salon (permissions du bot, limite de salons, ou copie des droits impossible).';
    if (interaction) {
      await interaction.editReply({ content: err });
    } else if (message) {
      await message.reply(err);
    }
  }
}

export async function runLgVote(
  client: Client,
  gameTextChannel: GuildTextBasedChannel,
  userId: string,
  interaction: ChatInputCommandInteraction,
  pseudo: string
): Promise<void> {
  const session = getSessionByTextChannel(gameTextChannel.id);
  if (!session) {
    await interaction.reply({
      content: 'Aucune partie enregistrée pour ce salon.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (session.phase !== 'night' || session.nightSubPhase !== 'wolves') {
    await interaction.reply({
      content: 'Ce n’est pas la phase de vote des loups.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!session.wolfIds().includes(userId)) {
    await interaction.reply({
      content: 'Seuls les Loups-Garous peuvent utiliser `/lg-vote`.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targets = session.aliveIds().filter((id) => !session.wolfIds().includes(id));
  const allowed = new Set(targets);
  const targetId = resolvePlayerTargetByQuery(pseudo, session, allowed);
  if (!targetId) {
    const names = targets
      .map((id) => session.getPlayer(id)?.displayName)
      .filter(Boolean)
      .join(', ');
    await interaction.reply({
      content:
        `Cible introuvable. Indique le **pseudo** (comme affiché dans la partie) ou une mention. ` +
        (names ? `Joueurs : ${names}` : ''),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  session.wolfVotesByWolf.set(userId, targetId);
  await refreshWolfVoteBoard(client, session);
  await interaction.editReply({
    content: `Vote enregistré : **${session.getPlayer(targetId)?.displayName ?? 'cible'}**`,
  });
}

export async function runLgJoin(
  guildChannel: GuildTextBasedChannel,
  userId: string,
  member: GuildMember | null,
  interaction: ChatInputCommandInteraction | ButtonInteraction | undefined,
  message: Message | undefined
): Promise<void> {
  await deferEphemeralIfInteraction(interaction);
  const reply = createAdaptiveReply(interaction, message);

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session || session.phase !== 'lobby') {
    await reply(
      'Aucune partie en lobby dans ce salon. Utilise `/lg-init` ou `*init` pour créer une partie.'
    );
    return;
  }

  if (session.lobbyPlayers.size >= MAX_PLAYERS) {
    await reply('La partie est pleine.');
    return;
  }

  const guild = guildChannel.guild;
  const voiceId = member?.voice.channelId ?? null;
  if (voiceId !== session.voiceChannelId) {
    await reply(
      `Rejoins d’abord le **vocal** de la scène <#${session.voiceChannelId ?? session.textChannelId}>, puis reclique sur **Rejoindre**.`
    );
    return;
  }

  const { stage, threadParent } = await fetchPartyChannels(guild, session);
  if (!stage || !threadParent) {
    await reply('Salons de partie introuvables.');
    return;
  }

  session.lobbyPlayers.add(userId);
  await grantPlayerGameAccess(stage, threadParent, userId);
  await promoteJoinedPlayerToStageSpeaker(guild, session, member);
  await refreshLobbyMessage(session, stage);
  await reply(`Tu as rejoint la partie (${session.lobbyPlayers.size} joueurs).`);
}

export async function runLgLeave(
  guildChannel: GuildTextBasedChannel,
  userId: string,
  interaction: ChatInputCommandInteraction | ButtonInteraction | undefined,
  message: Message | undefined
): Promise<void> {
  await deferEphemeralIfInteraction(interaction);
  const reply = createAdaptiveReply(interaction, message);

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session || session.phase !== 'lobby') {
    await reply('Pas de lobby actif ici.');
    return;
  }
  const guild = guildChannel.guild;
  const { stage, threadParent } = await fetchPartyChannels(guild, session);
  session.lobbyPlayers.delete(userId);
  if (stage && threadParent) {
    await revokePlayerGameAccess(stage, threadParent, userId);
  }
  await disconnectLobbyPlayerFromStage(guild, session, userId);
  if (stage) await refreshLobbyMessage(session, stage);
  await reply('Tu as quitté le lobby.');
}

export async function runLgStart(
  client: Client,
  guildChannel: GuildTextBasedChannel,
  userId: string,
  member: GuildMember | null,
  interaction: ChatInputCommandInteraction | ButtonInteraction | undefined,
  message: Message | undefined
): Promise<void> {
  const reply: Reply = async (c, ep = true) => {
    if (interaction) await interaction.reply({ content: c, ephemeral: ep });
    else if (message) await message.reply(c);
  };

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session || session.phase !== 'lobby') {
    await reply('Pas de partie en lobby dans ce salon.');
    return;
  }

  const { manageGuild } = memberPerms(member, interaction);
  if (session.hostId !== userId && !manageGuild) {
    await reply('Seul l’hôte de la partie (ou un modérateur) peut lancer.');
    return;
  }

  const minP = session.compositionConfig.minPlayers;
  if (session.lobbyPlayers.size < minP) {
    await reply(
      `Il faut au moins **${minP}** joueurs (actuellement ${session.lobbyPlayers.size}). Utilise \`/lg-config\` pour changer le minimum.`
    );
    return;
  }

  let statusMessage: Message | undefined;
  if (interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } else if (message) {
    statusMessage = await message.reply('Lancement de la partie…');
  }

  try {
    session.assignRolesFromLobby();
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : 'Composition invalide — ajuste `/lg-config`.';
    if (interaction) {
      await interaction.editReply({ content: msg });
    } else if (statusMessage) {
      await statusMessage.edit(msg);
    }
    return;
  }
  await session.hydrateDisplayNames(client);

  const failed: string[] = [];

  for (const [uid, p] of session.players) {
    const embed = new EmbedBuilder()
      .setTitle('Ton rôle')
      .setDescription(
        `Tu es **${roleLabelFr(p.role)}**.\n\n${rolePowerBlurb(p.role)}`
      )
      .setColor(0x2b2d31);

    const ok = await deliverRoleToPlayer(
      client,
      session,
      uid,
      p.displayName,
      embed,
      p.role
    );

    if (!ok) failed.push(`<@${uid}>`);

    await new Promise((r) => setTimeout(r, 400));
  }

  await guildChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Rôles distribués')
        .setDescription(
          'Chaque joueur a un **fil privé** (salon technique) avec son rôle. Actions secrètes dans ces fils — **pas de MP**. Sur la **scène**, les vivants restent **orateurs** ; les morts passent **auditeurs**.'
        )
        .setColor(0x57f287),
    ],
  });

  if (session.lobbyMessageId) {
    const lobbyMsg = await guildChannel.messages
      .fetch(session.lobbyMessageId)
      .catch(() => null);
    if (lobbyMsg?.editable) {
      await lobbyMsg.edit({ components: [] }).catch(() => undefined);
    }
  }

  session.phase = 'night';
  const msg =
    failed.length > 0
      ? `Partie lancée. Fils impossibles pour : ${failed.join(', ')} (vérifie les fils privés / salon \`-fils\`).`
      : 'Partie lancée. Ouvre ton **fil privé** (liste des fils du salon technique) pour ton rôle.';

  if (interaction) {
    await interaction.editReply({ content: msg });
  } else if (statusMessage) {
    await statusMessage.edit(msg);
  }

  await runNightSequence(client, session, guildChannel);
}

export type { LgConfigOptions };

export async function runLgConfig(
  guildChannel: GuildTextBasedChannel,
  userId: string,
  member: GuildMember | null,
  interaction: ChatInputCommandInteraction | undefined,
  message: Message | undefined,
  options: LgConfigOptions
): Promise<void> {
  await deferEphemeralIfInteraction(interaction);
  const reply = createAdaptiveReply(interaction, message);

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session || session.phase !== 'lobby') {
    await reply(
      'Aucune partie en lobby dans ce salon. Lance `/lg-config` dans le salon créé par `/lg-init`.'
    );
    return;
  }

  const { manageGuild } = memberPerms(member, interaction);
  if (session.hostId !== userId && !manageGuild) {
    await reply(
      'Seul l’hôte (ou un modérateur avec **Gérer le serveur**) peut modifier la config.'
    );
    return;
  }

  const hasChange =
    options.minPlayers !== null ||
    options.wolfCount !== null ||
    options.loupsAuto === true ||
    options.includeSeer !== null ||
    options.includeWitch !== null ||
    options.includeHunter !== null ||
    options.includeCupid !== null ||
    options.includeGuard !== null ||
    options.includeThief !== null ||
    options.includeAngel !== null ||
    options.includeLittleGirl !== null ||
    options.includeRaven !== null ||
    options.includeRedRidingHood !== null ||
    options.revealDeadRoles !== null ||
    options.darkNightMode !== null ||
    options.gossipSeerMode !== null ||
    options.tripleLoversMode !== null ||
    options.announceNightProtection !== null ||
    options.villageois !== null ||
    options.villageoisAuto === true;

  if (!hasChange) {
    await reply(
      `**Réglages actuels**\n${formatCompositionReadable(session.compositionConfig, session.lobbyPlayers.size)}`
    );
    return;
  }

  const tierMsg = await checkCompositionTierGate(
    userId,
    options,
    session.compositionConfig
  );
  if (tierMsg) {
    await reply(tierMsg);
    return;
  }

  const c = session.compositionConfig;

  if (options.minPlayers !== null) {
    if (options.minPlayers < CONFIG_MIN_PLAYERS || options.minPlayers > MAX_PLAYERS) {
      await reply(
        `Le minimum doit être entre **${CONFIG_MIN_PLAYERS}** et **${MAX_PLAYERS}**.`
      );
      return;
    }
    c.minPlayers = options.minPlayers;
  }

  if (options.loupsAuto === true) {
    c.wolfCount = null;
  } else if (options.wolfCount !== null) {
    if (options.wolfCount < 1 || options.wolfCount > CONFIG_MAX_WOLVES) {
      await reply(
        `Le nombre de loups doit être entre **1** et **${CONFIG_MAX_WOLVES}**.`
      );
      return;
    }
    c.wolfCount = options.wolfCount;
  }

  if (options.includeSeer !== null) c.includeSeer = options.includeSeer;
  if (options.includeWitch !== null) c.includeWitch = options.includeWitch;
  if (options.includeHunter !== null) c.includeHunter = options.includeHunter;
  if (options.includeCupid !== null) c.includeCupid = options.includeCupid;
  if (options.includeGuard !== null) c.includeGuard = options.includeGuard;
  if (options.includeThief !== null) c.includeThief = options.includeThief;
  if (options.includeAngel !== null) c.includeAngel = options.includeAngel;
  if (options.includeLittleGirl !== null) {
    c.includeLittleGirl = options.includeLittleGirl;
  }
  if (options.includeRaven !== null) c.includeRaven = options.includeRaven;
  if (options.includeRedRidingHood !== null) c.includeRedRidingHood = options.includeRedRidingHood;
  if (options.revealDeadRoles !== null) c.revealDeadRoles = options.revealDeadRoles;
  if (options.darkNightMode !== null) c.darkNightMode = options.darkNightMode;
  if (options.gossipSeerMode !== null) c.gossipSeerMode = options.gossipSeerMode;
  if (options.tripleLoversMode !== null) c.tripleLoversMode = options.tripleLoversMode;
  if (options.announceNightProtection !== null) {
    c.announceNightProtection = options.announceNightProtection;
  }

  const compositionTouched =
    options.minPlayers !== null ||
    options.wolfCount !== null ||
    options.loupsAuto === true ||
    options.includeSeer !== null ||
    options.includeWitch !== null ||
    options.includeHunter !== null ||
    options.includeCupid !== null ||
    options.includeGuard !== null ||
    options.includeThief !== null ||
    options.includeAngel !== null ||
    options.includeLittleGirl !== null ||
    options.includeRaven !== null ||
    options.includeRedRidingHood !== null;

  if (options.villageoisAuto === true) {
    c.villagerCount = null;
  } else if (options.villageois !== null) {
    if (options.villageois < 0 || options.villageois > MAX_PLAYERS) {
      await reply(
        `Le nombre de villageois doit être entre **0** et **${MAX_PLAYERS}**.`
      );
      return;
    }
    c.villagerCount = options.villageois;
  } else if (compositionTouched) {
    c.villagerCount = villagerCountToMatchMinPlayers(c);
  }

  const fixedTotal = fixedCompositionTotal(c);
  if (fixedTotal !== null && fixedTotal !== c.minPlayers) {
    await reply(
      `Incohérence : minimum **${c.minPlayers}** joueur(s), mais loups + rôles spéciaux + **${c.villagerCount}** villageois = **${fixedTotal}**. Ajuste \`min_joueurs\` (par ex. **${fixedTotal}**), les loups, les spéciaux, \`villageois\`, ou active \`villageois_auto\`.`
    );
    return;
  }

  const { stage } = await fetchPartyChannels(guildChannel.guild, session);
  if (stage) await refreshLobbyMessage(session, stage);
  await reply(
    `**Réglages mis à jour**\n${formatCompositionReadable(session.compositionConfig, session.lobbyPlayers.size)}`
  );
}

export async function runLgEnd(
  client: Client,
  guild: Guild,
  guildChannel: GuildTextBasedChannel,
  userId: string,
  member: GuildMember | null,
  interaction: ChatInputCommandInteraction | undefined,
  message: Message | undefined
): Promise<void> {
  const reply: Reply = async (c, ep = true) => {
    if (interaction) await interaction.reply({ content: c, ephemeral: ep });
    else if (message) await message.reply(c);
  };

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session) {
    await reply('Aucune partie ici.');
    return;
  }

  const { manageChannels } = memberPerms(member, interaction);
  if (session.hostId !== userId && !manageChannels) {
    await reply('Seul l’hôte ou un modérateur peut terminer.');
    return;
  }

  await deferredReply(interaction, message, async () => {
    cancelAllForChannel(session.textChannelId);
    await deleteAllGameThreads(client, session);
    await serverUnmuteAllOnGameStage(guild, session);
    removeSession(session.textChannelId);
    const { stage, threadParent } = await fetchPartyChannels(guild, session);
    if (threadParent && stage) {
      try {
        await deleteGamePartyChannels(threadParent, stage);
      } catch (e) {
        console.warn('[lg-end] Suppression des salons de partie échouée :', e);
      }
    }
    return 'Partie terminée, fils supprimés, scène et salon technique supprimés.';
  });
}

export async function runLgStatus(
  guildChannel: GuildTextBasedChannel,
  interaction: ChatInputCommandInteraction | undefined,
  message: Message | undefined
): Promise<void> {
  const reply: Reply = async (c, ep = true) => {
    if (interaction) await interaction.reply({ content: c, ephemeral: ep });
    else if (message) await message.reply(c);
  };

  const session = getSessionByTextChannel(guildChannel.id);
  if (!session) {
    await reply('Aucune partie enregistrée pour ce salon.');
    return;
  }

  const lines =
    session.phase === 'lobby'
      ? [
          `**Phase** : lobby`,
          `**Inscrits** : ${session.lobbyPlayers.size}`,
          formatCompositionReadable(
            session.compositionConfig,
            session.lobbyPlayers.size
          ),
        ]
      : [
          `**Phase** : ${session.phase}`,
          `**Vivants** : ${session.aliveIds().length}`,
          `**Loups vivants** : ${session.countAliveWolves()}`,
        ];
  await reply(lines.join('\n'));
}
