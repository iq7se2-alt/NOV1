import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

function decodeHtml(str) {
  return str
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// END_MARKERS: stop content at these (author notes / footers / donation prompts)
const END_MARKERS = [
  "هذه الرواية من تأليف",
  "لدعم هذا العمل مادياً",
  "دعم هذا العمل",
  "تحديث زيوسي/",
  "سيرفر ديسكورد",
  "فصول الشهر",
  "باي بال",
  "ملاحظة:",
  "https://",
  "http://",
  "تابعوا حساب",
  "ترجمة",
  "عالم المترجم",
  "ترجمة:",
  "اذا اعجبك الفصل",
  "اذا أعجبك الفصل",
  "ادعم الرواية",
  "للمزيد من الفصول"
];

function htmlToContent(html) {
  let text = html
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, "*$1*")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, "*$1*")
    .replace(/<hr[^>]*>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<p[^>]*>/g, "\n\n")
    .replace(/<\/p>/g, "")
    .replace(/<div[^>]*>/g, "\n\n")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&nbsp;/g, " ");
  
  // Strip "اذكر الله//" religious prefix
  text = text.replace(/^[\s\n]*اذكر(وا)? الله\s*\/\/\s*/g, "");
  text = text.replace(/^[\s\n]*اذكر(وا)? الله[^\n]*\n/g, "");
  
  // Truncate at first end marker
  let minIdx = text.length;
  for (const marker of END_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx !== -1 && idx < minIdx) minIdx = idx;
  }
  text = text.slice(0, minIdx);
  
  // Strip "==================" separator lines and long dash separators
  text = text.replace(/^\s*=+\s*$/gm, "");
  text = text.replace(/^\s*-{10,}\s*$/gm, "");
  
  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");
  
  // Trim
  text = text.trim();
  
  // Remove trailing fragment like "الفصل القادم" or leftover punctuation-only lines
  text = text.replace(/\n+[^\n]*الفصل( القادم)?[^\n]*$/, "");
  
  return text;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function parseChapterFromTitle(raw) {
  const title = decodeHtml(raw);
  const m = title.match(/^(\d+(?:\.\d+)?)\s*[–—\-.]\s*(.+)$/);
  if (m) return { number: parseFloat(m[1]), title: m[2].trim() };
  const n = title.match(/^(\d+(?:\.\d+)?)\s*$/);
  if (n) return { number: parseFloat(n[1]), title: title.trim() };
  return null;
}

async function fetchAllLive() {
  console.log("Fetching all posts from truthnovel.top...");
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://truthnovel.top/wp-json/wp/v2/posts?per_page=50&page=${page}`;
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const posts = await res.json();
      if (!posts.length) break;
      all.push(...posts);
      if (page % 10 === 0) console.log(`  page ${page}: ${all.length} total`);
      page++;
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error(`  error page ${page}:`, e.message);
      break;
    }
  }
  console.log(`  Total: ${all.length} posts\n`);
  return all;
}

async function main() {
  console.log("=== Import New Chapters (2343-2372) ===\n");
  
  // Backup DB first
  const backupName = `db/custom.db.backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  try {
    fs.copyFileSync("db/custom.db", backupName);
    console.log(`💾 Backup: ${backupName}\n`);
  } catch (e) {
    console.error("Backup failed:", e.message);
  }
  
  const livePosts = await fetchAllLive();
  
  const newChapters = [];
  const skipped = [];
  
  for (const post of livePosts) {
    const parsed = parseChapterFromTitle(post.title.rendered);
    if (!parsed) continue;
    if (parsed.number < 2343 || parsed.number > 2372) continue;
    
    // Check if already in DB
    const exists = await prisma.chapter.findUnique({ where: { number: parsed.number } });
    if (exists) {
      skipped.push(parsed.number);
      continue;
    }
    
    const content = htmlToContent(post.content.rendered || "");
    if (!content || content.length < 100) {
      console.log(`⚠️  Ch ${parsed.number} content too short (${content.length} chars), skipping. Raw: "${post.title.rendered}"`);
      skipped.push(parsed.number);
      continue;
    }
    
    newChapters.push({
      number: parsed.number,
      title: parsed.title,
      content,
      wordCount: countWords(content),
      sourceUrl: post.link || null,
      createdAt: new Date(post.date || new Date()),
      updatedAt: new Date(post.modified || new Date())
    });
  }
  
  newChapters.sort((a, b) => a.number - b.number);
  
  console.log(`\n📊 Found ${newChapters.length} new chapters to import:\n`);
  for (const ch of newChapters) {
    console.log(`  Ch ${ch.number}: ${ch.title} (${ch.content.length} chars, ${ch.wordCount} words)`);
  }
  
  if (newChapters.length === 0) {
    console.log("\nNo new chapters to import.");
    await prisma.$disconnect();
    return;
  }
  
  // Import
  let imported = 0;
  for (const ch of newChapters) {
    try {
      await prisma.chapter.create({
        data: {
          number: ch.number,
          title: ch.title,
          content: ch.content,
          wordCount: ch.wordCount,
          sourceUrl: ch.sourceUrl,
          createdAt: ch.createdAt,
          updatedAt: ch.updatedAt
        }
      });
      imported++;
      console.log(`  ✅ Imported Ch ${ch.number}: ${ch.title}`);
    } catch (e) {
      console.error(`  ❌ Failed Ch ${ch.number}:`, e.message);
    }
  }
  
  console.log(`\n✅ Imported ${imported} / ${newChapters.length} chapters`);
  
  // Save raw data for reference
  const rawData = newChapters.map(ch => ({
    number: ch.number,
    title: ch.title,
    contentChars: ch.content.length,
    wordCount: ch.wordCount
  }));
  fs.writeFileSync("imported_new_chapters.json", JSON.stringify(rawData, null, 2), "utf-8");
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
