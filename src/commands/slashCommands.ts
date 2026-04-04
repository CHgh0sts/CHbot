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
          'Chaperon Rouge : oui = prot\u00e9g\u00e9e des loups tant que le Chasseur est en vie (pouvoir passif)',
        type: 5,
        required: false,
      },
      {
        name: 'idiot_du_village',
        description:
          'Idiot du village : oui = survit au 1er vote du village (perd son droit de vote ensuite)',
        type: 5,
        required: false,
      },
      {
        name: 'ancien',
        description:
          'Ancien : oui = survit \u00e0 la 1re attaque des loups ; si tu\u00e9 par le village, tous les sp\u00e9ciaux villageois perdent leurs pouvoirs',
        type: 5,
        required: false,
      },
      {
        name: 'grand_mechant_loup',
        description:
          'Grand M\u00e9chant Loup : oui = loup qui peut tuer un joueur suppl\u00e9mentaire chaque nuit tant qu\u2019aucun loup n\u2019est mort',
        type: 5,
        required: false,
      },
      {
        name: 'loup_blanc',
        description:
          'Loup-Blanc : oui = loup solo qui peut tuer un loup en secret toutes les nuits paires, gagne seul si dernier survivant',
        type: 5,
        required: false,
      },
      {
        name: 'joueur_de_flute',
        description:
          'Joueur de Fl\u00fbte : oui = ensorcelle 2 joueurs/nuit, gagne seul quand tous les vivants sont ensorcel\u00e9s',
        type: 5,
        required: false,
      },
      {
        name: 'chevalier_rouilee',
        description:
          'Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e : oui = si d\u00e9vor\u00e9 par les loups, le 1er loup alpha meurt \u00e0 l\u2019aube suivante',
        type: 5,
        required: false,
      },
      {
        name: 'bouc_emissaire',
        description:
          'Bouc \u00c9missaire : oui = meurt en cas d\u2019\u00e9galit\u00e9 au vote, puis choisit qui peut voter',
        type: 5,
        required: false,
      },
      {
        name: 'enfant_sauvage',
        description:
          'Enfant Sauvage : oui = village au d\u00e9part, se transforme en loup si son mod\u00e8le (choisi nuit 1) meurt',
        type: 5,
        required: false,
      },
      {
        name: 'renard',
        description:
          'Renard : oui = flairer 3 joueurs/nuit, perd son pouvoir si aucun loup parmi eux (camp Village)',
        type: 5,
        required: false,
      },
      {
        name: 'pyromane',
        description:
          'Pyromane : oui = arrose 1 joueur/nuit, peut incendier tous les arros\u00e9s en une fois (camp Solo)',
        type: 5,
        required: false,
      },
      {
        name: 'montreur_ours',
        description:
          "Montreur d'Ours : oui = l'ours grogne \u00e0 l'aube si un voisin secret est un loup (passif, camp Village)",
        type: 5,
        required: false,
      },
      {
        name: 'deux_soeurs',
        description:
          'Deux S\u0153urs : oui = 2 joueuses se reconnaissent nuit 1 dans un fil partag\u00e9 (camp Village x2)',
        type: 5,
        required: false,
      },
      {
        name: 'trois_freres',
        description:
          'Trois Fr\u00e8res : oui = 3 joueurs se reconnaissent nuit 1 dans un fil partag\u00e9 (camp Village x3)',
        type: 5,
        required: false,
      },
      {
        name: 'tiebreaker_random',
        description:
          '\u00c9galit\u00e9 au vote : oui = tirage au sort parmi les ex-aequo (non = personne ne meurt)',
        type: 5,
        required: false,
      },
      {
        name: 'premiere_nuit_sans_meurtre',
        description:
          '1re nuit sans meurtre : oui = les loups se r\u00e9unissent mais n\u2019\u00e9liminent personne la nuit 1',
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
  {
    name: 'lg-info',
    description: 'Affiche la fiche compl\u00e8te d\u2019un r\u00f4le du jeu Loup-Garou',
    options: [
      {
        name: 'role',
        description: 'Le r\u00f4le \u00e0 afficher',
        type: 3,
        required: true,
        choices: [
          { name: 'Loup-Garou',                        value: 'werewolf' },
          { name: 'Villageois',                         value: 'villager' },
          { name: 'Voyante',                            value: 'seer' },
          { name: 'Sorci\u00e8re',                     value: 'witch' },
          { name: 'Chasseur',                           value: 'hunter' },
          { name: 'Cupidon',                            value: 'cupid' },
          { name: 'Garde du Corps',                     value: 'guard' },
          { name: 'Voleur',                             value: 'thief' },
          { name: 'Ange',                               value: 'angel' },
          { name: 'Petite Fille',                       value: 'little_girl' },
          { name: 'Corbeau',                            value: 'raven' },
          { name: 'Chaperon Rouge',                     value: 'red_riding_hood' },
          { name: 'Idiot du Village',                   value: 'fool_of_village' },
          { name: 'Ancien',                             value: 'elder' },
          { name: 'Grand M\u00e9chant Loup',           value: 'big_bad_wolf' },
          { name: 'Loup-Blanc',                         value: 'white_werewolf' },
          { name: 'Joueur de Fl\u00fbte',              value: 'pied_piper' },
          { name: 'Chevalier \u00e0 l\u2019\u00c9p\u00e9e Rouill\u00e9e', value: 'rusty_sword_knight' },
          { name: 'Bouc \u00c9missaire',               value: 'scapegoat' },
          { name: 'Enfant Sauvage',                     value: 'wild_child' },
          { name: 'Renard',                             value: 'fox' },
          { name: 'Pyromane',                           value: 'pyromaniac' },
          { name: "Montreur d\u2019Ours",              value: 'bear_tamer' },
          { name: 'Deux S\u0153urs',                   value: 'two_sisters' },
          { name: 'Trois Fr\u00e8res',                 value: 'three_brothers' },
        ],
      },
    ],
  },
];


