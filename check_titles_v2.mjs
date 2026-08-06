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

function normalize(s) {
  return s.replace(/[–—]/g, "-").replace(/…/g, "...").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("=== Chapter Title Check v2 ===\n");
  const livePosts = await fetchAllLive();

  const liveMap = new Map();
  const unparsed = [];
  for (const p of livePosts) {
    const raw = p.title.rendered;
    const parsed = parseChapterFromTitle(raw);
    if (parsed) {
      liveMap.set(parsed.number, {
        number: parsed.number,
        liveTitle: parsed.title,
        rawTitle: decodeHtml(raw),
        slug: p.slug,
        id: p.id,
        date: p.date
      });
    } else {
      unparsed.push({ raw: decodeHtml(raw), slug: p.slug });
    }
  }

  console.log(`Parsed ${liveMap.size} live chapters`);
  if (unparsed.length) {
    console.log(`Unparsed: ${unparsed.length}`);
    for (const u of unparsed.slice(0, 5)) console.log(`  "${u.raw}" (${u.slug})`);
  }

  const dbChapters = await prisma.chapter.findMany({ orderBy: { number: "asc" } });
  console.log(`DB has ${dbChapters.length} chapters\n`);

  const matched = [];
  const cosmetic = [];
  const mismatches = [];
  const dbOnly = [];

  for (const db of dbChapters) {
    const live = liveMap.get(db.number);
    if (!live) { dbOnly.push(db); continue; }
    const dt = db.title.trim();
    const lt = live.liveTitle.trim();
    if (dt === lt) { matched.push(db.number); continue; }
    if (normalize(dt) === normalize(lt)) {
      cosmetic.push({ number: db.number, dbTitle: dt, liveTitle: lt, slug: live.slug });
    } else {
      mismatches.push({ number: db.number, dbTitle: dt, liveTitle: lt, slug: live.slug, rawLive: live.rawTitle });
    }
  }

  const liveOnly = [];
  for (const [num, live] of liveMap) {
    if (!dbChapters.find(d => d.number === num)) liveOnly.push(live);
  }

  mismatches.sort((a, b) => a.number - b.number);
  liveOnly.sort((a, b) => a.number - b.number);
  dbOnly.sort((a, b) => a.number - b.number);
  cosmetic.sort((a, b) => a.number - b.number);

  console.log("===========================================");
  console.log(`  Matched exactly:     ${matched.length}`);
  console.log(`  Cosmetic diffs:      ${cosmetic.length}`);
  console.log(`  Real mismatches:     ${mismatches.length}`);
  console.log(`  New on live site:    ${liveOnly.length}`);
  console.log(`  Only in DB (deleted): ${dbOnly.length}`);
  console.log("===========================================\n");

  if (mismatches.length) {
    console.log("REAL MISMATCHES:\n");
    for (const m of mismatches) {
      console.log(`  Ch ${m.number}:`);
      console.log(`    DB:   ${m.dbTitle}`);
      console.log(`    Live: ${m.liveTitle}`);
      console.log(`    Slug: ${m.slug}\n`);
    }
  }

  if (cosmetic.length) {
    console.log("\nCOSMETIC DIFFS:\n");
    for (const c of cosmetic) {
      console.log(`  Ch ${c.number}: DB="${c.dbTitle}" | Live="${c.liveTitle}"`);
    }
  }

  if (liveOnly.length) {
    console.log("\nNEW ON LIVE SITE:\n");
    for (const ch of liveOnly) console.log(`  Ch ${ch.number}: ${ch.liveTitle}`);
  }

  if (dbOnly.length) {
    console.log(`\nDB ONLY (deleted from site): ${dbOnly.length}`);
    let ranges = [], s = dbOnly[0].number, e = dbOnly[0].number;
    for (let i = 1; i < dbOnly.length; i++) {
      if (dbOnly[i].number === e + 1) { e = dbOnly[i].number; }
      else { ranges.push(s === e ? `${s}` : `${s}-${e}`); s = e = dbOnly[i].number; }
    }
    ranges.push(s === e ? `${s}` : `${s}-${e}`);
    console.log(`  Ranges: ${ranges.join(", ")}\n`);
  }

  const date = new Date().toLocaleString("ar-SA");
  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  let tables = "";

  if (mismatches.length) {
    tables += `<h2>❌ عناوين مختلفة فعلاً (${mismatches.length}) — تحتاج تصحيح</h2>
<p class="info">عناوين مختلفة بين DB والموقع. يجب تحديثها.</p>
<table><thead><tr><th>رقم</th><th>عنوان DB</th><th>عنوان الموقع</th><th>Slug</th></tr></thead><tbody>`;
    for (const m of mismatches) {
      tables += `<tr class="diff"><td class="num">${m.number}</td><td class="db">${esc(m.dbTitle)}</td><td class="live">${esc(m.liveTitle)}</td><td class="slug">${m.slug}</td></tr>`;
    }
    tables += `</tbody></table>`;
  }

  if (cosmetic.length) {
    tables += `<h2>🔸 اختلافات شكلية (${cosmetic.length})</h2>
<p class="info">اختلافات بسيطة (شرطة/نقاط). ليست أخطاء.</p>
<table><thead><tr><th>رقم</th><th>عنوان DB</th><th>عنوان الموقع</th></tr></thead><tbody>`;
    for (const c of cosmetic) {
      tables += `<tr><td class="num">${c.number}</td><td class="db">${esc(c.dbTitle)}</td><td class="live">${esc(c.liveTitle)}</td></tr>`;
    }
    tables += `</tbody></table>`;
  }

  if (liveOnly.length) {
    tables += `<h2>🆕 فصول جديدة في الموقع (${liveOnly.length})</h2>
<p class="info">موجودة على الموقع وغير موجودة في DB. يجب إضافتها.</p>
<table><thead><tr><th>رقم</th><th>العنوان</th><th>Slug</th><th>التاريخ</th></tr></thead><tbody>`;
    for (const ch of liveOnly) {
      tables += `<tr><td class="num">${ch.number} <span class="badge b-new">جديد</span></td><td class="live">${esc(ch.liveTitle)}</td><td class="slug">${ch.slug}</td><td>${ch.date ? ch.date.split("T")[0] : "-"}</td></tr>`;
    }
    tables += `</tbody></table>`;
  }

  if (dbOnly.length) {
    tables += `<h2>🗑️ محذوفة من الموقع (${dbOnly.length})</h2>
<p class="info">موجودة في DB فقط. المؤلف حذفها. يُنصح بالاحتفاظ.</p>
<table><thead><tr><th>رقم</th><th>العنوان</th></tr></thead><tbody>`;
    for (const ch of dbOnly) {
      tables += `<tr><td class="num">${ch.number} <span class="badge b-del">محذوف</span></td><td>${esc(ch.title)}</td></tr>`;
    }
    tables += `</tbody></table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>فحص عناوين الفصول</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Tahoma,sans-serif;background:#1a1a2e;color:#eee;padding:30px}
.wrap{max-width:1500px;margin:0 auto}
h1{color:#d4af37;text-align:center;font-size:2em;margin-bottom:8px}
h2{color:#d4af37;margin:30px 0 12px;font-size:1.3em;border-bottom:2px solid #d4af37;padding-bottom:8px}
.sub{text-align:center;color:#888;margin-bottom:25px}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:20px 0}
.st{background:#16213e;padding:16px;border-radius:10px;border:1px solid #333;text-align:center}
.sv{font-size:2.2em;font-weight:bold}
.sl{color:#999;margin-top:4px;font-size:.9em}
.s1 .sv{color:#4caf50}.s2 .sv{color:#ff9800}.s3 .sv{color:#f44336}.s4 .sv{color:#2196f3}.s5 .sv{color:#9e9e9e}
table{width:100%;border-collapse:collapse;background:#16213e;border-radius:10px;overflow:hidden;margin-bottom:16px}
th{background:#0f3460;color:#d4af37;padding:12px;text-align:right;font-size:.9em}
td{padding:10px 12px;border-bottom:1px solid #222;font-size:.9em}
tr:hover{background:#1a2744}
.db{color:#ccc}.live{color:#d4af37;font-weight:500}
.num{font-weight:bold;color:#d4af37;white-space:nowrap}
.slug{direction:ltr;font-size:.8em;color:#666;text-align:left}
.info{color:#999;margin-bottom:12px;font-size:.95em}
.diff{background:#3a1a1a!important}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.75em}
.b-new{background:#2196f3;color:#fff}.b-del{background:#9e9e9e;color:#fff}
</style></head><body><div class="wrap">
<h1>📊 فحص عناوين الفصول — تقرير شامل</h1>
<div class="sub">${date} | ${livePosts.length} بوست من الموقع | ${dbChapters.length} فصل في DB</div>
<div class="stats">
<div class="st s1"><div class="sv">${matched.length}</div><div class="sl">✅ متطابقة</div></div>
<div class="st s2"><div class="sv">${cosmetic.length}</div><div class="sl">🔸 اختلاف شكلي</div></div>
<div class="st s3"><div class="sv">${mismatches.length}</div><div class="sl">❌ مختلفة فعلاً</div></div>
<div class="st s4"><div class="sv">${liveOnly.length}</div><div class="sl">🆕 جديدة</div></div>
<div class="st s5"><div class="sv">${dbOnly.length}</div><div class="sl">🗑️ محذوفة</div></div>
</div>
${tables}
</div></body></html>`;

  fs.writeFileSync("title_check_results.html", html, "utf-8");
  console.log("\nSaved: title_check_results.html");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
