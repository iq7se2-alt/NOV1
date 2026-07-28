const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient();
  
  const names = ['ان', 'أن'];
  console.log('Searching for characters with names:', names);
  
  // Find all characters with these names
  const chars = await p.character.findMany({
    where: {
      name: {
        in: names
      }
    }
  });
  
  if (chars.length === 0) {
    console.log('No characters found with these names');
    await p.$disconnect();
    return;
  }
  
  console.log('\nFound characters:');
  chars.forEach(c => {
    const aliases = c.aliases ? JSON.parse(c.aliases).length || 0 : 0;
    console.log(`  - ID: ${c.id}, Name: "${c.name}" (aliases: ${aliases})`);
  });
  
  // Delete all characters with these names
  console.log('\nDeleting characters...');
  const result = await p.character.deleteMany({
    where: {
      name: {
        in: names
      }
    }
  });
  
  console.log(`\n✅ Deleted ${result.count} characters`);
  
  // Also verify deletion
  const remaining = await p.character.findMany({
    where: {
      name: {
        in: names
      }
    }
  });
  
  if (remaining.length === 0) {
    console.log('✅ All characters with names "ان" and "أن" have been removed.');
  } else {
    console.log('❌ Some characters still remain:', remaining.map(c => c.name));
  }
  
  await p.$disconnect();
}

main().catch(console.error);