'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SignOutButton } from '@/components/SignOutButton';

export function SiteNav() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Botwolf
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {status === 'loading' ? (
            <span className="text-zinc-400">…</span>
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Profil
              </Link>
              <Link
                href="/configs"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Presets partie
              </Link>
              {session.user.siteRole === 'ADMIN' ? (
                <Link
                  href="/admin"
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Admin
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
