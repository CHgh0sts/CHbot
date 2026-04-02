import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { SubscriptionTier } from '@/generated/prisma';
import { PartyConfigForm } from './PartyConfigForm';

export const dynamic = 'force-dynamic';

export default async function ConfigsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/configs');
  }

  const presets = await prisma.partyConfigPreset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { publicCode: true, name: true, createdAt: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-6">
        <Link href="/profile" className="text-sm text-zinc-500 underline">
          ← Profil
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Config de parties
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Enregistre une composition Loup-Garou : tu reçois un{' '}
        <strong>code à 5 caractères</strong>. Sur Discord, lance{' '}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          /lg-init
        </code>{' '}
        et renseigne l’option <strong>preset</strong> avec ce code (le bot doit
        avoir <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          STATS_API_BASE_URL
        </code>{' '}
        et le même secret que le site).
      </p>
      <PartyConfigForm
        existing={presets}
        isPremium={session.user.tier === SubscriptionTier.PREMIUM}
      />
    </main>
  );
}
