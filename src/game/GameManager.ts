import { GameSession } from './GameSession';

const games = new Map<string, GameSession>();

export function registerSession(session: GameSession): void {
  games.set(session.textChannelId, session);
  games.set(session.threadParentChannelId, session);
}

export function getSessionByTextChannel(channelId: string): GameSession | undefined {
  return games.get(channelId);
}

export function removeSession(channelId: string): void {
  const s = games.get(channelId);
  if (!s) {
    games.delete(channelId);
    return;
  }
  games.delete(s.textChannelId);
  games.delete(s.threadParentChannelId);
}
