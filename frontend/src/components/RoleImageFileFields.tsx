'use client';

import { useId, useState } from 'react';
import {
  BOT_ROLE_KEYS,
  BOT_ROLE_LABELS_FR,
  type BotRoleKey,
} from '@/lib/role-keys';
import type { RoleImageStored } from '@/lib/role-image-storage';
import { parseDataUrlToStored } from '@/lib/role-image-storage';

/** `string` = URL HTTPS encore présente en base (legacy) ; objet = fichier uploadé. */
export type RoleImageFieldValue = RoleImageStored | string | null;

function previewSrc(v: RoleImageFieldValue | undefined): string | undefined {
  if (v == null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t || undefined;
  }
  return `data:${v.mime};base64,${v.data}`;
}

export function RoleImageFileFields({
  values,
  onChange,
}: {
  values: Partial<Record<BotRoleKey, RoleImageFieldValue>>;
  onChange: (next: Partial<Record<BotRoleKey, RoleImageFieldValue>>) => void;
}) {
  const baseId = useId();
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fileError ? (
        <p className="col-span-full text-sm text-red-600 dark:text-red-400">
          {fileError}
        </p>
      ) : null}
      {BOT_ROLE_KEYS.map((key) => {
        const v = values[key];
        const src = previewSrc(v);
        const inputId = `${baseId}-${key}`;
        return (
          <div
            key={key}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {BOT_ROLE_LABELS_FR[key]}
              </label>
              {v != null ? (
                <button
                  type="button"
                  className="text-xs text-red-600 underline dark:text-red-400"
                  onClick={() => onChange({ ...values, [key]: null })}
                >
                  Retirer
                </button>
              ) : null}
            </div>
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 dark:file:bg-zinc-700"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const text = reader.result;
                  if (typeof text !== 'string') return;
                  const parsed = parseDataUrlToStored(text);
                  if ('error' in parsed) {
                    setFileError(
                      `${BOT_ROLE_LABELS_FR[key]} : ${parsed.error}`
                    );
                    return;
                  }
                  setFileError(null);
                  onChange({ ...values, [key]: parsed });
                };
                reader.readAsDataURL(file);
              }}
            />
            {typeof v === 'string' && v.trim().startsWith('https://') ? (
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                Image actuelle (URL) — envoie un <strong>fichier</strong> pour la
                remplacer par une image en base de données.
              </p>
            ) : null}
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="mt-2 max-h-28 w-auto max-w-full rounded border border-zinc-200 object-contain dark:border-zinc-600"
              />
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Aucune image</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
