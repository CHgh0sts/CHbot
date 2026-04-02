import type { DefaultSession } from 'next-auth';
import type { SiteRole, SubscriptionTier } from '@/generated/prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      siteRole: SiteRole;
      tier: SubscriptionTier;
      discordId: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    siteRole?: SiteRole;
    tier?: SubscriptionTier;
    discordId?: string | null;
  }
}
