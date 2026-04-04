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
      session.littleGirlId() != null
        ? ' · **Petite fille** : espionnage (optionnel, risque) _· fil privé_'
        : '';
    lines.push(
      `${i++}. **Loups-Garou** — la **meute** vote sa victime _· fil **Meute** + \`/lg-vote\`_` +
        pf
    );
  }

  if (session.witchId()) {
    lines.push(
      `${i++}. **Sorcière** — potions de vie et de mort _· fil privé_`
    );
  }

  if (session.redRidingHoodId() && session.hunterId()) {
    lines.push(
      `_(passif) **Chaperon Rouge** — protégée des loups tant que le **Chasseur** est en vie_`
    );
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
