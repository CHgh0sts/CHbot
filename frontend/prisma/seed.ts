import { PrismaClient, SubscriptionTier } from '../src/generated/prisma';

const prisma = new PrismaClient();

const COMPOSITION_KEYS = [
  'includeSeer',
  'includeWitch',
  'includeHunter',
  'includeCupid',
  'includeGuard',
  'includeThief',
  'includeAngel',
  'includeLittleGirl',
  'revealDeadRoles',
  'darkNightMode',
  'gossipSeerMode',
  'tripleLoversMode',
  'announceNightProtection',
] as const;

async function main() {
  for (const compositionKey of COMPOSITION_KEYS) {
    await prisma.compositionAccessRule.upsert({
      where: { compositionKey },
      create: { compositionKey, minTier: SubscriptionTier.FREE },
      update: {},
    });
  }
  console.log('Composition rules seeded (default FREE).');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
