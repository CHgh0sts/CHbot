import { adminUpdateUserFromForm } from '@/actions/admin';
import prisma from '@/lib/prisma';
import { SiteRole, SubscriptionTier } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { discordId: { contains: query } },
            { name: { contains: query, mode: 'insensitive' } },
            { id: { equals: query } },
          ],
        }
      : undefined,
    take: 80,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      discordId: true,
      siteRole: true,
      tier: true,
      xp: true,
      level: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Utilisateurs
      </h1>

      <form method="get" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          placeholder="Email, Discord ID, nom, id…"
          defaultValue={query}
          className="max-w-md flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Rechercher
        </button>
      </form>

      <div className="space-y-6">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="mb-3 font-mono text-xs text-zinc-500">{u.id}</div>
            <div className="mb-4 grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              <div>
                <strong>{u.name ?? '—'}</strong>{' '}
                {u.email ? <span>({u.email})</span> : null}
              </div>
              <div>Discord: {u.discordId ?? '—'}</div>
              <div>
                XP {u.xp} · Niveau {u.level}
              </div>
            </div>
            <form action={adminUpdateUserFromForm} className="flex flex-wrap gap-3">
              <input type="hidden" name="userId" value={u.id} />
              <label className="flex items-center gap-2 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Rôle site</span>
                <select
                  name="siteRole"
                  defaultValue={u.siteRole}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {Object.values(SiteRole).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Grade</span>
                <select
                  name="tier"
                  defaultValue={u.tier}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {Object.values(SubscriptionTier).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-800 px-3 py-1 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Enregistrer
              </button>
            </form>
          </div>
        ))}
      </div>

      {users.length === 0 ? (
        <p className="text-zinc-500">Aucun résultat.</p>
      ) : null}
    </div>
  );
}
