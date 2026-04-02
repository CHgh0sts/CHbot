import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  type TextChannel,
} from 'discord.js';
import {
  autoWolfCount,
  defaultCompositionConfig,
  formatCompositionReadable,
  roleLabelFr,
  rolePowerBlurb,
  shouldRevealDeadRoles,
  villagerCountToMatchMinPlayers,
} from '../game/composition';
import { formatDeathAnnounces } from '../game/deathAnnounce';
import { GameSession } from '../game/GameSession';
import { announceLoverGriefPublic } from '../game/loversAnnounce';
import { buildWolfVoteBoardContent } from '../game/phases/nightPhase';
import { embedWithRoleCardLarge, embedWithRoleCardThumbnail } from '../game/roleCards';
import { publicEmbed } from '../services/MessagingService';
import { Role, type PlayerState } from '../types';

/** Seul ce compte Discord peut utiliser `/lg-test`. */
const LG_TEST_AUTHORIZED_USER_ID = '342696531108954113';

const F = {
  a: '900000000000000001',
  b: '900000000000000002',
  c: '900000000000000003',
  d: '900000000000000004',
  e: '900000000000000005',
  w1: '900000000000000010',
  w2: '900000000000000011',
  v1: '900000000000000012',
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pl(
  userId: string,
  displayName: string,
  role: Role,
  alive: boolean,
  loverUserId: string | null = null
): PlayerState {
  return { userId, displayName, role, alive, loverUserId };
}

export async function runLgTest(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (interaction.user.id !== LG_TEST_AUTHORIZED_USER_ID) {
    await interaction.reply({
      content: 'Cette commande est réservée aux tests du bot.',
      ephemeral: true,
    });
    return;
  }

  const ch = interaction.channel;
  if (!ch?.isTextBased() || ch.isDMBased()) {
    await interaction.reply({
      content: 'Utilise `/lg-test` dans un salon texte du serveur (pas en MP).',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content:
      '**[lg-test]** Envoi d’une série de messages **fictifs** (compositions, modes, chagrin, nuit sombre, voyante bavarde, etc.). Patiente **~35–50 s**…',
    ephemeral: true,
  });

  const textChannel = ch as GuildTextBasedChannel;
  const delayMs = 380;
  const pause = () => sleep(delayMs);

  const send = async (data: Parameters<GuildTextBasedChannel['send']>[0]) => {
    await textChannel.send(data);
    await pause();
  };

  await send({
    content:
      '━━━━━━━━ **LG-TEST** ━━━━━━━━\n' +
      '_Aperçu du rendu — **aucune** partie n’est créée ; joueurs et mentions sont **factices**._',
  });

  // —— Loups ~25 % ——
  await send({
    content:
      `**Loups en mode auto** : à **8** joueurs → **${autoWolfCount(8)}** loup(s) ; à **12** → **${autoWolfCount(12)}** ; à **16** → **${autoWolfCount(16)}** _(≈ 25 %, minimum 1)._`,
  });

  // —— Composition de base ——
  await send({ content: '**▸** _Composition lobby (Garde + Voleur, sans modes spéciaux)_' });

  const demoConfig = defaultCompositionConfig();
  demoConfig.minPlayers = 8;
  demoConfig.includeGuard = true;
  demoConfig.includeThief = true;
  demoConfig.villagerCount = villagerCountToMatchMinPlayers(demoConfig);
  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('[Lobby] Composition (exemple)')
        .setDescription(formatCompositionReadable(demoConfig, 8))
        .setColor(0x5865f2),
    ],
  });

  // —— Tous les flags config ——
  await send({ content: '**▸** _Même chose avec **nuit sombre**, **voyante bavarde**, **ménage à trois**, **protection publique**_' });

  const demoAllModes = defaultCompositionConfig();
  demoAllModes.minPlayers = 12;
  demoAllModes.includeGuard = true;
  demoAllModes.includeThief = true;
  demoAllModes.darkNightMode = true;
  demoAllModes.gossipSeerMode = true;
  demoAllModes.tripleLoversMode = true;
  demoAllModes.announceNightProtection = true;
  demoAllModes.villagerCount = villagerCountToMatchMinPlayers(demoAllModes);
  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('[Lobby] Tous les modes d’une traite (ex. 12 joueurs)')
        .setDescription(formatCompositionReadable(demoAllModes, 12))
        .setColor(0x5865f2),
    ],
  });

  await send({
    embeds: [
      publicEmbed(
        'Nuit 2',
        'La nuit tombe… Vérifie **tes fils privés** (sous ce salon) pour tes actions.'
      ),
    ],
  });

  // —— Lever du soleil (révélation normale) ——
  await send({ content: '**▸** _Lever du soleil — rôles **visibles** (pas nuit sombre)_' });

  const nightDeaths = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  nightDeaths.compositionConfig.revealDeadRoles = true;
  nightDeaths.compositionConfig.darkNightMode = false;
  nightDeaths.nightNumber = 2;
  nightDeaths.players.set(F.a, pl(F.a, 'Alice', Role.Seer, false));
  nightDeaths.players.set(F.b, pl(F.b, 'Bob', Role.Werewolf, false));
  const descNight =
    `Victimes :\n${formatDeathAnnounces(nightDeaths, [F.a, F.b], true)}`;
  let sunEmbed = publicEmbed('Jour 2 — lever du soleil', descNight);
  {
    const r = nightDeaths.getPlayer(F.a)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(sunEmbed, r);
      sunEmbed = t.embed;
      await send({ embeds: [sunEmbed], files: t.files });
    } else {
      await send({ embeds: [sunEmbed] });
    }
  }

  // —— Nuit sombre : morts sans rôle public ——
  await send({ content: '**▸** _**Nuit sombre** : morts annoncées, **aucun** rôle public (même si « rôles morts visibles » est coché)_' });

  const darkSun = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  darkSun.compositionConfig.revealDeadRoles = true;
  darkSun.compositionConfig.darkNightMode = true;
  darkSun.nightNumber = 2;
  darkSun.players.set(F.a, pl(F.a, 'Alice', Role.Seer, false));
  darkSun.players.set(F.b, pl(F.b, 'Bob', Role.Werewolf, false));
  const revealDark = shouldRevealDeadRoles(darkSun.compositionConfig);
  const descDark = revealDark
    ? `Victimes :\n${formatDeathAnnounces(darkSun, [F.a, F.b], true)}`
    : `Victimes : ${[F.a, F.b].map((id) => `<@${id}>`).join(', ')}`;
  await send({
    embeds: [
      publicEmbed('Jour 2 — lever du soleil [mode nuit sombre]', descDark).setFooter({
        text: 'Rôles non révélés publiquement',
      }),
    ],
  });

  await send({
    embeds: [
      publicEmbed('Jour 1 — lever du soleil', 'Personne n’est mort cette nuit.').setFooter({
        text: 'Aucun mort',
      }),
    ],
  });

  const hidden = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  hidden.compositionConfig.revealDeadRoles = false;
  hidden.compositionConfig.darkNightMode = false;
  hidden.nightNumber = 1;
  hidden.players.set(F.c, pl(F.c, 'Chloé', Role.Villager, false));
  await send({
    embeds: [
      publicEmbed(
        'Jour 1 — lever du soleil',
        `Victimes : <@${F.c}>`
      ).setFooter({ text: 'Chloé' }),
    ],
  });

  // —— Vote + nuit sombre ——
  await send({ content: '**▸** _Résultat du **vote** — d’abord avec rôle, puis **nuit sombre**_' });

  const voteS = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  voteS.compositionConfig.revealDeadRoles = true;
  voteS.compositionConfig.darkNightMode = false;
  voteS.players.set(F.d, pl(F.d, 'David', Role.Werewolf, false));
  const voteDesc = `Éliminés :\n${formatDeathAnnounces(voteS, [F.d], true)}`;
  let voteEmbed = publicEmbed('Résultat du vote', voteDesc).setColor(0xe67e22);
  {
    const r = voteS.getPlayer(F.d)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(voteEmbed, r);
      voteEmbed = t.embed;
      await send({ embeds: [voteEmbed], files: t.files });
    } else {
      await send({ embeds: [voteEmbed] });
    }
  }

  const voteDark = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  voteDark.compositionConfig.revealDeadRoles = true;
  voteDark.compositionConfig.darkNightMode = true;
  voteDark.players.set(F.d, pl(F.d, 'David', Role.Werewolf, false));
  const vd = shouldRevealDeadRoles(voteDark.compositionConfig)
    ? `Éliminés :\n${formatDeathAnnounces(voteDark, [F.d], true)}`
    : `Éliminés : <@${F.d}>`;
  await send({
    embeds: [
      publicEmbed('Résultat du vote [nuit sombre]', vd).setColor(0xe67e22),
    ],
  });

  // —— Chasseur ——
  await send({ content: '**▸** _Chasseur — annonces publiques_' });

  const hunt1 = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  hunt1.compositionConfig.revealDeadRoles = true;
  hunt1.compositionConfig.darkNightMode = false;
  hunt1.players.set(F.e, pl(F.e, 'Eva', Role.Hunter, true));
  const h1Desc = `${formatDeathAnnounces(hunt1, [F.e], true)}\n\n_Le **Chasseur** fait **son choix** dans **son fil privé** — le **tir** sera annoncé ici juste après, puis le récap des victimes._`;
  let h1 = publicEmbed('Élimination', h1Desc).setColor(0xe67e22);
  {
    const r = hunt1.getPlayer(F.e)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(h1, r);
      h1 = t.embed;
      await send({ embeds: [h1], files: t.files });
    } else {
      await send({ embeds: [h1] });
    }
  }

  const hunt2 = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  hunt2.compositionConfig.revealDeadRoles = true;
  hunt2.compositionConfig.darkNightMode = false;
  hunt2.players.set(F.a, pl(F.a, 'Alice', Role.Hunter, false));
  hunt2.players.set(F.b, pl(F.b, 'Bob', Role.Villager, false));
  const h2Desc = `<@${F.a}> (**Chasseur**) emmène avec lui :\n${formatDeathAnnounces(hunt2, [F.b], true)}`;
  let h2 = publicEmbed('Tir du Chasseur', h2Desc).setColor(0xe67e22);
  {
    const r = hunt2.getPlayer(F.b)?.role;
    if (r !== undefined) {
      const t = embedWithRoleCardThumbnail(h2, r);
      h2 = t.embed;
      await send({ embeds: [h2], files: t.files });
    } else {
      await send({ embeds: [h2] });
    }
  }

  // —— Chagrin d’amour (vrai embed production) ——
  await send({ content: '**▸** _**Chagrin d’amour** — texte narratif **réel** du bot (`announceLoverGriefPublic`)_' });

  const loveReveal = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  loveReveal.compositionConfig.revealDeadRoles = true;
  loveReveal.compositionConfig.darkNightMode = false;
  loveReveal.players.set(F.c, pl(F.c, 'Dry', Role.Villager, false));
  loveReveal.players.set(F.d, pl(F.d, 'K6', Role.Werewolf, false));
  await announceLoverGriefPublic(
    loveReveal,
    textChannel as TextChannel,
    F.c,
    F.d
  );
  await pause();

  const loveDark = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  loveDark.compositionConfig.revealDeadRoles = true;
  loveDark.compositionConfig.darkNightMode = true;
  loveDark.players.set(F.c, pl(F.c, 'Dry', Role.Villager, false));
  loveDark.players.set(F.d, pl(F.d, 'K6', Role.Werewolf, false));
  await announceLoverGriefPublic(
    loveDark,
    textChannel as TextChannel,
    F.c,
    F.d
  );
  await pause();

  // —— Cupidon salon ——
  await send({ content: '**▸** _Cupidon — annonces **salon** (couple vs ménage à trois)_' });

  await send({
    embeds: [
      publicEmbed(
        'Cupidon',
        'Les **deux amoureux** ont été prévenus **en secret** dans leurs fils privés.\n_(Fil commun indisponible — personne d’autre ne connaît le couple.)_'
      ).setColor(0xe91e63),
    ],
  });

  await send({
    embeds: [
      publicEmbed(
        'Cupidon',
        'Les **trois** joueurs liés ont été prévenus **en secret** dans leurs fils privés.\n_(Fil commun indisponible.)_'
      ).setColor(0xe91e63),
    ],
  });

  // —— Voyante classique vs bavarde ——
  await send({
    content:
      '**▸** _Voyante — fil privé **classique** vs **bavarde** ; puis message **aube** bavarde (sans rôle d’un **vivant**)_',
  });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Voyante — résultat (fil privé, classique)')
        .setDescription('**Paul le Villageois** n’est **pas** un Loup-Garou.')
        .setColor(0x57f287),
    ],
  });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Voyante bavarde — fil privé')
        .setDescription(
          'Cible : **Paul le Villageois** — rôle : **Villageois**.\n\n_Resté confidentiel tant que vivant ; rôle public seulement dans une annonce de mort si la config le permet._'
        )
        .setColor(0x9b59b6),
    ],
  });

  await send({
    embeds: [
      publicEmbed(
        'Voyante bavarde',
        'La **Voyante bavarde** a mené son enquête pendant la nuit. Le **rôle exact** d’un joueur **encore vivant** ne s’affiche pas ici : **uniquement** dans une **annonce de mort** le cas échéant.'
      ).setColor(0x9b59b6),
    ],
  });

  const wolfBoard = new GameSession('0', '0', '0', null, LG_TEST_AUTHORIZED_USER_ID);
  wolfBoard.nightNumber = 3;
  wolfBoard.wolfVoteDeadlineAt = Date.now() + 45_000;
  wolfBoard.players.set(F.w1, pl(F.w1, 'Loup Marc', Role.Werewolf, true));
  wolfBoard.players.set(F.w2, pl(F.w2, 'Loup Julie', Role.Werewolf, true));
  wolfBoard.players.set(F.v1, pl(F.v1, 'Paul le Villageois', Role.Villager, true));
  wolfBoard.wolfVotesByWolf.set(F.w1, F.v1);
  wolfBoard.wolfVotesByWolf.set(F.w2, F.v1);
  await send({ content: '**▸** _Tableau de votes **Meute**_' });
  await send({ content: buildWolfVoteBoardContent(wolfBoard) });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Sorcière — potion de vie (fil privé)')
        .setDescription(
          'Les loups visent **Paul le Villageois**. Utiliser la **potion de vie** ?'
        )
        .setColor(0x2ecc71),
    ],
  });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Sorcière — potion de mort (fil privé)')
        .setDescription(
          'Tu peux empoisonner **un joueur vivant**, ou passer ton tour.'
        )
        .setColor(0x992d22),
    ],
  });

  await send({ content: '**▸** _Garde — fil privé + annonce **protection publique** (option config)_' });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Garde — confirmation (fil privé)')
        .setDescription('Tu protèges **Paul le Villageois** cette nuit.')
        .setColor(0x3498db),
    ],
  });

  await send({
    embeds: [
      publicEmbed(
        'Nuit — protection',
        'Quelqu’un a passé la nuit **à l’abri des griffes des loups** (pouvoir de protection actif).'
      ).setColor(0x3498db),
    ],
  });

  const rolePriv = new EmbedBuilder()
    .setTitle('[Exemple fil privé] Ton rôle')
    .setDescription(
      `Tu es **${roleLabelFr(Role.Guard)}**.\n\n${rolePowerBlurb(Role.Guard)}`
    )
    .setColor(0x2b2d31);
  {
    const t = embedWithRoleCardLarge(rolePriv, Role.Guard);
    await send({
      content: '_Carte **grande** (fil privé) :_',
      embeds: [t.embed],
      files: t.files,
    });
  }

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Rôles distribués')
        .setDescription(
          'Chaque joueur a un **fil privé** sous ce salon avec son rôle. Toutes les actions secrètes (nuits, votes) s’y passent aussi — **pas de MP**.'
        )
        .setColor(0x57f287),
    ],
  });

  await send({ content: '**▸** _Fin de partie — village / **amoureux** / **ménage à trois**_' });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Partie terminée')
        .setDescription(
          '**Victoire du village** — tous les Loups-Garous ont été éliminés.\n_(Exemple — sans boutons replay / fermer.)_'
        )
        .setColor(0x57f287),
    ],
  });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Partie terminée')
        .setDescription(
          '**Les Amoureux** remportent la partie (derniers survivants ensemble).\n_(Exemple de texte — fils supprimés en vraie partie.)_'
        )
        .setColor(0xff69b4),
    ],
  });

  await send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Partie terminée')
        .setDescription(
          '**Le ménage à trois** remporte la partie (derniers survivants du lien).\n_(Exemple de texte — fils supprimés en vraie partie.)_'
        )
        .setColor(0xff69b4),
    ],
  });

  await textChannel.send({
    content:
      '━━━━━━━━ **Fin LG-TEST** ━━━━━━━━\n' +
      '_Tu peux relancer `/lg-test` après chaque changement de rendu._',
  });
}
