const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find characters with short names or "أن"
  const chars = await p.character.findMany({
    where: { name: { in: ['أن', 'آن', 'ان', 'ان'] } },
  });
  console.log('Found:', chars.map(c => c.name));
  
  for (const c of chars) {
    const del = await p.character.delete({ where: { id: c.id } });
    console.log('Deleted:', del.name, '(id:', del.id, ')');
  }
}

main().catch(console.error).finally(() => p.$disconnect());