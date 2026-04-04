import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { Role } from '../types';

/** Cherche dans `src/images` et `src/images/cards` (plusieurs noms possibles par rôle). */
const ROLE_IMAGE_BASENAMES: Record<Role, string[]> = {
  [Role.Werewolf]: ['loup_garou', 'loup-garou', 'loup', 'werewolf', 'lg'],
  [Role.Villager]: ['villageois', 'villager'],
  [Role.Seer]: ['voyante', 'seer'],
  [Role.Witch]: ['sorciere', 'sorcière', 'witch'],
  [Role.Hunter]: ['chasseur', 'hunter'],
  [Role.Cupid]: ['cupidon', 'cupid'],
  [Role.Guard]: ['garde', 'guard'],
  [Role.Thief]: ['voleur', 'thief'],
  [Role.Angel]: ['ange', 'angel'],
  [Role.LittleGirl]: ['petite_fille', 'petite-fille', 'little_girl', 'littlegirl'],
  [Role.Raven]: ['corbeau', 'raven'],
  [Role.RedRidingHood]: ['chaperon_rouge', 'chaperon-rouge', 'red_riding_hood', 'redriding'],
  [Role.FoolOfVillage]: ['idiot_du_village', 'idiot', 'fool_of_village', 'fool'],
  [Role.Elder]: ['ancien', 'elder'],
  [Role.BigBadWolf]: ['grand_mechant_loup', 'bigbadwolf', 'big_bad_wolf', 'gml'],
  [Role.WhiteWerewolf]: ['loup_blanc', 'loup-blanc', 'white_werewolf', 'whitewolf'],
  [Role.PiedPiper]: ['joueur_de_flute', 'joueur_flute', 'pied_piper', 'piedpiper'],
  [Role.RustySwordKnight]: ['chevalier_epee_rouilee', 'chevalier_rouilee', 'rusty_sword_knight', 'knight'],
  [Role.Scapegoat]: ['bouc_emissaire', 'bouc', 'scapegoat'],
  [Role.WildChild]: ['enfant_sauvage', 'wild_child', 'wildchild'],
  [Role.Fox]: ['renard', 'fox'],
  [Role.Pyromaniac]: ['pyromane', 'pyromaniac'],
  [Role.BearTamer]: ['ours', 'bear_tamer', 'beartamer'],
  [Role.TwoSisters]: ['deux_soeurs', 'two_sisters'],
  [Role.ThreeBrothers]: ['trois_freres', 'three_brothers'],
  [Role.Docteur]: ['docteur'],
  [Role.Necromancer]: ['necromancien', 'necromancer'],
  [Role.Sectarian]: ['sectaire', 'sectarian'],
  [Role.DevotedServant]: ['servante', 'devoted_servant'],
  [Role.InfectFather]: ['infect_pere', 'infect_father'],
  [Role.DogWolf]: ['chien_loup', 'dog_wolf'],
  [Role.Dictateur]: ['dictateur'],
};

const EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg'] as const;

function imageSearchRoots(): string[] {
  return [
    path.join(process.cwd(), 'src', 'images'),
    path.join(process.cwd(), 'src', 'images', 'cards'),
  ];
}

/** Chemin absolu du fichier image pour ce rôle, ou `null`. */
export function resolveRoleCardPath(role: Role): string | null {
  for (const root of imageSearchRoots()) {
    for (const base of ROLE_IMAGE_BASENAMES[role]) {
      for (const ext of EXTENSIONS) {
        const full = path.join(root, `${base}${ext}`);
        if (fs.existsSync(full)) return full;
      }
    }
  }
  return null;
}

export function roleCardAttachmentForDiscord(
  role: Role
): { attachment: AttachmentBuilder; url: string } | null {
  const filePath = resolveRoleCardPath(role);
  if (!filePath) return null;
  const ext = path.extname(filePath) || '.png';
  const name = `carte-${String(role).toLowerCase()}${ext}`;
  return {
    attachment: new AttachmentBuilder(filePath, { name }),
    url: `attachment://${name}`,
  };
}

export type RoleCardEmbedSource = {
  /** Si défini, Discord charge l’image depuis cette URL HTTPS (pas de pièce jointe). */
  remoteImageUrl?: string | null;
};

/** Grande carte (fil privé — distribution / échange). */
export function embedWithRoleCardLarge(
  embed: EmbedBuilder,
  role: Role,
  source?: RoleCardEmbedSource | null
): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const remote = source?.remoteImageUrl?.trim();
  const out = EmbedBuilder.from(embed);
  if (remote) {
    out.setImage(remote);
    return { embed: out, files: [] };
  }
  const card = roleCardAttachmentForDiscord(role);
  if (!card) return { embed: out, files: [] };
  out.setImage(card.url);
  return { embed: out, files: [card.attachment] };
}

/** Miniature (annonces salon de partie). */
export function embedWithRoleCardThumbnail(
  embed: EmbedBuilder,
  role: Role,
  source?: RoleCardEmbedSource | null
): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const remote = source?.remoteImageUrl?.trim();
  const out = EmbedBuilder.from(embed);
  if (remote) {
    out.setThumbnail(remote);
    return { embed: out, files: [] };
  }
  const card = roleCardAttachmentForDiscord(role);
  if (!card) return { embed: out, files: [] };
  out.setThumbnail(card.url);
  return { embed: out, files: [card.attachment] };
}
