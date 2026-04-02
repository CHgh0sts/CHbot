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
