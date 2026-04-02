import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

function discordClientId(): string {
  return (
    process.env.AUTH_DISCORD_ID?.trim() ||
    process.env.DISCORD_CLIENT_ID?.trim() ||
    process.env.CLIENT_ID?.trim() ||
    ''
  );
}

function discordClientSecret(): string {
  return (
    process.env.AUTH_DISCORD_SECRET?.trim() ||
    process.env.DISCORD_CLIENT_SECRET?.trim() ||
    ''
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Discord({
      clientId: discordClientId(),
      clientSecret: discordClientSecret(),
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: 'credentials',
      name: 'Email et mot de passe',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const uid = user?.id ?? token.sub;
      if (uid) {
        const db = await prisma.user.findUnique({
          where: { id: uid },
          select: {
            siteRole: true,
            tier: true,
            discordId: true,
            name: true,
            image: true,
          },
        });
        if (db) {
          token.siteRole = db.siteRole;
          token.tier = db.tier;
          token.discordId = db.discordId;
          token.name = db.name;
          token.picture = db.image;
        }
      }
      if (trigger === 'update' && session?.user && token.sub) {
        const db = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            siteRole: true,
            tier: true,
            discordId: true,
            name: true,
            image: true,
          },
        });
        if (db) {
          token.siteRole = db.siteRole;
          token.tier = db.tier;
          token.discordId = db.discordId;
          token.name = db.name;
          token.picture = db.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.siteRole) session.user.siteRole = token.siteRole;
        if (token.tier) session.user.tier = token.tier;
        session.user.discordId = token.discordId ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (
        account?.provider === 'discord' &&
        user.id &&
        account.providerAccountId
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: { discordId: account.providerAccountId },
        });
        await prisma.gameParticipation.updateMany({
          where: {
            discordUserId: account.providerAccountId,
            userId: null,
          },
          data: { userId: user.id },
        });
      }
    },
  },
});
