import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

interface RoleInfo {
  name: string;
  emoji: string;
  camp: 'Loups-Garous' | 'Village' | 'Solo' | 'Sp\u00e9cial';
  campColor: number;
  power: string;
  timing: string;
  victory: string;
  tip?: string;
}

const CAMP_COLOR_WOLF = 0xed4245;
const CAMP_COLOR_VILLAGE = 0x57f287;
const CAMP_COLOR_SOLO = 0xf1c40f;
const CAMP_COLOR_SPECIAL = 0x9b59b6;

const ROLE_INFO: Record<string, RoleInfo> = {
  werewolf: {
    name: 'Loup-Garou',
    emoji: '\uD83D\uDC3A',
    camp: 'Loups-Garous',
    campColor: CAMP_COLOR_WOLF,
    power:
      'Chaque nuit, la **meute** se r\u00e9unit dans son fil priv\u00e9 et vote pour \u00e9liminer un joueur du village. La victime est d\u00e9voil\u00e9e \u00e0 l\u2019aube.',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 vote collectif dans le fil Meute.',
    victory:
      'Les loups gagnent quand leur nombre \u00e9gale ou d\u00e9passe celui des survivants du village.',
    tip: 'Coordonnez-vous en priv\u00e9 pour cibler les r\u00f4les les plus dangereux (Voyante, Sorcière, Chasseur).',
  },
  villager: {
    name: 'Villageois',
    emoji: '\uD83D\uDC68\u200D\uD83C\uDF3E',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Aucun pouvoir sp\u00e9cial. Le Villageois participe au vote du village chaque jour et utilise sa logique et son observation pour identifier les loups.",
    timing: '\u2600\uFE0F Joue uniquement le jour (vote).',
    victory: 'Gagne avec le **camp Village** : tous les loups \u00e9limin\u00e9s.',
    tip: "Observez les comportements, les h\u00e9sitations et les alliances \u2014 c'est votre seul outil.",
  },
  seer: {
    name: 'Voyante',
    emoji: '\uD83D\uDD2E',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'Chaque nuit, la Voyante choisit un joueur et apprend son camp (**Loup-Garou** ou **non Loup-Garou**). En mode *Voyante bavarde*, elle voit le r\u00f4le exact.',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 r\u00e9sultat dans son fil priv\u00e9.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "Ne vous d\u00e9voilez pas trop t\u00f4t \u2014 vous \u00eates une cible prioritaire des loups si vous r\u00e9v\u00e9lez votre r\u00f4le publiquement.",
  },
  witch: {
    name: 'Sorci\u00e8re',
    emoji: '\uD83E\uDDD9',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Poss\u00e8de **deux potions** (une seule utilisation chacune) :\n\u2022 \u2728 **Vie** \u2014 r\u00e9anime la victime des loups cette nuit.\n\u2022 \u2620\uFE0F **Mort** \u2014 \u00e9limine n'importe quel joueur vivant (m\u00eame un loup).",
    timing: '\uD83C\uDF19 Chaque nuit, elle d\u00e9couvre la victime des loups et peut agir.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "Gardez la potion de mort pour un loup confirm\u00e9. La potion de vie peut sauver un r\u00f4le cl\u00e9 (Voyante, Chasseur).",
  },
  hunter: {
    name: 'Chasseur',
    emoji: '\uD83C\uDFF9',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pouvoir **passif**. Quand le Chasseur est \u00e9limin\u00e9 (nuit ou jour), il d\u00e9clenche imm\u00e9diatement son arbal\u00e8te et **emporte un joueur de son choix** dans la mort.",
    timing: '\u26A1 D\u00e9clenche \u00e0 sa mort.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "Choisissez bien votre cible quand vous mourrez \u2014 pr\u00e9f\u00e9rez un joueur suspect plut\u00f4t qu'un villageois innocent.",
  },
  cupid: {
    name: 'Cupidon',
    emoji: '\uD83D\uDC98',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'La **nuit 1 uniquement**, Cupidon lie **deux joueurs** (ou trois en mode *m\u00e9nage \u00e0 trois*). Les amoureux se connaissent et ont un fil priv\u00e9 partag\u00e9. Si l\u2019un meurt, l\u2019autre meurt de chagrin imm\u00e9diatement.',
    timing: '\uD83C\uDF19 Nuit 1 uniquement.',
    victory:
      'Si les **amoureux** sont les deux derniers survivants, ils gagnent ensemble (m\u00eame si un loup est parmi eux).',
    tip: "Lier un loup et un villageois cr\u00e9e un camp hybride surprenant \u2014 les amoureux peuvent gagner contre tout le monde.",
  },
  guard: {
    name: 'Garde du Corps',
    emoji: '\uD83D\uDEE1\uFE0F',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'Chaque nuit, le Garde prot\u00e8ge un joueur des attaques des loups. Il **ne peut pas prot\u00e9ger deux nuits de suite la m\u00eame personne**.',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 avant les loups.',
    victory: 'Gagne avec le **camp Village**.',
    tip: 'Prot\u00e9gez la Voyante ou la Sorci\u00e8re les premi\u00e8res nuits. Variez vos cibles pour compliquer la t\u00e2che des loups.',
  },
  thief: {
    name: 'Voleur',
    emoji: '\uD83C\uDFAD',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'La **nuit 1**, le Voleur re\u00e7oit **deux cartes suppl\u00e9mentaires** (issues du tas de cartes mis de c\u00f4t\u00e9) et choisit d\u2019\u00e9changer sa carte avec l\u2019une d\u2019elles. Si les deux cartes sont des loups, il **doit** en prendre une.',
    timing: '\uD83C\uDF19 Nuit 1 uniquement.',
    victory: 'D\u00e9pend de la carte qu\u2019il a choisie.',
    tip: "Si vous devenez loup, vous jouez du cot\u00e9 des loups \u2014 ils sont inform\u00e9s de votre transformation dans leur fil.",
  },
  angel: {
    name: 'Ange',
    emoji: '\uD83D\uDE07',
    camp: 'Sp\u00e9cial',
    campColor: CAMP_COLOR_SPECIAL,
    power:
      "L'Ange gagne **seul** s'il est \u00e9limin\u00e9 au **premier vote du village** (jour 1). Si cette condition n'est pas remplie, il rejoint le **camp Village** et gagne avec eux.",
    timing: '\u2600\uFE0F Condition v\u00e9rifi\u00e9e au 1er vote du village.',
    victory:
      '\uD83C\uDFC6 **Seul** si \u00e9limin\u00e9 au 1er vote\u2014 sinon avec le **Village**.',
    tip: "Provoquez les soupçons d\u00e8s le d\u00e9but pour vous faire \u00e9liminer au premier vote.",
  },
  little_girl: {
    name: 'Petite Fille',
    emoji: '\uD83D\uDC67',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pendant la phase des loups, la Petite Fille peut **espionner** le fil Meute. Si un loup la d\u00e9tecte (bouton **Esp\u00e9r** actif\u00e9), elle est \u00e9limin\u00e9e \u00e0 la place de la victime d\u00e9sign\u00e9e. Risque-r\u00e9compense \u00e9lev\u00e9.",
    timing: '\uD83C\uDF19 Chaque nuit \u2014 pendant la phase loups.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "N'espionnez pas syst\u00e9matiquement \u2014 attendez le bon moment o\u00f9 l'information en vaut le risque.",
  },
  raven: {
    name: 'Corbeau',
    emoji: '\uD83D\uDC26\u200D\u2B1B',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'Chaque nuit, le Corbeau peut (optionnellement) d\u00e9signer un joueur qui recevra **+2 votes** lors du vote du village le lendemain.',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 optionnel.',
    victory: 'Gagne avec le **camp Village**.',
    tip: 'Utiliser le Corbeau sur un joueur innocent peut vous retourner contre vous. Gardez des preuves pour cibler les loups.',
  },
  red_riding_hood: {
    name: 'Chaperon Rouge',
    emoji: '\uD83D\uDC7A',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'Pouvoir **passif**. Tant que le **Chasseur** est en vie, le Chaperon Rouge est **invuln\u00e9rable aux attaques des loups** (l\u2019attaque est absorb\u00e9e sans effet). Si le Chasseur meurt, la protection dispara\u00eet.',
    timing: '(Passif) Actif tant que le Chasseur est en vie.',
    victory: 'Gagne avec le **camp Village**.',
    tip: 'Garder le Chasseur en vie protège aussi le Chaperon Rouge. Les loups peuvent choisir de tuer le Chasseur pour lever la protection.',
  },
  fool_of_village: {
    name: 'Idiot du Village',
    emoji: '\uD83E\uDD21',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pouvoir **passif** (d\u00e9clenche \u00e0 la mort). Si le village vote pour \u00e9liminer l'Idiot, il **survit** mais perd son droit de vote d\u00e9finitivement. Le village peut voter contre lui librement sans le tuer.",
    timing: '(Passif) D\u00e9clenche si \u00e9limin\u00e9 au vote du village.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "La r\u00e9v\u00e9lation involontaire de l\u2019identit\u00e9 de l'Idiot peut \u00eatre utile \u2014 le village sait qu'il est innocent mais sans vote.",
  },
  elder: {
    name: 'Ancien',
    emoji: '\uD83E\uDDD3',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pouvoir **passif**. L'Ancien **survit \u00e0 la premi\u00e8re attaque des loups** (sans que le village le sache). S'il est ensuite \u00e9limin\u00e9 par le village ou la Sorci\u00e8re, **tous les pouvoirs du village** (Voyante, Garde, Chasseur, Sorci\u00e8re, etc.) sont neutralis\u00e9s.",
    timing: '(Passif) Survit \u00e0 la 1re attaque loups \u2014 mal\u00e9diction \u00e0 sa mort par le village.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "Ne r\u00e9v\u00e9lez pas votre r\u00f4le \u2014 si le village sait que vous \u00eates l'Ancien, ils h\u00e9siteront \u00e0 voter contre vous m\u00eame si vous semblez suspect.",
  },
  big_bad_wolf: {
    name: 'Grand M\u00e9chant Loup',
    emoji: '\uD83D\uDC3A\uD83D\uDCA8',
    camp: 'Loups-Garous',
    campColor: CAMP_COLOR_WOLF,
    power:
      "En plus du vote collectif de la meute, le Grand M\u00e9chant Loup peut **d\u00e9vorer un joueur suppl\u00e9mentaire** chaque nuit (dans son fil priv\u00e9). Cette capacit\u00e9 est **perdue d\u00e8s qu'un loup meurt** (y compris lui-m\u00eame).",
    timing: '\uD83C\uDF19 Chaque nuit \u2014 apr\u00e8s le vote de la meute (tant qu\u2019aucun loup n\u2019est mort).',
    victory: 'Gagne avec les **Loups-Garous**.',
    tip: 'Utilisez le kill suppl\u00e9mentaire pour \u00e9liminer la Voyante ou la Sorci\u00e8re d\u00e8s les premi\u00e8res nuits.',
  },
  white_werewolf: {
    name: 'Loup-Blanc',
    emoji: '\uD83E\uDD8A',
    camp: 'Solo',
    campColor: CAMP_COLOR_SOLO,
    power:
      'Le Loup-Blanc joue **avec la meute** (les loups le connaissent). Mais les **nuits paires** (2, 4, 6\u2026), il peut **\u00e9liminer secr\u00e8tement un loup** dans son fil priv\u00e9 (sans que la meute le sache).',
    timing:
      '\uD83C\uDF19 Chaque nuit (meute) + nuits paires (kill secret dans fil priv\u00e9).',
    victory:
      '\uD83C\uDFC6 **Seul** s\u2019il est le **dernier survivant** (loups ET village \u00e9limin\u00e9s).',
    tip: 'Jouez l\u2019innocent au sein de la meute. Utilisez vos kills secrets pour r\u00e9duire la meute progressivement tout en aidant \u00e0 \u00e9liminer le village.',
  },
  pied_piper: {
    name: 'Joueur de Fl\u00fbte',
    emoji: '\uD83C\uDFB5',
    camp: 'Solo',
    campColor: CAMP_COLOR_SOLO,
    power:
      'Chaque nuit, le Joueur de Fl\u00fbte **ensorcelle 2 joueurs vivants** (ils sont mis sous son charme). Les jou\u00e9s ensorcel\u00e9s ne le savent pas (juste une notification priv\u00e9e).',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 ensorcelle 2 joueurs.',
    victory:
      '\uD83C\uDFC6 **Seul** quand **tous les survivants** (sauf lui) sont ensorcel\u00e9s.',
    tip: "Ciblez les joueurs influents en premier. Si vous \u00eates expos\u00e9, les loups et le village s'allieront contre vous.",
  },
  rusty_sword_knight: {
    name: 'Chevalier \u00e0 l\u2019\u00c9p\u00e9e Rouill\u00e9e',
    emoji: '\u2694\uFE0F',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pouvoir **passif**. Si le Chevalier est d\u00e9vor\u00e9 par les loups, le **premier loup alphab\u00e9tiquement** parmi les vivants meurt d\u2019une infection myst\u00e9rieuse \u00e0 l\u2019aube suivante. La Sorci\u00e8re peut annuler cet effet en ressuscitant le Chevalier.",
    timing:
      '(Passif) D\u00e9clenche \u00e0 la mort du Chevalier par les loups.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "Les loups doivent \u00e9viter de cibler le Chevalier, ce qui r\u00e9duit leurs options nuit apr\u00e8s nuit.",
  },
  scapegoat: {
    name: 'Bouc \u00c9missaire',
    emoji: '\uD83D\uDC10',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Pouvoir **passif** (d\u00e9clenche en cas d'\u00e9galit\u00e9). En cas d'\u00e9galit\u00e9 au vote du village, c'est le Bouc \u00c9missaire qui est \u00e9limin\u00e9 (prioritaire sur le tirage au sort). Apr\u00e8s sa mort, il **choisit quels joueurs sont exclus du vote** le lendemain.",
    timing: '(Passif) D\u00e9clenche uniquement en cas d\u2019\u00e9galit\u00e9 au vote.',
    victory: 'Gagne avec le **camp Village**.',
    tip: 'Apr\u00e8s votre mort, bloquez le vote des joueurs suspects pour orienter la partie depuis la tombe.',
  },
  wild_child: {
    name: 'Enfant Sauvage',
    emoji: '\uD83D\uDC3A\uD83D\uDC76',
    camp: 'Sp\u00e9cial',
    campColor: CAMP_COLOR_SPECIAL,
    power:
      'La **nuit 1**, l\u2019Enfant Sauvage choisit un **mod\u00e8le** parmi les joueurs vivants. Tant que le mod\u00e8le est vivant, il joue du c\u00f4t\u00e9 du village. Si son **mod\u00e8le meurt**, il se **transforme en Loup-Garou** et rejoint la meute (annonc\u00e9 publiquement).',
    timing: '\uD83C\uDF19 Nuit 1 (choix mod\u00e8le) \u2014 transformation instantan\u00e9e \u00e0 la mort du mod\u00e8le.',
    victory: 'Avec le **Village** (si mod\u00e8le vivant) ou avec les **Loups** (apr\u00e8s transformation).',
    tip: 'Choisissez un mod\u00e8le discret et peu cibl\u00e9 pour rester village longtemps. Les loups ont int\u00e9r\u00eat \u00e0 tuer votre mod\u00e8le t\u00f4t.',
  },
  fox: {
    name: 'Renard',
    emoji: '\uD83E\uDD8A',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'Chaque nuit, le Renard choisit **3 joueurs** \u00e0 flairer. Le bot lui r\u00e9pond **oui** (au moins un loup parmi eux) ou **non** (aucun loup). Si la r\u00e9ponse est **non**, il **perd son pouvoir d\u00e9finitivement** mais reste en jeu.',
    timing: '\uD83C\uDF19 Chaque nuit \u2014 r\u00e9sultat binaire dans son fil priv\u00e9.',
    victory: 'Gagne avec le **camp Village**.',
    tip: 'Choisissez des groupes de 3 qui couvrent les plus suspects. Pr\u00e9servez votre pouvoir \u2014 une mauvaise nuit le fait disparaitre.',
  },
  pyromaniac: {
    name: 'Pyromane',
    emoji: '\uD83D\uDD25',
    camp: 'Solo',
    campColor: CAMP_COLOR_SOLO,
    power:
      "Chaque nuit, le Pyromane **arrose** un joueur vivant d'essence (lui-m\u00eame inclus). Quand il le d\u00e9cide, il d\u00e9clenche l'\ud83d\udd25 **Incendie** : tous les joueurs arros\u00e9s encore vivants meurent simultan\u00e9ment \u00e0 l'aube.",
    timing: '\uD83C\uDF19 Chaque nuit (arroser ou incendier).',
    victory:
      '\uD83C\uDFC6 **Seul** si tous les autres survivants sont arros\u00e9s, ou s\u2019il est le dernier survivant.',
    tip: "Arrosez discr\u00e8tement sur plusieurs nuits avant de d\u00e9clencher. Attendez d'avoir arros\u00e9 un maximum de joueurs cl\u00e9s (Voyante, loups) avant l'incendie final.",
  },
  bear_tamer: {
    name: "Montreur d\u2019Ours",
    emoji: '\uD83D\uDC3B',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      'R\u00f4le **enti\u00e8rement passif**. La nuit 1, deux joueurs al\u00e9atoires sont d\u00e9sign\u00e9s comme ses **voisins secrets** (fix\u00e9s pour toute la partie). \u00c0 chaque **aube**, si l\u2019un des voisins encore en vie est un **loup-garou**, l\u2019ours grogne publiquement. Sinon, silence.',
    timing: '(Passif) Grognement annonc\u00e9 chaque matin si voisin-loup vivant.',
    victory: 'Gagne avec le **camp Village**.',
    tip: "La combinaison silence/grognement est une information puissante \u2014 le village sait si des loups sont parmi les voisins du Montreur d'Ours.",
  },
  two_sisters: {
    name: 'Deux S\u0153urs',
    emoji: '\uD83D\uDC6F\u200D\u2640\uFE0F',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Ce r\u00f4le est attribu\u00e9 \u00e0 **deux joueurs**. La nuit 1, elles se reconnaissent dans un **fil priv\u00e9 partag\u00e9** et peuvent s\u2019y \u00e9crire tout au long de la partie. Aucun pouvoir actif \u2014 elles partagent uniquement leur identit\u00e9.",
    timing: '\uD83C\uDF19 Nuit 1 (cr\u00e9ation fil partag\u00e9).',
    victory: 'Gagnent avec le **camp Village**.',
    tip: "Deux personnes qui se font mutuellement confiance \u2014 c'est un avantage strat\u00e9gique majeur pour coordonner les votes du village.",
  },
  three_brothers: {
    name: 'Trois Fr\u00e8res',
    emoji: '\uD83D\uDC68\u200D\uD83D\uDC68\u200D\uD83D\uDC66',
    camp: 'Village',
    campColor: CAMP_COLOR_VILLAGE,
    power:
      "Ce r\u00f4le est attribu\u00e9 \u00e0 **trois joueurs**. La nuit 1, ils se reconnaissent dans un **fil priv\u00e9 partag\u00e9** et peuvent s\u2019y \u00e9crire tout au long de la partie. Aucun pouvoir actif \u2014 ils partagent uniquement leur identit\u00e9.",
    timing: '\uD83C\uDF19 Nuit 1 (cr\u00e9ation fil partag\u00e9).',
    victory: 'Gagnent avec le **camp Village**.',
    tip: "Trois joueurs coo\u00f6donnants qui se connaissent \u2014 un bloc de confiance tr\u00e8s puissant pour le village.",
  },
};

const CAMP_EMOJI: Record<string, string> = {
  'Loups-Garous': '\uD83D\uDC3A',
  Village: '\uD83C\uDFD8\uFE0F',
  Solo: '\uD83C\uDF1F',
  'Sp\u00e9cial': '\u2728',
};

export async function handleLgInfo(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const roleKey = interaction.options.getString('role', true);
  const info = ROLE_INFO[roleKey];

  if (!info) {
    await interaction.reply({
      content: '\u274C R\u00f4le inconnu.',
      flags: 64,
    });
    return;
  }

  const campBadge = `${CAMP_EMOJI[info.camp] ?? ''} **${info.camp}**`;

  const embed = new EmbedBuilder()
    .setTitle(`${info.emoji}  ${info.name}`)
    .setColor(info.campColor)
    .setDescription(
      `${campBadge}\n\n${info.power}`
    )
    .addFields(
      { name: '\uD83C\uDF19 Quand agit-il ?', value: info.timing, inline: false },
      { name: '\uD83C\uDFC6 Condition de victoire', value: info.victory, inline: false }
    );

  if (info.tip) {
    embed.addFields({ name: '\uD83D\uDCA1 Conseil', value: info.tip, inline: false });
  }

  embed.setFooter({ text: 'Loup-Garou de Thiercelieux \u2022 /lg-info' });

  await interaction.reply({ embeds: [embed] });
}
