import { auth } from '@/auth';
import { SiteRole } from '@/generated/prisma';

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.siteRole !== SiteRole.ADMIN) {
    return null;
  }
  return session;
}
