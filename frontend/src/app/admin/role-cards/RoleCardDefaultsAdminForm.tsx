'use client';

import { useEffect, useState } from 'react';
import {
  RoleImageFileFields,
  type RoleImageFieldValue,
} from '@/components/RoleImageFileFields';
import { BOT_ROLE_KEYS, type BotRoleKey } from '@/lib/role-keys';

function emptyValues(): Record<BotRoleKey, RoleImageFieldValue | null> {
  return Object.fromEntries(BOT_ROLE_KEYS.map((k) => [k, null])) as Record<
    BotRoleKey,
    RoleImageFieldValue | null
  >;
}

export function RoleCardDefaultsAdminForm() {
  const [values, setValues] =
    useState<Record<BotRoleKey, RoleImageFieldValue | null>>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/role-card-defaults');
        const data = (await res.json().catch(() => ({}))) as {
          defaults?: Record<string, { mime: string; data: string }>;
          error?: string;
        };
        if (!cancelled && res.ok && data.defaults) {
          const next = emptyValues();
          for (const k of BOT_ROLE_KEYS) {
            const row = data.defaults[k];
            next[k] = row ? { mime: row.mime as never, data: row.data } : null;
          }
          setValues(next);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      const defaults: Record<string, { mime: string; data: string } | null> = {};
      for (const k of BOT_ROLE_KEYS) {
        const v = values[k];
        if (v === null || v === undefined) {
          defaults[k] = null;
          continue;
        }
        if (typeof v === 'string') {
          defaults[k] = null;
          continue;
        }
        defaults[k] = { mime: v.mime, data: v.data };
      }
      const res = await fetch('/api/admin/role-card-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        defaults?: Record<string, { mime: string; data: string }>;
      };
      if (!res.ok) {
        setMsg(data.error ?? 'Erreur');
        setSaving(false);
        return;
      }
      if (data.defaults) {
        const next = emptyValues();
        for (const k of BOT_ROLE_KEYS) {
          const row = data.defaults[k];
          next[k] = row ? { mime: row.mime as never, data: row.data } : null;
        }
        setValues(next);
      }
      setMsg('Enregistré.');
    } catch {
      setMsg('Réseau');
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-zinc-500">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Fichiers <strong>PNG, JPEG, WebP ou GIF</strong> (≈ 1,5 Mo max par
        image). Stockage en base de données (base64).
      </p>
      <RoleImageFileFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer les défauts'}
      </button>
      {msg ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>
      ) : null}
    </div>
  );
}
