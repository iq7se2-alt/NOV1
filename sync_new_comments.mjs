// Sync new WP comments since last imported wpDate
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

function decodeHtml(s) {
  return (s || "")
    .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "‘").replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

async function main() {
  const last = await prisma.comment.findFirst({
    orderBy: { wpDate: "desc" },
    where: { wpDate: { not: null } },
    select: { wpDate: true },
  });
  const cutoff = last ? new Date(last.wpDate) : new Date(0);
  console.log("cutoff:", cutoff.toISOString());

  // post id -> chapter number (from live dump, titles are authoritative)
  const dump = JSON.parse(fs.readFileSync("_live_chapters_v3.json", "utf8"));
  const postToNum = new Map();
  for (const p of dump) {
    const t = decodeHtml(p.title?.rendered).trim();
    const m = t.match(/^(\d+(?:\.\d+)?)/);
    if (m) postToNum.set(p.id, parseFloat(m[1]));
  }
  // ensure chapter rows exist
  const chapters = new Map((await prisma.chapter.findMany({ select: { id: true, number: true } })).map(c => [c.number, c.id]));

  const backup = `db/custom.db.backup-comments-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  fs.copyFileSync("db/custom.db", backup);
  console.log("backup:", backup);

  let page = 1, added = 0, skippedExisting = 0, noChapter = 0, stop = false;
  const cutoffMs = cutoff.getTime();
  while (!stop && page <= 60) {
    const res = await fetch(`https://truthnovel.top/wp-json/wp/v2/comments?per_page=100&orderby=date&order=desc&page=${page}`);
    if (!res.ok) { console.log("api page", page, "->", res.status); break; }
    const comments = await res.json();
    if (!comments.length) break;
    for (const c of comments) {
      const d = c.date_gmt ? new Date(c.date_gmt + "Z") : new Date(c.date || 0);
      if (d.getTime() <= cutoffMs) { stop = true; continue; }
      const existing = await prisma.comment.findUnique({ where: { wpCommentId: c.id }, select: { id: true } });
      if (existing) { skippedExisting++; continue; }
      const chNum = postToNum.get(c.post);
      const chId = chNum != null ? chapters.get(chNum) : undefined;
      if (!chId) { noChapter++; continue; }
      await prisma.comment.create({
        data: {
          chapterId: chId,
          author: decodeHtml(c.author_name) || "قارئ",
          content: (c.content?.rendered || "").trim(),
          wpCommentId: c.id,
          parentId: c.parent || null,
          wpDate: d,
          avatarUrl: c.author_avatar_urls?.["96"] || null,
          isReply: !!c.parent,
        },
      });
      added++;
    }
    const tp = Number(res.headers.get("X-WP-TotalPages") || 0);
    console.log(`page ${page}/${tp}: +${added} new (skipped ${skippedExisting}, noChapter ${noChapter})`);
    if (page >= tp) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`DONE: +${added} comments added`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
