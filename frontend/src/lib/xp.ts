/** XP de base par partie jouée */
export const XP_BASE = 10;
/** Bonus si le camp du joueur gagne */
export const XP_WIN_BONUS = 15;

export function xpAwardForGame(won: boolean): number {
  return XP_BASE + (won ? XP_WIN_BONUS : 0);
}

/**
 * Niveau progressif : seuils qui augmentent ~12 % à chaque niveau.
 */
export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  let level = 1;
  let spent = 0;
  let need = 100;
  const maxLevel = 500;
  while (spent + need <= xp && level < maxLevel) {
    spent += need;
    level += 1;
    need = Math.floor(need * 1.12);
  }
  return level;
}
