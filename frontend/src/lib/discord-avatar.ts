/**
 * URL d’avatar affichable : OAuth met souvent l’URL complète CDN dans `image`,
 * sinon on reconstruit depuis l’id Discord + hash, ou avatar par défaut Discord.
 */
export function resolveDiscordAvatarUrl(input: {
  image: string | null;
  discordId: string | null;
}): string | null {
  const { image, discordId } = input;

  if (image?.startsWith('http://') || image?.startsWith('https://')) {
    return image;
  }

  if (discordId && image && !image.includes('/')) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${image}.png?size=128`;
  }

  if (discordId) {
    try {
      const id = BigInt(discordId);
      const index = Number((id >> BigInt(22)) % BigInt(6));
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
      return null;
    }
  }

  return null;
}
