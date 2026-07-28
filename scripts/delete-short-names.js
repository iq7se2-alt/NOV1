const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient();
  
  const chars = await p.character.findMany();
  const short = chars.filter(c => c.name.length <= 2);
  console.log('Short names:', short.map(c => c.name));
  
  for (const c of short) {
    console.log(`Deleting short name: ${c.name} (id: ${c.id})`);
    await p.character.delete({ where: { id: c.id } });
  }
  
  await p.$disconnect();
}

main().catch(console.error);