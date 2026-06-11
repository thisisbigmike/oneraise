const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: 'fghbbg' },
    include: {
      donations: true
    }
  });
  console.log(JSON.stringify(campaign, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
