'use client';

import { useState } from 'react';
import { PresetImagesEditor } from '@/components/PresetImagesEditor';
import {
  RoleImageFileFields,
  type RoleImageFieldValue,
} from '@/components/RoleImageFileFields';
import { BOT_ROLE_KEYS, type BotRoleKey } from '@/lib/role-keys';
import type { CompositionConfigJson } from '@/lib/party-preset-schema';
import { defaultCompositionFormValues } from '@/lib/party-preset-schema';

type ExistingRow = {
  publicCode: string;
  name: string | null;
  createdAt: Date | string;
};

const boolRow = (
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void
) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded border-zinc-400"
    />
    {label}
  </label>
);

export function PartyConfigForm({
  existing,
  isPremium,
}: {
  existing: ExistingRow[];
  isPremium: boolean;
}) {
  const [comp, setComp] =
    useState<CompositionConfigJson>(defaultCompositionFormValues);
  const [presetName, setPresetName] = useState('');
  const [roleImages, setRoleImages] = useState<
    Partial<Record<BotRoleKey, RoleImageFieldValue | null>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [list, setList] = useState(existing);

  function set<K extends keyof CompositionConfigJson>(
    key: K,
    value: CompositionConfigJson[K]
  ) {
    setComp((c) => ({ ...c, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedCode(null);
    setLoading(true);
    try {
      const roleImageOverrides = Object.fromEntries(
        BOT_ROLE_KEYS.map((k) => [k, roleImages[k] ?? null])
      );
      const hasAnyImage = BOT_ROLE_KEYS.some((k) => {
        const v = roleImages[k];
        if (v == null) return false;
        if (typeof v === 'string') return v.trim() !== '';
        return Boolean(v.data?.trim());
      });

      const res = await fetch('/api/party-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName.trim() || undefined,
          composition: comp,
          ...(isPremium && hasAnyImage ? { roleImageOverrides } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        publicCode?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Erreur');
        setLoading(false);
        return;
      }
      if (data.publicCode) {
        setCreatedCode(data.publicCode);
        setList((prev) => [
          {
            publicCode: data.publicCode!,
            name: presetName.trim() || null,
            createdAt: new Date(),
          },
          ...prev,
        ]);
      }
    } catch {
      setError('Réseau');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-10">
      {createdCode ? (
        <div className="rounded-xl border border-green-600/40 bg-green-500/10 p-4 text-green-900 dark:text-green-100">
          <p className="font-medium">Preset créé</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest">
            {createdCode}
          </p>
          <p className="mt-2 text-sm opacity-90">
            Sur Discord : commande{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">
              /lg-init
            </code>
            , option <strong>preset</strong> ={' '}
            <span className="font-mono font-semibold">{createdCode}</span>.
          </p>
        </div>
      ) : null}

      {list.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">Tes codes</h2>
          <ul className="space-y-2 text-sm">
            {list.map((p) => (
              <li
                key={p.publicCode}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono font-semibold tracking-wider">
                    {p.publicCode}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {p.name ?? '—'} ·{' '}
                    {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <PresetImagesEditor
                  publicCode={p.publicCode}
                  isPremium={isPremium}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            Nom du preset (optionnel)
          </label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            maxLength={120}
            className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="ex. Soirée classique"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Min. joueurs (4–18)
            </span>
            <input
              type="number"
              min={4}
              max={18}
              value={comp.minPlayers}
              onChange={(e) =>
                set('minPlayers', Number.parseInt(e.target.value, 10) || 4)
              }
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Loups (vide = auto au lancement)
            </span>
            <select
              value={comp.wolfCount === null ? '' : String(comp.wolfCount)}
              onChange={(e) => {
                const v = e.target.value;
                set('wolfCount', v === '' ? null : Number.parseInt(v, 10));
              }}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Auto</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              Villageois fixes (vide = calcul auto comme le bot)
            </span>
            <select
              value={
                comp.villagerCount === null ? '' : String(comp.villagerCount)
              }
              onChange={(e) => {
                const v = e.target.value;
                set('villagerCount', v === '' ? null : Number.parseInt(v, 10));
              }}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Auto (recommandé)</option>
              {Array.from({ length: 19 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPremium ? (
          <fieldset className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <legend className="px-1 text-sm font-medium">
              Images des cartes (Premium)
            </legend>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Optionnel : un fichier image par rôle (enregistré en base). Sinon
              le bot utilise les images définies par les admins du site.
            </p>
            <RoleImageFileFields
              values={roleImages}
              onChange={(p) => setRoleImages((v) => ({ ...v, ...p }))}
            />
          </fieldset>
        ) : (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            Compte <strong>Premium</strong> : images personnalisées par preset
            (fichiers, stockés en base).
          </p>
        )}

        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <legend className="px-1 text-sm font-medium">Rôles & options</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {boolRow('Voyante', comp.includeSeer, (v) => set('includeSeer', v))}
            {boolRow('Sorcière', comp.includeWitch, (v) =>
              set('includeWitch', v)
            )}
            {boolRow('Chasseur', comp.includeHunter, (v) =>
              set('includeHunter', v)
            )}
            {boolRow('Cupidon', comp.includeCupid, (v) =>
              set('includeCupid', v)
            )}
            {boolRow('Garde', comp.includeGuard, (v) => set('includeGuard', v))}
            {boolRow('Voleur', comp.includeThief, (v) => set('includeThief', v))}
            {boolRow('Ange', comp.includeAngel, (v) => set('includeAngel', v))}
            {boolRow('Petite fille', comp.includeLittleGirl, (v) =>
              set('includeLittleGirl', v)
            )}
            {boolRow('Rôles des morts visibles', comp.revealDeadRoles, (v) =>
              set('revealDeadRoles', v)
            )}
            {boolRow('Nuit sombre', comp.darkNightMode, (v) =>
              set('darkNightMode', v)
            )}
            {boolRow('Voyante bavarde', comp.gossipSeerMode, (v) =>
              set('gossipSeerMode', v)
            )}
            {boolRow('Ménage à trois (Cupidon)', comp.tripleLoversMode, (v) =>
              set('tripleLoversMode', v)
            )}
            {boolRow('Protection publique (nuit)', comp.announceNightProtection, (v) =>
              set('announceNightProtection', v)
            )}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? 'Enregistrement…' : 'Créer le preset et obtenir le code'}
        </button>
      </form>
    </div>
  );
}
