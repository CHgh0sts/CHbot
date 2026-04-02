export interface PendingEntry {
  resolve: (value: string | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingEntry>();

export function createWaiter(key: string, ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.delete(key)) resolve(null);
    }, ms);
    pending.set(key, { resolve, timer });
  });
}

export function fulfillPending(key: string, value: string | null): boolean {
  const p = pending.get(key);
  if (!p) return false;
  clearTimeout(p.timer);
  pending.delete(key);
  p.resolve(value);
  return true;
}

export function cancelAllForChannel(channelId: string): void {
  for (const [k, v] of pending) {
    if (k.startsWith(`${channelId}:`)) {
      clearTimeout(v.timer);
      pending.delete(k);
      v.resolve(null);
    }
  }
}
