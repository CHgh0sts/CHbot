import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolveDiscordAvatarUrl } from '@/lib/discord-avatar';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      xp: true,
      level: true,
      tier: true,
      siteRole: true,
      discordId: true,
      email: true,
      gameParticipations: {
        take: 20,
        orderBy: { endedAt: 'desc' },
        select: {
          id: true,
          endedAt: true,
          roleKey: true,
          won: true,
          guildId: true,
          xpAwarded: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const avatarUrl = resolveDiscordAvatarUrl({
    image: session.user.image ?? user.image,
    discordId: user.discordId,
  });
  const displayName =
    user.name ?? session.user.name ?? user.email?.split('@')[0] ?? 'Joueur';
  const initial = displayName.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL Discord dynamique, pas besoin du loader Image
          <img
            src={avatarUrl}
            alt={`Avatar de ${displayName}`}
            width={112}
            height={112}
            className="size-28 shrink-0 rounded-full border-2 border-zinc-300 object-cover shadow-md dark:border-zinc-600"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex size-28 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 bg-linear-to-br from-zinc-200 to-zinc-300 text-3xl font-semibold text-zinc-700 dark:border-zinc-600 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-200"
            aria-hidden
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Profil
          </h1>
          <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            {displayName}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {user.email ?? session.user.email ?? 'Compte Discord'}
          </p>
        </div>
      </div>

      <section className="mb-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Progression
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-zinc-500">Niveau</dt>
            <dd className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {user.level}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">XP total</dt>
            <dd className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {user.xp}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Grade (abonnement)</dt>
            <dd className="font-medium text-zinc-800 dark:text-zinc-200">
              {user.tier}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Discord lié</dt>
            <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {user.discordId ? (
                user.discordId
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Non lié —{' '}
                  <Link href="/login" className="underline">
                    connecte Discord
                  </Link>
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Dernières parties enregistrées
        </h2>
        {user.gameParticipations.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Aucune partie encore synchronisée depuis le bot. Joue une partie
            jusqu’à la fin avec le site configuré côté bot.
          </p>
        ) : (
          <ul className="space-y-2">
            {user.gameParticipations.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {new Date(g.endedAt).toLocaleString('fr-FR')}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {g.roleKey}
                </span>
                <span
                  className={
                    g.won
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-500'
                  }
                >
                  {g.won ? 'Victoire' : 'Défaite'} · +{g.xpAwarded} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
