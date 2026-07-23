// يعيد استيراد التعليقات مع الردود والصور من truthnovel.top
// usage: node .ai-context/scripts/reimport_comments.mjs

const BASE = "https://truthnovel.top/wp-json/wp/v2";
const DB_PATH = "../db/custom.db";

import Database from "better-sqlite3";
const db = new Database(DB_PATH);

// Ensure Comment table has needed columns
db.exec(`CREATE TABLE IF NOT EXISTS Comment_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapterId INTEGER NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  wordAnchor TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  wpCommentId INTEGER UNIQUE,
  parentId INTEGER,
  wpDate TEXT,
  avatarUrl TEXT,
  isReply INTEGER DEFAULT 0
)`);

async function fetchAllComments() {
  let all = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/comments?per_page=100&page=${page}&orderby=id&order=asc`;
    console.log(`Fetching page ${page}...`);
    const res = await fetch(url);
    if (!res.ok) { console.error(`Page ${page} failed: ${res.status}`); break; }
    const data = await res.json();
    if (!data.length) break;
    all.push(...data);
    page++;
    if (page > 600) break;
    await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

async function main() {
  console.log("Fetching all comments...");
  const comments = await fetchAllComments();
  console.log(`Got ${comments.length} comments`);

  // Map WordPress post ID → chapter number
  const postMap = new Map();
  const posts = db.prepare("SELECT id, number FROM Chapter").all();
  for (const p of posts) postMap.set(p.id, p.number);

  // First pass: create parent comments
  let inserted = 0, repliesInserted = 0;
  const parentWpMap = new Map(); // wpCommentId → our DB id

  const insert = db.prepare(`INSERT OR IGNORE INTO Comment (chapterId, author, content, createdAt, wpCommentId, parentId, wpDate, avatarUrl, isReply)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // Sort: parents first, then replies
  const parents = comments.filter(c => c.parent === 0);
  const replies = comments.filter(c => c.parent !== 0);

  for (const c of parents) {
    const chapterNumber = postMap.get(c.post);
    const chapterId = db.prepare("SELECT id FROM Chapter WHERE number = ?").get(chapterNumber)?.id;
    if (!chapterId) continue;

    // Clean HTML content
    let content = c.content?.rendered || "";
    // Keep HTML but clean classes
    content = content.replace(/class="[^"]*"/g, "").replace(/style="[^"]*"/g, "");

    insert.run(
      chapterId,
      c.author_name || "مجهول",
      content,
      c.date,
      c.id,
      null,
      c.date,
      c.author_avatar_urls?.["96"] || null,
      0
    );
    parentWpMap.set(c.id, db.prepare("SELECT last_insert_rowid()").get());
    inserted++;
    if (inserted % 1000 === 0) console.log(`  Parents: ${inserted}`);
  }

  console.log(`Inserted ${inserted} parent comments`);

  // Second pass: replies
  for (const c of replies) {
    const chapterNumber = postMap.get(c.post);
    const chapterId = db.prepare("SELECT id FROM Chapter WHERE number = ?").get(chapterNumber)?.id;
    if (!chapterId) continue;

    // Find parent in our DB
    const parentRow = db.prepare("SELECT id FROM Comment WHERE wpCommentId = ?").get(c.parent);
    const parentId = parentRow?.id || null;

    let content = c.content?.rendered || "";
    content = content.replace(/class="[^"]*"/g, "").replace(/style="[^"]*"/g, "");

    insert.run(
      chapterId,
      c.author_name || "مجهول",
      content,
      c.date,
      c.id,
      parentId,
      c.date,
      c.author_avatar_urls?.["96"] || null,
      1
    );
    repliesInserted++;
    if (repliesInserted % 1000 === 0) console.log(`  Replies: ${repliesInserted}`);
  }

  console.log(`\nDone! ${inserted} parents + ${repliesInserted} replies`);
  db.close();
}

main().catch(console.error);
