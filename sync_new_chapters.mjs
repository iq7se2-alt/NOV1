// Sync chapters newer than MAX_EXISTING from truthnovel.top (reusable for future syncs)
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const END_MARKERS = [
  "هذه الرواية من تأليف", "لدعم هذا العمل مادياً", "دعم هذا العمل", "تحديث زيوسي/",
  "سيرفر ديسكورد", "فصول الشهر", "باي بال", "https://", "http://",
  "تابعوا حساب", "ترجمة", "عالم المترجم", "ترجمة:", "اذا اعجبك الفصل", "اذا أعجبك الفصل",
  "ادعم الرواية", "للمزيد من الفصول", "ملاحظة:",
];
const NOTE_HINTS = ["سلام عليكم", "التعليقات", "ديسكورد", "اقتراح", "محبي الكلمات", "فصل اليوم", "قراء"];

function decodeHtml(str) {
  return str
    .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘").replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

function htmlToContent(html) {
  let text = decodeHtml(html)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, "*$1*")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, "*$1*")
    .replace(/<hr[^>]*>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<p[^>]*>/g, "\n\n")
    .replace(/<\/p>/g, "")
    .replace(/<div[^>]*>/g, "\n\n")
    .replace(/<\/div>/g, "")
    .replace(/<[^>]+>/g, "");

  // Strip leading religious prefix
  text = text.replace(/^\s*اذكر(وا)? الله\s*\/\/\s*/g, "");
  text = text.replace(/^\s*اذكر(وا)? الله[^\n]*\n/g, "");

  // Leading author-note strip (separator + note keywords)
  const head = text.slice(0, 2500);
  const m = head.match(/={4,}|[—–-]{6,}/);
  if (m) {
    const before = head.slice(0, m.index);
    if (NOTE_HINTS.some(h => before.includes(h)) && m.index > 40) {
      text = text.slice(m.index).replace(/^={4,}|^[—–-]{6,}/, "").replace(/^\s*بسم الله\s*[–—-]*\s*/, "");
    }
  }

  let minIdx = text.length;
  for (const marker of END_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx !== -1 && idx < minIdx) minIdx = idx;
  }
  text = text.slice(0, minIdx);

  text = text.replace(/^\s*=+\s*$/gm, "");
  text = text.replace(/^\s*-{10,}\s*$/gm, "");
  text = text.replace(/~{3,}/g, "\n\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();
  text = text.replace(/\n+[^\n]*الفصل( القادم)?[^\n]*$/, "");
  return text;
}

function countWords(text) { return text.split(/\s+/).filter(Boolean).length; }

function parseChapterFromTitle(raw) {
  const title = decodeHtml(raw).trim();
  let m = title.match(/^(\d+(?:\.\d+)?)\s*[–—\-.]\s*(.+)$/);
  if (m) return { number: parseFloat(m[1]), title: m[2].trim() };
  m = title.match(/^(\d+(?:\.\d+)?)\s*$/);
  if (m) return { number: parseFloat(m[1]), title: title.trim() };
  return null;
}

async function main() {
  const last = await prisma.chapter.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const maxNum = last.number;
  console.log(`=== Sync chapters > ${maxNum} ===`);

  const backupName = `db/custom.db.backup-sync-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  fs.copyFileSync("db/custom.db", backupName);
  console.log("backup:", backupName);

  // fetch all posts (per_page=50 — API pagination quirk)
  const all = [];
  for (let page = 1; page <= 60; page++) {
    const res = await fetch(`https://truthnovel.top/wp-json/wp/v2/posts?per_page=50&page=${page}`);
    if (!res.ok) break;
    all.push(...await res.json());
    const tp = Number(res.headers.get("X-WP-TotalPages") || 0);
    if (page >= tp) break;
    await new Promise(r => setTimeout(r, 250));
  }
  console.log("fetched posts:", all.length);
  fs.writeFileSync("_live_chapters_v3.json", JSON.stringify(all));

  const imported = [];
  for (const post of all) {
    const parsed = parseChapterFromTitle(post.title.rendered);
    if (!parsed || parsed.number <= maxNum) continue;
    const exists = await prisma.chapter.findUnique({ where: { number: parsed.number } });
    if (exists) continue;
    const content = htmlToContent(post.content.rendered || "");
    if (!content || content.length < 100) { console.log(`ch ${parsed.number} too short (${content.length}), skip`); continue; }
    await prisma.chapter.create({
      data: {
        number: parsed.number,
        title: parsed.title,
        content,
        wordCount: countWords(content),
        sourceUrl: post.link || null,
        createdAt: new Date(post.date || new Date()),
      },
    });
    imported.push({ number: parsed.number, title: parsed.title, chars: content.length });
    console.log(`imported ch ${parsed.number}: ${parsed.title} (${content.length} chars)`);
  }
  console.log(`\nDONE: ${imported.length} new chapters`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
