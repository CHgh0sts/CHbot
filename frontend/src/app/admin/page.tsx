import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Administration
      </h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        Gère les grades d’abonnement, les rôles site (USER / MODERATOR / ADMIN) et
        les exigences de palier pour les options de partie du bot.
      </p>
      <ul className="space-y-3 text-zinc-800 dark:text-zinc-200">
        <li>
          <Link href="/admin/users" className="underline">
            Utilisateurs
          </Link>{' '}
          — palier Premium, promotion admin / modérateur
        </li>
        <li>
          <Link href="/admin/rules" className="underline">
            Règles de composition
          </Link>{' '}
          — quelle option nécessite au minimum quel grade
        </li>
        <li>
          <Link href="/admin/role-cards" className="underline">
            Images des cartes
          </Link>{' '}
          — URLs par défaut pour chaque rôle (bot / preset Discord)
        </li>
      </ul>
    </div>
  );
}
