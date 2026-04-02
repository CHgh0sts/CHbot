import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/admin-server';
import { RoleCardDefaultsAdminForm } from './RoleCardDefaultsAdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminRoleCardsPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect('/login?callbackUrl=/admin/role-cards');
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Images des cartes (défaut)
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        URLs HTTPS publiques utilisées quand un preset Discord n’a pas d’image
        Premium pour ce rôle. Le bot charge ces images via{' '}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          /api/public/role-card/[code]/[rôle]
        </code>
        .
      </p>
      <RoleCardDefaultsAdminForm />
    </div>
  );
}
