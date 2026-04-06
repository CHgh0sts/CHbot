import type { RoleDef, RoleKey } from "@/types/game";

export const ROLES: Record<RoleKey, RoleDef> = {
  werewolf: {
    key: "werewolf",
    name: "Loup-Garou",
    camp: "wolves",
    icon: "🐺",
    color: "#ef4444",
    image: "/roles/loup_garou.png",
    description:
      "Chaque nuit, les loups-garous se réveillent ensemble et choisissent une victime parmi les villageois. Le jour, ils se fondent dans la masse et participent aux votes. Leur objectif : éliminer tous les villageois.",
    nightOrder: 50,
    hasNightAction: true,
  },
  infected_wolf: {
    key: "infected_wolf",
    name: "Infect Père des Loups",
    camp: "wolves",
    icon: "🧟",
    color: "#dc2626",
    image: "/roles/loup_noir.png",
    description:
      "Une fois par partie, peut infecter la victime de la nuit pour en faire un loup-garou plutôt que la tuer.",
    nightOrder: 55,
    hasNightAction: true,
  },
  white_wolf: {
    key: "white_wolf",
    name: "Loup Blanc",
    camp: "solo",
    icon: "🤍",
    color: "#e5e7eb",
    image: "/roles/loup_blanc.png",
    description:
      "Loup solitaire. Vote avec les loups chaque nuit. Toutes les deux nuits, peut tuer l'un des loups. Gagne seul si tous les autres sont éliminés.",
    nightOrder: 60,
    hasNightAction: true,
  },
  dog_wolf: {
    key: "dog_wolf",
    name: "Chien-Loup",
    camp: "wolves",
    icon: "🐕",
    color: "#f97316",
    image: "/roles/chien_loup.png",
    description:
      "Au début de la partie, choisit secrètement d'être Villageois ou Loup-Garou. S'il choisit loup, il rejoint la meute.",
    nightOrder: 5,
    hasNightAction: true,
  },
  villager: {
    key: "villager",
    name: "Simple Villageois",
    camp: "village",
    icon: "🧑",
    color: "#22c55e",
    image: "/roles/villageois.png",
    description:
      "Aucun pouvoir spécial. Doit user de déduction et de persuasion lors des débats du village pour identifier et éliminer les loups-garous.",
    hasNightAction: false,
  },
  seer: {
    key: "seer",
    name: "Voyante",
    camp: "village",
    icon: "🔮",
    color: "#a855f7",
    image: "/roles/voyante.png",
    description:
      "Chaque nuit, peut regarder secrètement le rôle d'un joueur. Une information précieuse… si elle survit assez longtemps.",
    nightOrder: 20,
    hasNightAction: true,
  },
  witch: {
    key: "witch",
    name: "Sorcière",
    camp: "village",
    icon: "🧙‍♀️",
    color: "#06b6d4",
    image: "/roles/sorciere.png",
    description:
      "Possède deux potions : une de guérison (sauve la victime de la nuit) et une de mort (empoisonne un joueur). Chacune n'est utilisable qu'une seule fois.",
    nightOrder: 70,
    hasNightAction: true,
  },
  hunter: {
    key: "hunter",
    name: "Chasseur",
    camp: "village",
    icon: "🏹",
    color: "#84cc16",
    image: "/roles/chasseur.png",
    description:
      "Lorsqu'il est éliminé (de nuit ou de jour), il peut immédiatement tirer sur un joueur de son choix, l'éliminant avec lui.",
    hasNightAction: false,
  },
  cupid: {
    key: "cupid",
    name: "Cupidon",
    camp: "village",
    icon: "💘",
    color: "#ec4899",
    image: "/roles/cupidon.png",
    description:
      "La première nuit, désigne deux joueurs qui tombent amoureux. Les amoureux doivent survivre ensemble : si l'un meurt, l'autre meurt de chagrin. Ils gagnent ensemble si tous les autres sont éliminés.",
    nightOrder: 10,
    hasNightAction: true,
  },
  little_girl: {
    key: "little_girl",
    name: "Petite Fille",
    camp: "village",
    icon: "👧",
    color: "#f472b6",
    image: "/roles/petite_fille.png",
    description:
      "Peut espionner les loups durant leur phase de nuit. Si elle est surprise, elle est éliminée à la place de la victime prévue.",
    hasNightAction: false,
  },
  elder: {
    key: "elder",
    name: "Ancien",
    camp: "village",
    icon: "👴",
    color: "#ca8a04",
    image: "/roles/ancien.png",
    description:
      "Résiste à la première attaque des loups (il lui faut deux attaques pour mourir). S'il est éliminé par le village, tous les villageois perdent leurs pouvoirs pour le reste de la partie.",
    hasNightAction: false,
  },
  scapegoat: {
    key: "scapegoat",
    name: "Bouc Émissaire",
    camp: "village",
    icon: "🐐",
    color: "#78716c",
    image: "/roles/bouc_emissaire.png",
    description:
      "Éliminé à la place d'un groupe de joueurs en cas d'égalité lors du vote. Peut alors choisir qui aura le droit de voter le lendemain.",
    hasNightAction: false,
  },
  idiot: {
    key: "idiot",
    name: "Idiot du Village",
    camp: "village",
    icon: "🤪",
    color: "#facc15",
    image: "/roles/idio_du_vilage.png",
    description:
      "S'il est éliminé par le vote du village, il survit mais perd son droit de vote. Les joueurs découvrent alors son identité.",
    hasNightAction: false,
  },
  doctor: {
    key: "doctor",
    name: "Docteur",
    camp: "village",
    icon: "⚕️",
    color: "#38bdf8",
    image: "/roles/docteur.png",
    description:
      "Chaque nuit, peut protéger un joueur (y compris lui-même une fois par partie). Le joueur protégé résiste à l'attaque des loups cette nuit.",
    nightOrder: 25,
    hasNightAction: true,
  },
  guard: {
    key: "guard",
    name: "Garde du Corps",
    camp: "village",
    icon: "🛡️",
    color: "#64748b",
    image: "/roles/garde.png",
    description:
      "Chaque nuit, protège un joueur des loups. Ne peut pas protéger le même joueur deux nuits de suite.",
    nightOrder: 15,
    hasNightAction: true,
  },
  necromancer: {
    key: "necromancer",
    name: "Nécromancien",
    camp: "village",
    icon: "💀",
    color: "#7c3aed",
    image: "/roles/necromancien.png",
    description:
      "A accès à un fil privé avec tous les joueurs morts. Peut communiquer avec eux chaque nuit, mais ils ne peuvent que répondre (pas voter ni agir).",
    nightOrder: 80,
    hasNightAction: true,
  },
  devoted_servant: {
    key: "devoted_servant",
    name: "Servante Dévouée",
    camp: "village",
    icon: "🫅",
    color: "#4ade80",
    image: "/roles/servante_devouee.png",
    description:
      "Après le vote du village, peut se sacrifier pour prendre la place du joueur éliminé. Elle adopte alors son rôle secret et continue la partie.",
    hasNightAction: false,
  },
  angel: {
    key: "angel",
    name: "Ange",
    camp: "solo",
    icon: "😇",
    color: "#fbbf24",
    image: "/roles/ange.png",
    description:
      "Gagne seul s'il est éliminé lors du premier vote du village. S'il échoue, il devient Simple Villageois pour le reste de la partie.",
    hasNightAction: false,
  },
  bear_tamer: {
    key: "bear_tamer",
    name: "Montreur d'Ours",
    camp: "village",
    icon: "🐻",
    color: "#92400e",
    image: "/roles/montreur_ours.png",
    description:
      "Chaque matin, son ours grogne si l'un de ses voisins immédiats est un loup (ou infecté). L'ours ne grogne pas si ce voisin est le Chien-Loup.",
    hasNightAction: false,
  },
  fox: {
    key: "fox",
    name: "Renard",
    camp: "village",
    icon: "🦊",
    color: "#f97316",
    image: "/roles/renard.png",
    description:
      "Chaque nuit, peut pointer un groupe de 3 joueurs adjacents. S'il y a un loup parmi eux, il le sait (sans savoir lequel). S'il n'y en a pas, il perd son pouvoir.",
    nightOrder: 30,
    hasNightAction: true,
  },
  raven: {
    key: "raven",
    name: "Corbeau",
    camp: "village",
    icon: "🐦‍⬛",
    color: "#1e293b",
    image: "/roles/corbeau.png",
    description:
      "Chaque nuit, peut désigner un joueur qui recevra deux votes supplémentaires lors du vote du lendemain. Peut s'abstenir.",
    nightOrder: 90,
    hasNightAction: true,
  },
  actor: {
    key: "actor",
    name: "Acteur",
    camp: "village",
    icon: "🎭",
    color: "#e879f9",
    image: "/roles/comedien.png",
    description:
      "Possède trois cartes de rôles villageois tirées aléatoirement. Peut utiliser le pouvoir de l'une d'elles une fois par nuit.",
    nightOrder: 35,
    hasNightAction: true,
  },
  dictateur: {
    key: "dictateur",
    name: "Dictateur",
    camp: "village",
    icon: "👑",
    color: "#b45309",
    image: "/roles/juge_begue.png",
    description:
      "Une fois par partie, peut imposer l'élimination d'un joueur lors du vote. S'il cible un ennemi, il survit et devient Maire (double vote). S'il cible un innocent, il est éliminé à la place.",
    hasNightAction: false,
  },
  hackeur: {
    key: "hackeur",
    name: "Hackeur",
    camp: "village",
    icon: "💻",
    color: "#00ff88",
    image: "/roles/hacker.png",
    description:
      "La première nuit, choisit une cible. Quand cette cible meurt, son rôle n'est pas révélé : le village apprend qu'elle a été « hackée ». Le Hackeur hérite secrètement de son rôle et de ses pouvoirs.",
    nightOrder: 3,
    hasNightAction: true,
  },
  thief: {
    key: "thief",
    name: "Voleur",
    camp: "village",
    icon: "🥷",
    color: "#64748b",
    image: "/roles/voleur.png",
    description:
      "La première nuit, échange son rôle avec un joueur choisi. Il adopte son rôle et son camp ; la cible devient simple villageois.",
    nightOrder: 4,
    hasNightAction: true,
  },
  red_riding_hood: {
    key: "red_riding_hood",
    name: "Chaperon rouge",
    camp: "village",
    icon: "🧣",
    color: "#dc2626",
    image: "/roles/chaperon_rouge.png",
    description:
      "Tant que le Chasseur est en vie, les loups ne peuvent pas la dévorer (attaque annulée). Pouvoir passif.",
    hasNightAction: false,
  },
  big_bad_wolf: {
    key: "big_bad_wolf",
    name: "Grand méchant loup",
    camp: "wolves",
    icon: "🐺",
    color: "#991b1b",
    image: "/roles/grand_mechant_loup.png",
    description:
      "Vote avec la meute. Tant qu'aucun loup n'est mort, peut tuer une seconde victime seul chaque nuit (après le vote des loups).",
    nightOrder: 52,
    hasNightAction: true,
  },
  pied_piper: {
    key: "pied_piper",
    name: "Joueur de flûte",
    camp: "solo",
    icon: "🎵",
    color: "#7c3aed",
    image: "/roles/joueur_de_flute.png",
    description:
      "Chaque nuit, ensorcelle deux joueurs encore vivants. Gagne seul lorsque tous les survivants (sauf lui) sont ensorcelés.",
    nightOrder: 85,
    hasNightAction: true,
  },
  rusty_sword_knight: {
    key: "rusty_sword_knight",
    name: "Chevalier à l'épée rouillée",
    camp: "village",
    icon: "⚔️",
    color: "#78716c",
    image: "/roles/chevalier_epee_rouillee.png",
    description:
      "Si les loups le dévorent, le premier loup (ordre alphabétique parmi les votants) meurt d'une infection à l'aube suivante.",
    hasNightAction: false,
  },
  wild_child: {
    key: "wild_child",
    name: "Enfant sauvage",
    camp: "village",
    icon: "🌿",
    color: "#65a30d",
    image: "/roles/enfant_sauvage.png",
    description:
      "La première nuit, choisit un modèle. Si le modèle meurt, l'Enfant sauvage devient Loup-Garou et rejoint la meute.",
    nightOrder: 6,
    hasNightAction: true,
  },
  pyromaniac: {
    key: "pyromaniac",
    name: "Pyromane",
    camp: "solo",
    icon: "🔥",
    color: "#ea580c",
    image: "/roles/pyromane.png",
    description:
      "Chaque nuit, arrose un joueur d'essence ou déclenche l'incendie (tous les arrosés vivants meurent). Gagne seul selon les règles de la partie.",
    nightOrder: 88,
    hasNightAction: true,
  },
  two_sisters: {
    key: "two_sisters",
    name: "Deux sœurs",
    camp: "village",
    icon: "👯",
    color: "#db2777",
    image: "/roles/2_soeurs.png",
    description:
      "Deux joueuses avec ce rôle : la première nuit, elles se reconnaissent dans un fil privé. Aucun pouvoir actif. Victoire avec le village.",
    nightOrder: 11,
    hasNightAction: false,
  },
  three_brothers: {
    key: "three_brothers",
    name: "Trois frères",
    camp: "village",
    icon: "👨‍👦‍👦",
    color: "#2563eb",
    image: "/roles/3_freres.png",
    description:
      "Trois joueurs avec ce rôle : la première nuit, ils se reconnaissent. Aucun pouvoir actif. Victoire avec le village.",
    nightOrder: 12,
    hasNightAction: false,
  },
  sectarian: {
    key: "sectarian",
    name: "Sectaire abominable",
    camp: "solo",
    icon: "☠️",
    color: "#581c87",
    image: "/roles/sectaire_abominable.png",
    description:
      "Chaque nuit, inspecte un joueur pour connaître son groupe secret (A ou B). Gagne seul lorsque tous les survivants sont du même groupe que lui.",
    nightOrder: 40,
    hasNightAction: true,
  },
};

export function getRoleDef(key: RoleKey): RoleDef {
  return ROLES[key];
}

export function getRoleName(key: RoleKey): string {
  return ROLES[key]?.name ?? key;
}

export function isWolf(key: RoleKey): boolean {
  return (
    key === "werewolf" ||
    key === "infected_wolf" ||
    key === "white_wolf" ||
    key === "dog_wolf" ||
    key === "big_bad_wolf"
  );
}
