const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('Searching for character named "أن"...');
  
  const char = await p.character.findUnique({
    where: { name: 'أن' }
  });
  
  if (char) {
    console.log('Found:', char);
    await p.character.delete({
      where: { id: char.id }
    });
    console.log('Deleted character "أن" (id:', char.id, ')');
  } else {
    console.log('Character "أن" not found');
  }
}

main().catch(console.error).finally(async () => {
  await p.$disconnect();
});