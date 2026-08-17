import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const results = await prisma.$queryRawUnsafe('SELECT paragraphIndex, COUNT(*) as c FROM ChapterCharacter GROUP BY paragraphIndex ORDER BY c DESC LIMIT 8');
console.log("para distribution:", results);

// Check if positions actually match content for a sample
const robin = await prisma.character.findUnique({ where: { name: "روبين" } });
console.log("\nRobin id:", robin.id);

// Get a chapter where robin appears
const app = await prisma.chapterCharacter.findFirst({ where: { characterId: robin.id } });
const ch = await prisma.chapter.findUnique({ where: { id: app.chapterId } });
console.log("First appearance: chapter", ch.number, "para", app.paragraphIndex, "word", app.wordIndex);

const paras = ch.content.split(/\n\n+/);
const para = paras[app.paragraphIndex];
if (para) {
  console.log("\nParagraph", app.paragraphIndex, ":", JSON.stringify(para.slice(0, 120)));
  console.log("word at index", app.wordIndex, ":", JSON.stringify(para.slice(app.wordIndex, app.wordIndex + 10)));
}

// Check wordIndex semantics — is it char index or word index?
console.log("\n--- checking if wordIndex is char index ---");
console.log("char at wordIndex:", JSON.stringify(para.slice(app.wordIndex, app.wordIndex + 1)));
const words = para.split(/\s+/);
console.log("word[wordIndex]:", JSON.stringify(words[app.wordIndex]));

await prisma.$disconnect();
