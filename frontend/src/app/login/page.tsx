import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/profile');
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Connexion
      </h1>
      <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Pas encore de compte ?{' '}
        <Link href="/register" className="underline">
          Inscription
        </Link>
      </p>
    </main>
  );
}
