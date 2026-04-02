import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-4 py-20">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">
        Botwolf — espace joueur
      </h1>
      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
        Lie ton compte Discord, consulte ton XP et ton historique de parties. Les
        administrateurs configurent les grades et les options de partie réservées aux
        abonnés.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Créer un compte
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Mon profil
        </Link>
      </div>
    </main>
  );
}
