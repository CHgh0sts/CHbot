import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RegisterForm } from './RegisterForm';

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/profile');
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Inscription
      </h1>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Déjà un compte ?{' '}
        <Link href="/login" className="underline">
          Connexion
        </Link>
      </p>
    </main>
  );
}
