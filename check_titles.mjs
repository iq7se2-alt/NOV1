import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchAllLiveChapters() {
  console.log('📡 Fetching all chapters from truthnovel.top...');
  const allPosts = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://truthnovel.top/wp-json/wp/v2/posts?per_page=50&page=${page}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`   Page ${page}: HTTP ${res.status}`);
        hasMore = false;
        break;
      }
      const posts = await res.json();
      if (posts.length === 0) {
        hasMore = false;
      } else {
        allPosts.push(...posts);
        console.log(`   Page ${page}: ${posts.length} posts (total: ${allPosts.length})`);
        page++;
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error(`   Error on page ${page}:`, err.message);
      hasMore = false;
    }
  }
  
  console.log(`\n✅ Fetched ${allPosts.length} posts total\n`);
  return allPosts;
}

function parseChapterNumberFromTitle(title) {
  const match = title.match(/^(\d+(?:\.\d+)?)\s*[-–—\.]\s*(.+)$/);
  if (match) {
    return { number: parseFloat(match[1]), title: match[2].trim() };
  }
  return null;
}

async function main() {
  console.log('=== فحص عناوين الفصول ===\n');
  
  const livePosts = await fetchAllLiveChapters();
  
  const liveChapters = [];
  for (const post of livePosts) {
    const titleText = post.title.rendered;
    const parsed = parseChapterNumberFromTitle(titleText);
    if (parsed) {
      liveChapters.push({
        number: parsed.number,
        liveTitle: parsed.title,
        fullTitle: titleText,
        slug: post.slug
      });
    }
  }
  
  console.log(`📊 Parsed ${liveChapters.length} chapters from live site\n`);
  
  const dbChapters = await prisma.chapter.findMany({
    orderBy: { number: 'asc' }
  });
  
  console.log(`📊 Found ${dbChapters.length} chapters in database\n`);
  
  const mismatches = [];
  const matched = [];
  const liveOnly = [];
  const dbOnly = [];
  
  const liveMap = new Map();
  for (const ch of liveChapters) {
    liveMap.set(ch.number, ch);
  }
  
  for (const dbCh of dbChapters) {
    const liveCh = liveMap.get(dbCh.number);
    if (!liveCh) {
      dbOnly.push(dbCh);
    } else {
      const dbTitle = dbCh.title.trim();
      const liveTitle = liveCh.liveTitle.trim();
      
      if (dbTitle !== liveTitle) {
        mismatches.push({
          number: dbCh.number,
          dbTitle,
          liveTitle,
          slug: liveCh.slug
        });
      } else {
        matched.push(dbCh.number);
      }
    }
  }
  
  for (const liveCh of liveChapters) {
    const exists = dbChapters.find(db => db.number === liveCh.number);
    if (!exists) {
      liveOnly.push(liveCh);
    }
  }
  
  console.log('=== النتائج ===');
  console.log(`✅ عناوين متطابقة: ${matched.length}`);
  console.log(`❌ عناوين غير متطابقة: ${mismatches.length}`);
  console.log(`📌 موجودة فقط في الموقع: ${liveOnly.length}`);
  console.log(`📌 موجودة فقط في قاعدة البيانات: ${dbOnly.length}\n`);
  
  if (mismatches.length > 0) {
    console.log('❌ الفصول غير المتطابقة:\n');
    for (const m of mismatches) {
      console.log(`فصل ${m.number}:`);
      console.log(`  DB:   ${m.dbTitle}`);
      console.log(`  Live: ${m.liveTitle}`);
      console.log(`  Slug: ${m.slug}\n`);
    }
  }
  
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>فحص عناوين الفصول</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
  .container { max-width: 1400px; margin: 0 auto; }
  h1 { color: #8b6f1f; text-align: center; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 30px 0; }
  .stat { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
  .stat-value { font-size: 2.5em; font-weight: bold; color: #8b6f1f; }
  .stat-label { color: #666; margin-top: 5px; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  th { background: #8b6f1f; color: white; padding: 15px; text-align: right; }
  td { padding: 12px 15px; border-bottom: 1px solid #eee; }
  tr:hover { background: #f9f9f9; }
  .mismatch { background: #fff3cd !important; }
  .db-title { color: #666; }
  .live-title { color: #8b6f1f; font-weight: 500; }
  .number { font-weight: bold; color: #8b6f1f; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; }
  .badge-mismatch { background: #ffc107; color: #000; }
  .badge-only-live { background: #17a2b8; color: white; }
  .badge-only-db { background: #6c757d; color: white; }
</style>
</head>
<body>
<div class="container">
<h1>📊 فحص عناوين الفصول</h1>

<div class="stats">
  <div class="stat">
    <div class="stat-value">${matched.length}</div>
    <div class="stat-label">✅ عناوين متطابقة</div>
  </div>
  <div class="stat">
    <div class="stat-value">${mismatches.length}</div>
    <div class="stat-label">❌ عناوين غير متطابقة</div>
  </div>
  <div class="stat">
    <div class="stat-value">${liveOnly.length}</div>
    <div class="stat-label">📌 موجودة فقط في الموقع</div>
  </div>
  <div class="stat">
    <div class="stat-value">${dbOnly.length}</div>
    <div class="stat-label">📌 موجودة فقط في قاعدة البيانات</div>
  </div>
</div>

${mismatches.length > 0 ? `
<h2 style="color: #8b6f1f; margin-top: 40px;">❌ الفصول غير المتطابقة (${mismatches.length})</h2>
<table>
<thead>
<tr>
  <th>رقم الفصل</th>
  <th>العنوان في قاعدة البيانات</th>
  <th>العنوان في الموقع</th>
  <th>Slug</th>
</tr>
</thead>
<tbody>
${mismatches.map(m => `
<tr class="mismatch">
  <td class="number">${m.number}</td>
  <td class="db-title">${m.dbTitle}</td>
  <td class="live-title">${m.liveTitle}</td>
  <td style="direction: ltr; font-size: 0.85em;">${m.slug}</td>
</tr>
`).join('')}
</tbody>
</table>
` : ''}

${liveOnly.length > 0 ? `
<h2 style="color: #8b6f1f; margin-top: 40px;">📌 موجودة فقط في الموقع (${liveOnly.length})</h2>
<table>
<thead>
<tr>
  <th>رقم الفصل</th>
  <th>العنوان</th>
  <th>Slug</th>
</tr>
</thead>
<tbody>
${liveOnly.map(ch => `
<tr>
  <td class="number">${ch.number}</td>
  <td>${ch.liveTitle}</td>
  <td style="direction: ltr; font-size: 0.85em;">${ch.slug}</td>
</tr>
`).join('')}
</tbody>
</table>
` : ''}

${dbOnly.length > 0 ? `
<h2 style="color: #8b6f1f; margin-top: 40px;">📌 موجودة فقط في قاعدة البيانات (${dbOnly.length})</h2>
<table>
<thead>
<tr>
  <th>رقم الفصل</th>
  <th>العنوان</th>
</tr>
</thead>
<tbody>
${dbOnly.map(ch => `
<tr>
  <td class="number">${ch.number}</td>
  <td>${ch.title}</td>
</tr>
`).join('')}
</tbody>
</table>
` : ''}

</div>
</body>
</html>`;
  
  const fs = await import('fs');
  fs.writeFileSync('title_check_results.html', html, 'utf-8');
  console.log('\n💾 تم حفظ النتائج في: title_check_results.html');
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
