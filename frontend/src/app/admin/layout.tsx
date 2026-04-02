import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-4 text-sm">
          <Link
            href="/admin"
            className="font-medium text-zinc-900 dark:text-zinc-100"
          >
            Admin
          </Link>
          <Link
            href="/admin/users"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Utilisateurs
          </Link>
          <Link
            href="/admin/rules"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Règles composition
          </Link>
          <Link
            href="/admin/role-cards"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Images cartes
          </Link>
          <Link
            href="/"
            className="ml-auto text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Site
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}
