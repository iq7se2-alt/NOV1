import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Load all characters
const chars = await prisma.character.findMany({ select: { id: true, name: true, nameEn: true } });
const charNames = chars.map(c => c.name);
console.log("DB characters:", charNames.length);

// Load ALL chapters
const chapters = await prisma.chapter.findMany({
  select: { id: true, number: true, content: true },
  orderBy: { number: "asc" }
});
console.log("DB chapters:", chapters.length);

// Arabic letter check (word boundaries)
const AR = /[\u0621-\u064A\u0660-\u0669\u0640\u0671-\u06D3\u06D5\u06E1-\u06FF]/;

// Patterns to find NEW name candidates
const PATTERNS = [
  /(?:قال|قالت|أجاب|أجابت|صاح|صاحت|همس|همست|ابتسم|ابتسمت|نظر|نظرت|أومأ|أومأت|التفت|التفتت|تذكر|تذكرت)\s+([\u0621-\u064A][\u0621-\u064A\u0650-\u064F\u0640 ]{2,29})/g,
  /(?:الأمير|الأميرة|الملك|الملكة|الدوق|الدوقة|البارون|اللورد|المارشال|القائد|الجنرال|السيد|السيدة|الشيخ|العم|الخال|الجد|الإمبراطور|الإمبراطورة|السلطان|القيصر|المستشار|الكاهن|المعلم|الأب|الأخ|الابن)\s+([\u0621-\u064A][\u0621-\u064A\u0650-\u064F\u0640 ]{1,29})/g,
];

// Normalize Arabic for matching
function norm(s) {
  return s
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

// Candidate collector: name -> { count, chapters: Set }
const candidates = new Map();
function addCandidate(name, chapterNum) {
  if (!name || name.length < 3) return;
  if (/[\d]/.test(name)) return;
  const n = norm(name);
  if (!n || n.length < 3) return;
  if (!candidates.has(n)) candidates.set(n, { count: 0, chapters: new Set(), display: name });
  candidates.get(n).count++;
  candidates.get(n).chapters.add(chapterNum);
}

// Scan every chapter for patterns (find NEW names)
console.log("\nScanning all chapters for name candidates...");
let processed = 0;
for (const ch of chapters) {
  const content = ch.content || "";
  for (const re of PATTERNS) {
    let m;
    while ((m = re.exec(content)) !== null) {
      addCandidate(m[1].trim(), ch.number);
    }
  }
  processed++;
  if (processed % 500 === 0) console.log(`  ${processed}/${chapters.length}`);
}

// Filter: appear >= 2 chapters
const strongCandidates = [];
for (const [n, data] of candidates) {
  if (data.chapters.size >= 2 && data.count >= 2) {
    strongCandidates.push({ norm: n, display: data.display, count: data.count, chapters: data.chapters.size });
  }
}
strongCandidates.sort((a, b) => b.count - a.count);

console.log(`\nTotal candidates: ${candidates.size}`);
console.log(`Strong candidates (>=2 chapters): ${strongCandidates.length}`);

// Which strong candidates are NOT already in DB as characters?
const dbNorms = new Set(charNames.map(norm));
const notInDB = strongCandidates.filter(c => !dbNorms.has(c.norm));
console.log(`Strong candidates NOT in DB: ${notInDB.length}`);
console.log("\nSample of new candidates NOT in DB:");
for (const c of notInDB.slice(0, 80)) {
  console.log(`  "${c.display}" (${c.count}x, ${c.chapters} chapters)`);
}

await prisma.$disconnect();
