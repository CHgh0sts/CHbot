import type { GameSession } from '../game/GameSession';
import { Role } from '../types';
import { statsApiBaseUrl, statsApiEnabled, statsApiSecret } from '../config';

const FETCH_TIMEOUT_MS = 8_000;

type WinSide = 'wolves' | 'village' | 'lovers';

function winningUserIds(session: GameSession, win: WinSide): string[] {
  const players = [...session.players.values()];
  if (win === 'wolves') {
    return players
      .filter((p) => p.role === Role.Werewolf)
      .map((p) => p.userId);
  }
  if (win === 'village') {
    return players
      .filter((p) => p.role !== Role.Werewolf)
      .map((p) => p.userId);
  }
  const lg = session.loversGroup;
  if (lg && lg.length >= 2) {
    return [...lg];
  }
  const alive = players.filter((p) => p.alive);
  if (
    alive.length === 2 &&
    alive[0]!.loverUserId === alive[1]!.userId &&
    alive[1]!.loverUserId === alive[0]!.userId
  ) {
    return [alive[0]!.userId, alive[1]!.userId];
  }
  return alive.map((p) => p.userId);
}

export function buildGameEndedPayload(session: GameSession, win: WinSide) {
  const winners = new Set(winningUserIds(session, win));
  return {
    guildId: session.guildId,
    channelId: session.textChannelId,
    endedAt: new Date().toISOString(),
    win,
    participants: [...session.players.values()].map((p) => ({
      discordUserId: p.userId,
      roleKey: p.role,
      alive: p.alive,
      won: winners.has(p.userId),
    })),
  };
}

async function internalFetch(
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  if (!statsApiEnabled()) return null;
  const url = `${statsApiBaseUrl.replace(/\/$/, '')}${path}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ac.signal,
      headers: {
        Authorization: `Bearer ${statsApiSecret}`,
        ...(init?.headers as Record<string, string>),
      },
    });
  } catch (e) {
    console.error('[stats-api]', path, e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Envoie la fin de partie au site (fire-and-forget côté appelant).
 */
export async function postGameEnded(
  session: GameSession,
  win: WinSide
): Promise<void> {
  if (!statsApiEnabled()) return;
  const body = buildGameEndedPayload(session, win);
  const res = await internalFetch('/api/internal/game-ended', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res?.ok) {
    console.error(
      '[stats-api] game-ended failed',
      res?.status,
      await res?.text().catch(() => '')
    );
  }
}

const TIER_ORDER: Record<string, number> = {
  FREE: 0,
  PREMIUM: 1,
};

function tierRank(tier: string): number {
  return TIER_ORDER[tier] ?? 0;
}

export function userTierMeetsMin(userTier: string, minTier: string): boolean {
  return tierRank(userTier) >= tierRank(minTier);
}

let rulesCache: { at: number; rules: Record<string, string> } | null = null;
const RULES_TTL_MS = 60_000;

export async function fetchCompositionRules(): Promise<Record<string, string>> {
  if (!statsApiEnabled()) return {};
  const now = Date.now();
  if (rulesCache && now - rulesCache.at < RULES_TTL_MS) {
    return rulesCache.rules;
  }
  const res = await internalFetch('/api/internal/composition-rules');
  if (!res?.ok) return rulesCache?.rules ?? {};
  const json = (await res.json().catch(() => null)) as {
    rules?: Record<string, string>;
  } | null;
  const rules = json?.rules ?? {};
  rulesCache = { at: now, rules };
  return rules;
}

export async function fetchUserTier(discordUserId: string): Promise<string> {
  if (!statsApiEnabled()) return 'FREE';
  const q = encodeURIComponent(discordUserId);
  const res = await internalFetch(`/api/internal/user-tier?discordId=${q}`);
  if (!res?.ok) return 'FREE';
  const json = (await res.json().catch(() => null)) as { tier?: string } | null;
  return json?.tier ?? 'FREE';
}

/** Corps `composition` du preset site (JSON), ou `null` si introuvable / API off. */
export async function fetchPartyPresetComposition(
  code: string
): Promise<unknown | null> {
  if (!statsApiEnabled()) return null;
  const c = code.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (c.length !== 5) return null;
  const res = await internalFetch(
    `/api/internal/party-preset?code=${encodeURIComponent(c)}`
  );
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    composition?: unknown;
  } | null;
  return json?.composition ?? null;
}
