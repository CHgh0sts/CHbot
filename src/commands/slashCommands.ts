import { PermissionFlagsBits } from 'discord.js';

/** Définition unique : utilisée par `deploy`, l’enregistrement au démarrage et la doc */
export const slashCommands = [
  {
    name: 'lg-init',
    description:
      'Crée une Scène (conférence) + salon technique pour une partie Loup-Garou',
    default_member_permissions: String(PermissionFlagsBits.ManageChannels),
    options: [
      {
        name: 'nom',
        description: 'Nom affiché de la partie',
        type: 3,
        required: false,
      },
      {
        name: 'preset',
        description:
          'Code à 5 caractères (A–Z, 2–9) depuis le site — section Presets partie',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'lg-config',
    description:
      'Configurer la partie (lobby) : min. joueurs, loups, voyante, sorcière, chasseur, Cupidon, etc.',
    options: [
      {
        name: 'min_joueurs',
        description: 'Nombre minimum de joueurs pour lancer la partie (4–18)',
        type: 4,
        min_value: 4,
        max_value: 18,
        required: false,
      },
      {
        name: 'loups',
        description: 'Nombre de Loups-Garous (sinon auto selon l’effectif au lancement)',
        type: 4,
        min_value: 1,
        max_value: 10,
        required: false,
      },
      {
        name: 'loups_auto',
        description:
          'Recalculer automatiquement le nombre de loups au lancement (ignore « loups »)',
        type: 5,
        required: false,
      },
      {
        name: 'voyante',
        description: 'Inclure la voyante',
        type: 5,
        required: false,
      },
      {
        name: 'sorciere',
        description: 'Inclure la sorcière',
        type: 5,
        required: false,
      },
      {
        name: 'chasseur',
        description: 'Inclure le chasseur',
        type: 5,
        required: false,
      },
      {
        name: 'cupidon',
        description:
          'Cupidon : oui = 1re nuit (couple ou ménage à trois si « menage_trois ») · non = désactivé',
        type: 5,
        required: false,
      },
      {
        name: 'garde',
        description:
          'Garde : oui = 1 Garde en jeu (protège une cible chaque nuit contre les loups)',
        type: 5,
        required: false,
      },
      {
        name: 'voleur',
        description:
          'Voleur : oui = 1 Voleur en jeu (1re nuit, échange de carte avec un joueur)',
        type: 5,
        required: false,
      },
      {
        name: 'ange',
        description:
          'Ange : oui = 1 Ange (gagne seul si éliminé au 1er vote du village, sinon devient villageois)',
        type: 5,
        required: false,
      },
      {
        name: 'petite_fille',
        description:
          'Petite fille : oui = peut espionner le vote des loups chaque nuit (50 % repérée = mort)',
        type: 5,
        required: false,
      },
      {
        name: 'corbeau',
        description:
          'Corbeau : oui = marque chaque nuit un joueur qui reçoit +2 votes au vote du village suivant',
        type: 5,
        required: false,
      },
      {
        name: 'chaperon_rouge',
        description:
          'Chaperon Rouge : oui = protégée des loups tant que le Chasseur est en vie (pouvoir passif)',
        type: 5,
        required: false,
      },
      {
        name: 'roles_morts_visibles',
        description:
          'Afficher le rôle de chaque mort (ignoré si « nuit_sombre » est activé)',
        type: 5,
        required: false,
      },
      {
        name: 'nuit_sombre',
        description:
          'Mode nuit sombre : morts annoncées mais rôle jamais révélé publiquement',
        type: 5,
        required: false,
      },
      {
        name: 'voyante_bavarde',
        description:
          'Voyante bavarde : rôle exact en privé ; le salon ne révèle un rôle que dans les annonces de mort',
        type: 5,
        required: false,
      },
      {
        name: 'menage_trois',
        description:
          'Cupidon lie 3 joueurs (ménage à trois) au lieu d’un couple',
        type: 5,
        required: false,
      },
      {
        name: 'protection_publique',
        description:
          'Annonce publique vague quand le Garde ou l’Ange protège / bénit quelqu’un la nuit',
        type: 5,
        required: false,
      },
      {
        name: 'villageois',
        description:
          'Nombre de villageois simples (fixe). Sinon recalcul auto si tu changes min / loups / spéciaux',
        type: 4,
        min_value: 0,
        max_value: 18,
        required: false,
      },
      {
        name: 'villageois_auto',
        description:
          'Villageois = reste à la distribution (pas de nombre fixe ; ignore « villageois »)',
        type: 5,
        required: false,
      },
    ],
  },
  {
    name: 'lg-leave',
    description: 'Quitter le lobby avant le début',
  },
  {
    name: 'lg-start',
    description: 'Démarrer la partie (rôle et actions en fils privés)',
  },
  {
    name: 'lg-vote',
    description:
      'Vote des loups : indique la cible (pseudo). Phase nuit — tour des loups uniquement.',
    options: [
      {
        name: 'cible',
        description: 'Pseudo du joueur (non-loup) ou mention',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'lg-end',
    description: 'Terminer la partie et supprimer les salons',
  },
  {
    name: 'lg-status',
    description: 'Afficher l’état de la partie',
  },
  {
    name: 'lg-test',
    description:
      '[Dev] Envoie des messages fictifs pour prévisualiser le rendu des annonces (salon actuel)',
  },
];
