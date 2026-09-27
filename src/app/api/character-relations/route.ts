import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** GET /api/character-relations — public list with character names.
 *  ?format=csv|json  → download the whole graph as a file. */
export async function GET(req: NextRequest) {
  const relations = await db.characterRelation.findMany({
    orderBy: { type: "asc" },
    include: {
      from: { select: { id: true, name: true, imageUrl: true, isMain: true, kind: true, mentionCount: true } },
      to: { select: { id: true, name: true, imageUrl: true, isMain: true, kind: true, mentionCount: true } },
    },
  });

  const format = req.nextUrl.searchParams.get("format");
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(
      JSON.stringify(
        {
          exportedAt: stamp,
          count: relations.length,
          relations: relations.map((r) => ({
            from: r.from.name,
            to: r.to.name,
            type: r.type,
            chapters: r.description,
            fromMentions: r.from.mentionCount,
            toMentions: r.to.mentionCount,
          })),
        },
        null,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="character-relations-${stamp}.json"`,
        },
      }
    );
  }

  if (format === "csv") {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "from,to,type,chapters,from_mentions,to_mentions";
    const rows = relations.map((r) =>
      [r.from.name, r.to.name, r.type, r.description, r.from.mentionCount, r.to.mentionCount]
        .map(esc)
        .join(",")
    );
    // BOM so Excel opens the Arabic text correctly
    return new Response("﻿" + [header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="character-relations-${stamp}.csv"`,
      },
    });
  }

  return Response.json({ relations });
}

/** POST /api/character-relations — admin only */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();
  let body: { fromId?: number; toId?: number; type?: string; description?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "طلب غير صالح" }, { status: 400 }); }

  if (!body.fromId || !body.toId || !body.type?.trim())
    return Response.json({ error: "البيانات ناقصة" }, { status: 400 });

  const relation = await db.characterRelation.create({
    data: {
      fromId: body.fromId,
      toId: body.toId,
      type: body.type.trim(),
      description: body.description?.trim() || null,
    },
    include: {
      from: { select: { id: true, name: true, imageUrl: true, isMain: true } },
      to: { select: { id: true, name: true, imageUrl: true, isMain: true } },
    },
  });
  return Response.json({ relation }, { status: 201 });
}
