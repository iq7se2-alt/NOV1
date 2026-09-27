import type { CharNode, Layout } from "./types";

/**
 * Solar-system layout:
 *  - Protagonist (most appearances) sits at the golden core.
 *  - The other main characters form a ring around the core.
 *  - Every other character goes to the faction of its `factionId`
 *    (precomputed server-side from real chapter co-occurrence), falling
 *    back to client-side co-occurrence when chapters are provided.
 *  - Sectors are drawn as concentric "nightingale" rings so everything fits
 *    inside the canvas regardless of how skewed the house sizes are.
 *  - Characters with no faction land on an outer "drifter" ring.
 */
export function computeLayout(chars: CharNode[]): Layout {
  const pos = new Map<number, { x: number; y: number }>();
  const factionOf = new Map<number, number>();
  const cx = 50, cy = 50;

  const mains = chars.filter((c) => c.isMain).sort((a, b) => b.appearanceCount - a.appearanceCount);
  const others = chars.filter((c) => !c.isMain);
  const protagonist = mains[0] || null;
  const ringMains = protagonist ? mains.slice(1) : mains;

  // Core + main ring
  if (protagonist) pos.set(protagonist.id, { x: cx, y: cy });
  const R_MAIN = 20.5;
  ringMains.forEach((m, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(ringMains.length, 1)) * 2 * Math.PI;
    pos.set(m.id, { x: cx + R_MAIN * Math.cos(angle), y: cy + R_MAIN * Math.sin(angle) });
  });

  const mainIds = new Set(mains.map((m) => m.id));
  const hasChapters = chars.some((c) => c.chapters.length > 0);
  const mainChapters = new Map<number, Set<number>>();
  if (hasChapters) for (const m of mains) mainChapters.set(m.id, new Set(m.chapters));

  const groups = new Map<number | null, CharNode[]>();
  for (const o of others) {
    let best: number | null = null;
    let bestScore = 0;
    // Server-precomputed faction wins when it points at a visible main.
    if (o.factionId != null && mainIds.has(o.factionId)) {
      best = o.factionId;
      bestScore = 1;
    } else if (hasChapters) {
      for (const m of mains) {
        if (m.id === o.id) continue;
        const set = mainChapters.get(m.id);
        let score = 0;
        for (const ch of o.chapters) if (set?.has(ch)) score++;
        if (score > bestScore) { bestScore = score; best = m.id; }
      }
    }
    const key = bestScore > 0 ? best : null;
    if (key !== null) factionOf.set(o.id, key);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  const MIN_GAP = 3.0;
  const R_IN = 25.0;
  const R_OUT = 47.5;
  const drifters = groups.get(null) || [];
  const factions: { leaderId: number; list: CharNode[] }[] = [...groups.entries()]
    .filter(([k]) => k !== null)
    .map(([leaderId, list]) => ({ leaderId: leaderId as number, list: [...list].sort((a, b) => b.appearanceCount - a.appearanceCount) }));

  const leaderAngle = (id: number) => {
    if (protagonist && id === protagonist.id) return -Math.PI / 2;
    const p = pos.get(id);
    return p ? Math.atan2(p.y - cy, p.x - cx) : 0;
  };

  // Order factions by leader angle → contiguous arcs around the circle
  const ordered = [...factions].sort((a, b) => leaderAngle(a.leaderId) - leaderAngle(b.leaderId));
  const queues = new Map<number, CharNode[]>(ordered.map((f) => [f.leaderId, [...f.list]]));
  const remaining = ordered.map((f) => f.list.length);

  const allocateSlots = (weights: number[], total: number, C: number) => {
    const slots = weights.map((w) => Math.floor((w / total) * C));
    for (let i = 0; i < weights.length; i++) if (weights[i] > 0 && slots[i] === 0) slots[i] = 1;
    let used = slots.reduce((a, b) => a + b, 0);
    const rem = C - used;
    if (rem > 0) {
      const idx = weights
        .map((w, i) => ({ i, r: (w / total) * C - Math.floor((w / total) * C) }))
        .sort((a, b) => b.r - a.r);
      for (let k = 0; k < rem && k < idx.length; k++) slots[idx[k].i]++;
    } else if (rem < 0) {
      let rr = -rem;
      const idx = weights.map((w, i) => ({ i, w })).filter((x, i) => weights[i] > 0).sort((a, b) => a.w - b.w);
      for (const { i } of idx) { if (rr <= 0) break; if (slots[i] > 0) { slots[i]--; rr--; } }
    }
    return slots;
  };

  let r = R_IN;
  while (true) {
    const total = remaining.reduce((a, b) => a + b, 0);
    if (total <= 0) break;
    const C = Math.max(ordered.length, Math.floor((2 * Math.PI * r) / MIN_GAP));
    const slots = allocateSlots(remaining, total, C);
    let cum = -Math.PI / 2;
    for (let i = 0; i < ordered.length; i++) {
      const f = ordered[i];
      const queue = queues.get(f.leaderId)!;
      const cnt = Math.min(slots[i], queue.length);
      const arc = (slots[i] / C) * 2 * Math.PI;
      for (let k = 0; k < cnt; k++) {
        const a = cum + ((k + 1) * arc) / (cnt + 1);
        pos.set(queue.shift()!.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      remaining[i] -= cnt;
      cum += arc;
    }
    r += MIN_GAP;
    if (r > R_OUT + 2) break;
  }

  // Drifters — single outer ring, gap shrinks gracefully when crowded
  if (drifters.length > 0) {
    const R = 47.5;
    const gap = Math.min(MIN_GAP, (2 * Math.PI * R) / Math.max(drifters.length, 1));
    let k = 0;
    for (let a = -Math.PI / 2; k < drifters.length; a += gap / R) {
      pos.set(drifters[k].id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
      k++;
    }
  }

  return { pos, factionOf, protagonist };
}
