import type { GuildTextBasedChannel } from 'discord.js';
import type { GameSession } from './GameSession';
import { publicEmbed } from '../services/MessagingService';

/** Couleur « conte / nuit » pour les annonces du salon principal */
const NIGHT_TALE = 0x2b2d42;
const MEUTE = 0x6c3483;

/**
 * Liste dynamique des temps forts de **cette** nuit (selon les rôles encore en jeu).
 */
export function buildNightRoadmap(session: GameSession): string {
  const lines: string[] = [];
  let i = 1;

  if (session.nightNumber === 1) {
    if (session.thiefId()) {
      lines.push(
        `${i++}. **Voleur** — échange de carte _· fil privé du voleur_`
      );
    }
    if (session.cupidId()) {
      const triple = session.compositionConfig.tripleLoversMode;
      lines.push(
        `${i++}. **Cupidon** — ${triple ? 'lie **trois** cœurs' : 'lie **deux** cœurs'} _· fil privé du Cupidon_`
      );
    }
  }

  if (session.seerId()) {
    const bavarde = session.compositionConfig.gossipSeerMode;
    lines.push(
      `${i++}. **Voyante** — ${bavarde ? 'observe un **rôle** _(détail en privé ; rôle public seulement si mort / annonce de mort)_' : 'observe si un joueur est **loup** ou non'} _· fil privé_`
    );
  }

  if (session.guardId()) {
    lines.push(
      `${i++}. **Garde** — désigne qui protéger des loups _· fil privé_`
    );
  }

  if (session.ravenId()) {
    lines.push(
      `${i++}. **Corbeau** — marque optionnellement un joueur pour **+2 votes** demain _· fil privé_`
    );
  }

  if (session.wolfIds().length > 0) {
    const pf =
      !session.elderCursed && session.littleGirlId() != null
        ? ' \u00b7 **Petite fille** : espionnage (optionnel, risque) _\u00b7 fil priv\u00e9_'
        : '';
    lines.push(
      `${i++}. **Loups-Garou** \u2014 la **meute** vote sa victime _\u00b7 fil **Meute** + \`/lg-vote\`_` +
        pf
    );
  }

  if (session.bigBadWolfId() && !session.anyWolfEverDied()) {
    lines.push(
      `${i++}. **Grand M\u00e9chant Loup** \u2014 d\u00e9vore un joueur suppl\u00e9mentaire (tant qu\u2019aucun loup n\u2019est mort) _\u00b7 fil priv\u00e9_`
    );
  }

  if (session.witchId()) {
    lines.push(
      `${i++}. **Sorci\u00e8re** \u2014 potions de vie et de mort _\u00b7 fil priv\u00e9_`
    );
  }

  if (session.whiteWerewolfId() && session.nightNumber % 2 === 0) {
    lines.push(
      `${i++}. **Loup-Blanc** \u2014 peut \u00e9liminer un loup en secret (nuit paire) _\u00b7 fil priv\u00e9_`
    );
  }

  if (session.piedPiperId()) {
    lines.push(
      `${i++}. **Joueur de Fl\u00fbte** \u2014 ensorcelle 2 joueurs vivants _\u00b7 fil priv\u00e9_`
    );
  }

  if (!session.elderCursed && session.redRidingHoodId() && session.hunterId()) {
    lines.push(
      `_(passif) **Chaperon Rouge** \u2014 prot\u00e9g\u00e9e des loups tant que le **Chasseur** est en vie_`
    );
  }

  if (session.elderId() && !session.elderSurvivedAttack) {
    lines.push(
      `_(passif) **Ancien** \u2014 survivra \u00e0 la 1re attaque des loups_`
    );
  }

  if (session.rustySwordKnightId()) {
    lines.push(
      `_(passif) **Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e** \u2014 si d\u00e9vor\u00e9, le 1er loup meurt \u00e0 l\u2019aube suivante_`
    );
  }

  if (session.wildChildId() && session.nightNumber === 1) {
    lines.push(
      `${i++}. **Enfant Sauvage** \u2014 choisit son mod\u00e8le (nuit 1 uniquement) _\u00b7 fil priv\u00e9_`
    );
  }

  if (session.nightNumber === 1 && session.sisterIds().length === 2) {
    lines.push(`${i++}. **Deux S\u0153urs** \u2014 se reconnaissent dans un fil partag\u00e9 (nuit 1)`);
  }

  if (session.nightNumber === 1 && session.brotherIds().length === 3) {
    lines.push(`${i++}. **Trois Fr\u00e8res** \u2014 se reconnaissent dans un fil partag\u00e9 (nuit 1)`);
  }

  if (session.foxId() && !session.foxLostPower) {
    lines.push(`${i++}. **Renard** \u2014 flairer 3 joueurs (loup parmi eux ?) _\u00b7 fil priv\u00e9_`);
  }

  if (session.pyromaniacId() && !session.pyromaniacIgnited) {
    lines.push(`${i++}. **Pyromane** \u2014 arroser ou d\u00e9clencher l\u2019incendie _\u00b7 fil priv\u00e9_`);
  }

  if (session.bearTamerId()) {
    lines.push(`_(passif) **Montreur d'Ours** \u2014 l\u2019ours grognera \u00e0 l\u2019aube si un voisin est loup_`);
  }

  if (session.nightNumber === 1 && session.dogWolfId() && !session.dogWolfChoseSide) {
    lines.push(`${i++}. **Chien-Loup** \u2014 choisit son camp (Village ou Loups, nuit 1) _\u00b7 fil priv\u00e9_`);
  }

  if (session.nightNumber === 1 && session.sectarianId()) {
    lines.push(`_(passif) **Sectaire Abominable** \u2014 r\u00e9partition des groupes secrets (nuit 1)_`);
  }

  if (session.docteurId() && session.docteurCharges > 0) {
    lines.push(`${i++}. **Docteur** \u2014 prot\u00e8ge un joueur (${session.docteurCharges} charge${session.docteurCharges > 1 ? 's' : ''} restante${session.docteurCharges > 1 ? 's' : ''}) _\u00b7 fil priv\u00e9_`);
  }

  if (session.infectFatherId() && !session.infectFatherUsed) {
    lines.push(`_(Infect P\u00e8re des Loups) \u2014 peut infecter la victime des loups (1 fois) \u00b7 fil priv\u00e9_`);
  }

  if (session.necromancerId() && session.necromancerThreadId) {
    lines.push(`_(passif) **N\u00e9cromancien** \u2014 les morts rejoignent son Antre des Morts (fil priv\u00e9 continu)_`);
  }

  if (session.sectarianId() && session.sectarianGroups.size > 0) {
    lines.push(`${i++}. **Sectaire Abominable** \u2014 inspecte le groupe d\u2019un joueur vivant _\u00b7 fil priv\u00e9_`);
  }

  if (session.devotedServantId() && !session.devotedServantUsed) {
    lines.push(`_(passif) **Servante D\u00e9vou\u00e9e** \u2014 apr\u00e8s chaque vote du village, peut prendre la place de la victime_`);
  }

  if (session.dictateurId() && !session.dictateurUsed) {
    lines.push(`_(passif/jour) **Dictateur** \u2014 avant le vote du village, peut s\u2019imposer et d\u00e9signer lui-m\u00eame la victime (1 fois par partie)_`);
  }

  const beforeAube = lines.length;
  lines.push(`${i}. **Aube** — révélation des morts et suite de la partie`);

  if (beforeAube === 0) {
    return `${i}. **Aube** — le jour se lève ; **aucune** phase secrète ce soir.`;
  }
  return lines.join('\n');
}

export async function sendNightPrologue(
  textChannel: GuildTextBasedChannel,
  session: GameSession
): Promise<void> {
  const roadmap = buildNightRoadmap(session);
  const body = [
    'Le village **s\u2019endort**. Les actions secrètes se jouent dans les **fils privés** (sous ce salon) — pas en message privé au bot.',
    '',
    '**Ce soir, dans l\u2019ordre (indicatif) :**',
    roadmap,
    '',
    '_**Silence ici = normal** : le bot attend les choix dans les fils. Ce n\u2019est en général **pas** un bug._',
  ].join('\n');

  await textChannel.send({
    embeds: [
      publicEmbed(`Nuit ${session.nightNumber} — brume sur le village`, body).setColor(
        NIGHT_TALE
      ),
    ],
  });
}

export async function sendNightBeat(
  textChannel: GuildTextBasedChannel,
  title: string,
  description: string,
  color: number = NIGHT_TALE
): Promise<void> {
  await textChannel.send({
    embeds: [publicEmbed(title, description).setColor(color)],
  });
}

/**
 * Annonce **sans** révéler qui est loup : les identités restent dans le **fil Meute** uniquement.
 */
export async function sendMeuteBeat(
  textChannel: GuildTextBasedChannel,
  _session: GameSession
): Promise<void> {
  await textChannel.send({
    embeds: [
      publicEmbed(
        'La meute s\u2019éveille',
        `Les joueurs qui sont **Loups-Garou** ont reçu l\u2019accès au **fil Meute** (vérifie tes **notifications** ou les **fils** sous ce salon).\n\n` +
          `**Si tu es loup :** ouvre ce fil, lis le tableau de votes, puis **\`/lg-vote\`** avec l\u2019option **cible** (pseudo ou mention).\n\n` +
          `**Si tu n\u2019es pas loup :** tu n\u2019as rien à faire — **aucune liste** de loups n\u2019est affichée ici à dessein.\n\n` +
          `_Le salon attend la meute ; **pas de bug** si ça prend un peu de temps._`
      ).setColor(MEUTE),
    ],
  });
}

export async function sendDawnApproaching(
  textChannel: GuildTextBasedChannel,
  session: GameSession
): Promise<void> {
  await sendNightBeat(
    textChannel,
    'Fin de la nuit…',
    `Les dernières **ombres** se retirent. **Nuit ${session.nightNumber}** touche à sa fin — le jour va se lever et les **morts** seront annoncés ici.`,
    NIGHT_TALE
  );
}

