'use client';

import { useCallback, useState } from 'react';
import {
  RoleImageFileFields,
  type RoleImageFieldValue,
} from '@/components/RoleImageFileFields';
import { BOT_ROLE_KEYS, type BotRoleKey } from '@/lib/role-keys';
import type { RoleImageStored } from '@/lib/role-image-storage';

function mergeLoaded(
  raw: Record<string, string | RoleImageStored> | undefined
): Record<BotRoleKey, RoleImageFieldValue | null> {
  const o = {} as Record<BotRoleKey, RoleImageFieldValue | null>;
  for (const k of BOT_ROLE_KEYS) {
    const v = raw?.[k];
    if (v === undefined) o[k] = null;
    else if (typeof v === 'string') o[k] = v;
    else o[k] = v;
  }
  return o;
}

function buildPayload(
  values: Record<BotRoleKey, RoleImageFieldValue | null>
): Record<string, RoleImageFieldValue | null> {
  return Object.fromEntries(
    BOT_ROLE_KEYS.map((k) => {
      const v = values[k];
      if (v === undefined || v === null) return [k, null];
      if (typeof v === 'string' && !v.trim()) return [k, null];
      return [k, v];
    })
  );
}

export function PresetImagesEditor({
  publicCode,
  isPremium,
}: {
  publicCode: string;
  isPremium: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<
    BotRoleKey,
    RoleImageFieldValue | null
  > | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/party-presets/${encodeURIComponent(publicCode)}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        roleImageOverrides?: Record<string, string | RoleImageStored>;
        error?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? 'Erreur');
        return;
      }
      setValues(mergeLoaded(data.roleImageOverrides));
      setLoaded(true);
    } catch {
      setMsg('Réseau');
    }
    setLoading(false);
  }, [publicCode]);

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) void load();
  };

  async function onSave() {
    if (!values) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/party-presets/${encodeURIComponent(publicCode)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleImageOverrides: buildPayload(values) }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        roleImageOverrides?: Record<string, string | RoleImageStored>;
      };
      if (!res.ok) {
        setMsg(data.error ?? 'Erreur');
        setSaving(false);
        return;
      }
      setValues(mergeLoaded(data.roleImageOverrides));
      setMsg('Enregistré.');
    } catch {
      setMsg('Réseau');
    }
    setSaving(false);
  }

  if (!isPremium) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Images par rôle : compte{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Premium
        </span>{' '}
        requis.
      </p>
    );
  }

  return (
    <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
      <button
        type="button"
        onClick={onToggle}
        className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
      >
        {open ? 'Masquer les images des cartes' : 'Images des cartes (fichiers)'}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {loading || !values ? (
            <p className="text-sm text-zinc-500">Chargement…</p>
          ) : (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Envoie une image par rôle (PNG, JPEG, WebP, GIF — stockage en
                base). Laisse vide ou retire pour utiliser l’image par défaut du
                site. Les anciennes URL HTTPS restent prises en charge si tu ne
                les remplaces pas.
              </p>
              <RoleImageFileFields
                values={values}
                onChange={(patch) =>
                  setValues((prev) =>
                    prev ? { ...prev, ...patch } : prev
                  )
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onSave()}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer les images'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void load()}
                  className="text-sm text-zinc-600 underline dark:text-zinc-400"
                >
                  Recharger
                </button>
              </div>
              {msg ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
