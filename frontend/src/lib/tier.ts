import type { SubscriptionTier } from '@/generated/prisma';

const ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
};

export function tierRank(tier: SubscriptionTier): number {
  return ORDER[tier] ?? 0;
}

export function tierMeetsMin(
  userTier: SubscriptionTier,
  minTier: SubscriptionTier
): boolean {
  return tierRank(userTier) >= tierRank(minTier);
}
