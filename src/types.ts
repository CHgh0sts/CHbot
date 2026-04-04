export enum Role {
  Werewolf = 'WEREWOLF',
  Villager = 'VILLAGER',
  Seer = 'SEER',
  Witch = 'WITCH',
  Hunter = 'HUNTER',
  Cupid = 'CUPID',
  Guard = 'GUARD',
  Thief = 'THIEF',
  Angel = 'ANGEL',
  LittleGirl = 'LITTLE_GIRL',
  Raven = 'RAVEN',
  RedRidingHood = 'RED_RIDING_HOOD',
  FoolOfVillage = 'FOOL_OF_VILLAGE',
  Elder = 'ELDER',
  BigBadWolf = 'BIG_BAD_WOLF',
  WhiteWerewolf = 'WHITE_WEREWOLF',
  PiedPiper = 'PIED_PIPER',
  RustySwordKnight = 'RUSTY_SWORD_KNIGHT',
  Scapegoat = 'SCAPEGOAT',
  WildChild = 'WILD_CHILD',
  Fox = 'FOX',
  Pyromaniac = 'PYROMANIAC',
  BearTamer = 'BEAR_TAMER',
  TwoSisters = 'TWO_SISTERS',
  ThreeBrothers = 'THREE_BROTHERS',
}

export type GamePhase = 'lobby' | 'night' | 'day' | 'ended';

export type NightSubPhase =
  | 'none'
  | 'thief'
  | 'seer'
  | 'angel'
  | 'guard'
  | 'wolves'
  | 'witch'
  | 'raven'
  | 'bigbadwolf'
  | 'whitewolf'
  | 'piedpiper'
  | 'wildchild'
  | 'fox'
  | 'pyromaniac';

export interface PlayerState {
  userId: string;
  displayName: string;
  role: Role;
  alive: boolean;
  /** Partenaire désigné par le Cupidon (les deux ont le même lien mutuel) */
  loverUserId: string | null;
}
