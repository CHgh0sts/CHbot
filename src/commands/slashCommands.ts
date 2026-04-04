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
      'Config partie : joueurs, loups, roles classiques, modes de jeu. Voir aussi /lg-roles pour les roles optionnels.',
    options: [
      { name: 'min_joueurs', description: 'Nombre minimum de joueurs pour lancer (4-18)', type: 4, min_value: 4, max_value: 18, required: false },
      { name: 'loups', description: 'Nombre de Loups-Garous (sinon auto)', type: 4, min_value: 1, max_value: 10, required: false },
      { name: 'loups_auto', description: 'Recalcul auto du nombre de loups (ignore "loups")', type: 5, required: false },
      { name: 'voyante', description: 'Inclure la Voyante', type: 5, required: false },
      { name: 'sorciere', description: 'Inclure la Sorciere', type: 5, required: false },
      { name: 'chasseur', description: 'Inclure le Chasseur', type: 5, required: false },
      { name: 'cupidon', description: 'Cupidon : 1re nuit, forme un couple (ou menage a 3 si menage_trois)', type: 5, required: false },
      { name: 'garde', description: 'Garde du Corps : protege une cible par nuit', type: 5, required: false },
      { name: 'voleur', description: 'Voleur : 1re nuit, echange de carte avec un joueur', type: 5, required: false },
      { name: 'ange', description: 'Ange : gagne seul si elimine au 1er vote, sinon devient villageois', type: 5, required: false },
      { name: 'ancien', description: 'Ancien : survit 1re attaque loups ; si elimine par village, tous les speciaux perdent leur pouvoir', type: 5, required: false },
      { name: 'grand_mechant_loup', description: 'Grand Mechant Loup : tue un joueur supplementaire/nuit (tant que aucun loup mort)', type: 5, required: false },
      { name: 'loup_blanc', description: 'Loup-Blanc : peut tuer un loup secret nuits paires, gagne seul en dernier', type: 5, required: false },
      { name: 'joueur_de_flute', description: 'Joueur de Flute : ensorcelle 2 joueurs/nuit, gagne seul si tous ensorcel\u00e9s', type: 5, required: false },
      { name: 'bouc_emissaire', description: 'Bouc Emissaire : meurt en cas d\u2019egalite au vote, choisit ensuite qui peut voter', type: 5, required: false },
      { name: 'tiebreaker_random', description: 'Egalite au vote : oui = tirage sort, non = personne ne meurt', type: 5, required: false },
      { name: 'premiere_nuit_sans_meurtre', description: '1re nuit sans meurtre : loups se reunissent mais n\u2019eliminant personne', type: 5, required: false },
      { name: 'roles_morts_visibles', description: 'Afficher le role de chaque mort (ignore si nuit_sombre actif)', type: 5, required: false },
      { name: 'nuit_sombre', description: 'Mode nuit sombre : morts annoncees mais role jamais revele publiquement', type: 5, required: false },
      { name: 'voyante_bavarde', description: 'Voyante bavarde : role exact en prive ; revele uniquement dans les annonces de mort', type: 5, required: false },
      { name: 'menage_trois', description: 'Cupidon lie 3 joueurs au lieu d\u2019un couple', type: 5, required: false },
      { name: 'protection_publique', description: 'Annonce publique vague quand le Garde ou l\u2019Ange protege quelqu\u2019un', type: 5, required: false },
      { name: 'villageois', description: 'Nombre de villageois simples (fixe)', type: 4, min_value: 0, max_value: 18, required: false },
      { name: 'villageois_auto', description: 'Villageois = reste a la distribution (ignore "villageois")', type: 5, required: false },
    ],
  },
  {
    name: 'lg-roles',
    description:
      'Activer/desactiver les roles optionnels/extensions. Voir aussi /lg-config pour les reglages generaux.',
    options: [
      { name: 'petite_fille', description: 'Petite Fille : peut espionner le vote des loups (50% reperage = mort)', type: 5, required: false },
      { name: 'corbeau', description: 'Corbeau : marque 1 joueur/nuit qui recoit +2 votes au vote suivant', type: 5, required: false },
      { name: 'chaperon_rouge', description: 'Chaperon Rouge : protege des loups tant que le Chasseur est en vie (passif)', type: 5, required: false },
      { name: 'idiot_du_village', description: 'Idiot du Village : survit au 1er vote (perd son droit de vote ensuite)', type: 5, required: false },
      { name: 'chevalier_rouilee', description: 'Chevalier a l\u2019Epee Rouill\u00e9e : si devore, le 1er loup meurt a l\u2019aube suivante', type: 5, required: false },
      { name: 'enfant_sauvage', description: 'Enfant Sauvage : devient loup si son modele (choisi nuit 1) meurt', type: 5, required: false },
      { name: 'renard', description: 'Renard : flairer 3 joueurs/nuit, perd son pouvoir si aucun loup parmi eux', type: 5, required: false },
      { name: 'pyromane', description: 'Pyromane : arrose 1 joueur/nuit, peut incendier tous les arros\u00e9s (Solo)', type: 5, required: false },
      { name: 'montreur_ours', description: "Montreur d\u2019Ours : l\u2019ours grogne a l\u2019aube si un voisin secret est un loup (passif)", type: 5, required: false },
      { name: 'deux_soeurs', description: 'Deux Soeurs : 2 joueuses se reconnaissent nuit 1 dans un fil partage', type: 5, required: false },
      { name: 'trois_freres', description: 'Trois Freres : 3 joueurs se reconnaissent nuit 1 dans un fil partage', type: 5, required: false },
      { name: 'docteur', description: 'Docteur : 3 charges de protection nocturne sans restriction de cible', type: 5, required: false },
      { name: 'necromancien', description: 'Necromancien : fil prive avec tous les morts pour communiquer avec eux', type: 5, required: false },
      { name: 'sectaire_abominable', description: 'Sectaire Abominable : Solo, gagne si tous les survivants sont du meme groupe', type: 5, required: false },
      { name: 'servante_devouee', description: 'Servante Devouee : apres le vote, peut prendre la place de la victime (1 fois)', type: 5, required: false },
      { name: 'infect_pere_loups', description: 'Infect Pere des Loups : peut infecter la victime loups (la transformer en loup, 1 fois)', type: 5, required: false },
      { name: 'chien_loup', description: 'Chien-Loup : choisit son camp nuit 1 (Village ou Loups)', type: 5, required: false },
      { name: 'dictateur', description: 'Dictateur : impose la victime du vote 1 fois (devient Maire si correct, sinon meurt)', type: 5, required: false },
      { name: 'hackeur', description: 'Hackeur : vole le role de sa cible nuit 1 (invisible Voyante avant vol)', type: 5, required: false },
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
    description: 'Affiche la fiche complete d\u2019un role du jeu Loup-Garou',
    options: [
      {
        name: 'role',
        description: 'Le role a afficher (commence a taper pour filtrer)',
        type: 3,
        required: true,
        autocomplete: true,
      },
    ],
  },
];




