import type { RoleDef, RoleKey } from "@/types/game";

export const ROLES: Record<RoleKey, RoleDef> = {
  werewolf: {
    key: "werewolf",
    name: "Loup-Garou",
    camp: "wolves",
    icon: "🐺",
    color: "#ef4444",
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
    description:
      "La première nuit, choisit une cible. Quand cette cible meurt, son rôle n'est pas révélé : le village apprend qu'elle a été « hackée ». Le Hackeur hérite secrètement de son rôle et de ses pouvoirs.",
    nightOrder: 3,
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
    key === "dog_wolf"
  );
}
