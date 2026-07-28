const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient();
  
  // Search for Arabic letters that are commonly used as character names
  // ان (An), أن (An), إلخ
  const namesToDelete = ['ان', 'أن'];
  
  console.log('Searching for characters with names:', namesToDelete);
  
  // Find characters with these names
  const found = await p.character.findMany({
    where: {
      name: {
        in: namesToDelete
      }
    }
  });
  
  console.log('\nFound characters to delete:');
  found.forEach(char => {
    console.log(`  - Name: "${char.name}" (ID: ${char.id})${char.aliases ? ' - Aliases: ' + JSON.parse(char.aliases).length : ''}${char.chapterCount ? ' - Chapters: ' + char.chapterCount : ''}`);
  });
  
  if (found.length === 0) {
    console.log('\nNo characters found with the specified names.');
    await p.$disconnect();
    return;
  }
  
  // Delete all characters with these names
  console.log('\nDeleting characters...');
  const result = await p.character.deleteMany({
    where: {
      name: {
        in: namesToDelete
      }
    }
  });
  
  console.log(`\n✅ Deleted ${result.count} characters`);
  
  // Verify deletion
  const remaining = await p.character.findMany({
    where: {
      name: {
        in: namesToDelete
      }
    }
  });
  
  if (remaining.length === 0) {
    console.log('✅ All characters have been successfully deleted!');
  } else {
    console.log('❌ Some characters still remain:', remaining.map(c => c.name));
  }
  
  await p.$disconnect();
}

main().catch(console.error);