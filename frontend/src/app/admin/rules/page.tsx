import { adminUpdateRuleFromForm } from '@/actions/admin';
import prisma from '@/lib/prisma';
import { SubscriptionTier } from '@/generated/prisma';
import { COMPOSITION_KEYS } from '@/lib/composition-keys';

export const dynamic = 'force-dynamic';

export default async function AdminRulesPage() {
  const existing = await prisma.compositionAccessRule.findMany();
  const byKey = new Map(existing.map((r) => [r.compositionKey, r.minTier]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Règles d’accès (composition)
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Palier minimum pour <strong>activer</strong> chaque option via{' '}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/lg-config</code>{' '}
        (celui qui modifie la config doit avoir au moins ce grade).
      </p>

      <div className="space-y-4">
        {COMPOSITION_KEYS.map((key) => (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <code className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {key}
            </code>
            <form action={adminUpdateRuleFromForm} className="flex items-center gap-2">
              <input type="hidden" name="compositionKey" value={key} />
              <select
                name="minTier"
                defaultValue={byKey.get(key) ?? SubscriptionTier.FREE}
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {Object.values(SubscriptionTier).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white dark:bg-zinc-200 dark:text-zinc-900"
              >
                OK
              </button>
            </form>
          </div>
        ))}
      </div>

      {existing.length === 0 ? (
        <p className="mt-8 text-amber-700 dark:text-amber-400">
          Aucune règle en base : exécute{' '}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            npm run db:seed
          </code>{' '}
          après la première migration pour initialiser les clés (toutes en FREE).
        </p>
      ) : null}
    </div>
  );
}
