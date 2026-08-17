import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Count appearances per character
const chars = await prisma.character.findMany({
  select: { id: true, name: true, isMain: true, imageUrl: true, description: true, _count: { select: { appearances: true } } },
  orderBy: { id: "asc" }
});
console.log("Total characters:", chars.length);
console.log("With image:", chars.filter(c => c.imageUrl).length);
console.log("With real description (>50 chars):", chars.filter(c => (c.description||"").length > 50).length);

const zero = chars.filter(c => c._count.appearances === 0);
console.log("With ZERO appearances:", zero.length);
if (zero.length) console.log("  sample:", zero.slice(0,10).map(c=>c.name).join(", "));

const one = chars.filter(c => c._count.appearances === 1);
console.log("With only 1 appearance:", one.length);

// Main chars
const mains = chars.filter(c => c.isMain);
console.log("\nMain characters:", mains.length);
for (const c of mains) {
  console.log(`  ${c.name}: ${c._count.appearances} apps, img=${c.imageUrl ? "yes" : "NO"}`);
}

// Show a sample of description quality
console.log("\nSample descriptions:");
const robin = chars.find(c => c.name === "روبين");
console.log("روبين:", robin.description);
const rich = chars.find(c => c.name === "ريتشارد");
console.log("ريتشارد:", rich?.description);
await prisma.$disconnect();
