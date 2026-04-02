'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-server';
import { SiteRole, SubscriptionTier } from '@/generated/prisma';
import { isCompositionKey, type CompositionKey } from '@/lib/composition-keys';

export async function adminUpdateUserFromForm(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) throw new Error('Interdit');

  const id = String(formData.get('userId') ?? '');
  const siteRoleRaw = formData.get('siteRole');
  const tierRaw = formData.get('tier');

  if (!id) throw new Error('Utilisateur manquant');

  const siteRole =
    siteRoleRaw && siteRoleRaw !== ''
      ? (siteRoleRaw as SiteRole)
      : undefined;
  const tier =
    tierRaw && tierRaw !== '' ? (tierRaw as SubscriptionTier) : undefined;

  if (siteRole === undefined && tier === undefined) {
    return;
  }

  if (id === session.user.id && siteRole === SiteRole.USER) {
    throw new Error('Tu ne peux pas te retirer le rôle admin');
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(siteRole !== undefined && { siteRole }),
      ...(tier !== undefined && { tier }),
    },
  });

  revalidatePath('/admin/users');
}

export async function adminUpdateRuleFromForm(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) throw new Error('Interdit');

  const compositionKey = String(formData.get('compositionKey') ?? '');
  const minTier = formData.get('minTier') as SubscriptionTier | null;

  if (!compositionKey || !minTier) throw new Error('Données manquantes');
  if (!isCompositionKey(compositionKey)) throw new Error('Clé invalide');

  await prisma.compositionAccessRule.upsert({
    where: { compositionKey },
    create: {
      compositionKey: compositionKey as CompositionKey,
      minTier,
    },
    update: { minTier },
  });

  revalidatePath('/admin/rules');
}
