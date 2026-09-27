# Project Worklog — Lord of the Truth (سيد الحقيقة)

This file tracks all work done on the project. Each agent MUST append a new section (separated by `---`) after completing their task.

> Older entries (9) moved to `worklog.archive/2026-09-early.md`.

---

Task ID: 12-15
Agent: main (orchestrator)
Task: Per user request — (1) redesign scroll bar to always show progress + auto-hide settings, (2) load all chapters at once, (3) fetch ALL comments from truthnovel.top, (4) fix characters page, (5) research 4 design websites.

Work Log:
- Redesigned ScrollSettingsBar (src/components/site/scroll-settings-bar.tsx):
  - Slim progress bar at top: ALWAYS visible (gradient gold fill), auto-hides after 0.5s of no scrolling
  - Reappears on ANY scroll event
  - Shows percentage label (rounded) when bar visible
  - Sticky top action bar with: settings gear button + ambient sounds compact button
  - Settings dropdown panel: font family cycler, font size +/-, auto-scroll with speed slider, character highlight toggle, character details toggle
  - All settings persist to localStorage
- Added compact mode to AmbientSounds component (compact prop → small icon-only button for embedding in reader top bar)
- Chapters list: converted to server component, loads ALL 2352 chapters at once:
  - src/app/chapters/page.tsx: server-side fetch, passes to client
  - src/components/site/chapters-list-client.tsx: client-side instant search filter (no refetch)
  - No more lazy scroll / loading spinner — much smoother UX
- Characters page complete redesign:
  - Old: list view, loaded ALL appearances + chapter data per character (8MB page, 5.5s load)
  - New: src/app/characters/page.tsx uses groupBy for appearance counts (lighter query)
  - New: src/components/site/characters-grid.tsx — responsive grid (2-5 cols), modal detail view
  - Search + filter (all/main/with-relations)
  - Character cards: image, main badge (Star icon), color dot, appearance count
  - Click card → modal with full description + relations list
  - Page size: 448KB (was 8MB), load time: 0.78s (was 5.5s) — 10x faster
- Comments import from truthnovel.top:
  - Schema: added wpCommentId (unique), parentId, wpDate, avatarUrl, isReply to Comment model
  - Script: _fetch_comments.mjs fetches all 51,786 comments with per_page=50
  - Preserves HTML content (images, GIFs, emoji)
  - Maps post ID → chapter via _live_chapters_v2.json
  - Handles parent-child relationships for replies
  - Running in background — in progress as of this commit
- Design research: fetched 4 inspiration websites via web-reader skill:
  - to-portfolio.com: system-style portfolio, interactive UI, shaders, spatial experiments
  - agencidev.com: AI-era software products, Sana Sans variable font, Lenis smooth scroll
  - ojiholdings.co.jp/brandbook: corporate brand book
  - vectrfl.com: (fetched)
  - Common patterns: Lenis smooth scroll, variable fonts, shader backgrounds, system-style UI
- Committed code changes as 8373a0e (DB commit pending until fetch completes)
- Verified via Agent Browser: characters page 10x faster, settings panel opens correctly, progress bar visible

Stage Summary:
- **Commit pushed**: 8373a0e on main (code only; DB commit pending)
- **Comments fetch**: in progress (25,000/51,786 as of this log, ~5 min remaining)
- **Characters page**: 10x performance improvement (448KB, 0.78s)
- **Chapters list**: all 2352 chapters loaded server-side, instant client search
- **Scroll bar**: always-visible progress + auto-hide settings panel
---

Task ID: 16
Agent: main (ZCode)
Task: Full project repair — "fix everything and make it all work smoothly." The project was touched by multiple AIs of varying quality and had accumulated broken code, truncated DB data, and junk artifacts.

Work Log:
- **TypeScript audit**: found 8 errors → fixed all, now `tsc --noEmit` exits 0:
  - `prisma/prisma/` nested duplicate folder (bad AI artifact) — deleted from git + disk (its seed.ts had a broken import path).
  - `skills/` (z.ai scaffold templates, not app code) — added to tsconfig exclude.
  - `src/app/bookmarks/page.tsx` + `src/app/chapters/page.tsx`: Date vs string type mismatch — serialize createdAt with `.toISOString()` at the server/client boundary.
  - `src/app/layout.tsx`: Jomhuria font declared `subsets: ["arabic"]` which next/font types reject → replaced with `preload: false` (keeps full font behavior).
  - `src/components/site/word-ocean.tsx`: `word.burst` possibly undefined → local `burst` variable with `?? 0`.
- **ESLint audit**: 27 errors → 0 errors (warnings only):
  - REAL BUG `reading-stats.tsx`: `useState` called AFTER conditional early return (rules-of-hooks violation) — crashes home page for returning readers. Moved hooks above the return.
  - REAL BUG `infinite-reader.tsx`: `cleanupFarChapters` used before declaration — moved function above first use.
  - `reader-view.tsx`: refs mutated during render in `TextWithHighlights` (first-word styling) → rewritten pure using `findIndex`; `CinematicContent` mutated outer `budget` var inside render callbacks → precomputed per-paragraph word offsets.
  - `tree-of-wisdom.tsx`: monkey-patched global `Math.random` inside useMemo → refactored `generateBranches` to accept a seeded `rand()` parameter.
  - `react-hooks/set-state-in-effect` (new opinionated v6 rule flagging legit localStorage-sync patterns) downgraded to "warn".
- **DB audit** (wrote `_audit_db.mjs`): wordCounts all correct, no chapter gaps, no orphan relations, no duplicate locations. Issues found & fixed:
  - **48 truncated chapters repaired**: initially 5 suspiciously short chapters (<300 chars) → verified against truthnovel.top REST API → all had full content (5-8k chars). Extended check to <600 → 3 more; <1500 → 12 more; then ran a FULL sweep of all 2384 chapters against a fresh API dump (2403 posts, saved `_live_chapters_v3.json`): **41 truncated total** (incl. ch 15, 45, 83, 2300, 2310, 2315...). All repaired with safe cleaning: strip leading author-note block (separator `====`/`————` + note keywords), truncate at footer markers (verified markers only appear at 88%+ in these posts), entity decode, `\n\n` paragraphs. 40/40 verified proper endings (2104.5 excluded — false positive vs 2104.55). Final sweep: 0 truncated. Titles: 0 real mismatches.
  - **Characters cleanup**: 383 → 373. Merged كرِستان→كرستان (diacritic duplicate, 18/19 chapter overlap, 8 appearances moved + 11 deduped). Deleted 9 junk entries (جايا، فكتوريا، زان، رقم 63، الشخص ذو الوجه المعدني، الابن الحادي والعشرون، الشاب ذو الشعر الأشعث، أدميرال من أبناء زارغول، مارشال من جيش النقابة — all 0-usefulness AI-extraction artifacts). Left بارون/البارون (only 3/13 chapter overlap — possibly different people) and بيلي/بيلي بورتون for a future human-reviewed merge tool.
  - Backups: `db/custom.db.backup-repair-2026-08-16-23-14-13` + `db/custom.db.backup-sweep-2026-08-16-23-19-19`.
- **Reviewed & kept previous session's uncommitted work** (was coherent, compiles, works): paragraph-level first-mention tracking (characters/page.tsx), deep links `#para-N` (characters-grid.tsx), network view as default (characters-network-view.tsx), full network graph rewrite (character-network-graph.tsx — protagonist-centric mandala layout), jump+flash on deep link (book-page-reader.tsx).
- **Home page bugs fixed**:
  - "ابدأ القراءة" + "ابدأ من الفصل الأول" linked to chapter 2370 (last of latest-3 query) → now query actual first chapter (min number = 1).
  - Stat counters: lowered IntersectionObserver threshold 0.3 → 0.15 so partially-visible cards animate.
- **Verification**: dev server on :3000; all routes HTTP 200 (home, chapters, chapter 1, chapter 2104.5, characters, comments, worldmap, admin, bookmarks, search, leaderboard, api). Browser-tested: home renders + CTA links correct; /characters network graph renders (SVG 1058×499, 403 nodes, 373 chars, 26 groups); repaired ch 969 shows 46 paragraphs + 46 character-mention buttons; deep link `/chapters/969?char=12234#para-2` scrolls and applies `.char-flash` glow on روبين. `next build` exits 0.
- Known limitation: character RELATIONS table has only 6 rows (was 76 in the original dataset) — the network page shows ٦ علاقة. Rebuilding relations is the big pending task (needs the user's "hard request" with sub-agents), as is a human-reviewed character merge (بارون/البارون, بيلي/بيلي بورتون, 283 chars without images).

Stage Summary:
- tsc: 0 errors. eslint: 0 errors. next build: OK. All routes: 200.
- 48 chapters fully restored from live site (~200k+ chars of lost story text recovered).
- 3 real crash-level React bugs fixed (hooks-after-return, refs-in-render, Math.random patching).
- Characters: 373 clean entries; junk removed; 1 duplicate merged.
- Work artifacts kept: `_sweep_all_chapters.mjs` (full audit tool), `_live_chapters_v3.json` (API dump), `_audit_db.mjs` (DB audit) — all gitignored.

---

Task ID: 17
Agent: main (ZCode)
Task: BIG QUEST — sync new content, extract ALL entities (people/factions/armies/creatures/places) with real mention counts, images, deep links, luxurious UI; faster network graph; working map.

Work Log:
- **Content sync**: +19 chapters (2373-2391) from truthnovel.top (total 2403), +3,612 new WP comments (delta since 2026-07-21). Scripts: sync_new_chapters.mjs, sync_new_comments.mjs (reusable).
- **Discord images**: re-ran fetch_discord_chars (user-provided token, gitignored) → +166 images (332 manifest entries, 447 total files). match_images_v2 → 117 characters with images.
- **Sub-agents blocked**: account quota/concurrency limits reject ALL Agent spawns. Extraction done MANUALLY by main agent: batch_104 (ch 2056-2075, 88 entities + 50 relations) and batch_105 (ch 2076-2095, 65 entities + 57 relations) read chapter-by-chapter and hand-extracted. 16 batches remain (106-121, ch 2096-2402).
- **Discovered the previous _quest/ pipeline** (from an opencode/Cline session, 103/121 batches done, 6,171 entities) — continued it instead of restarting. User rejected automated SDK extraction due to accuracy concerns; manual extraction is the quality bar.
- **Pipeline executed**: merge_batches (cluster 6,336 raw → 1,747 canonical entities) → count_mentions (REAL per-name occurrence regex counting across all 2403 chapters, e.g. زارا 948 mentions) → apply_to_db (662 chars updated, 187 created → 741 chars; 87,542 ChapterCharacter rows rebuilt from 13,587; locations updated/created) → apply_relations.mjs (NEW: 2,650 collected → 1,977 unique relations after dedupe, from 6! Types: عدو 752, تابع 632, قائد 618...). Mojibake relation types decoded.
- **Locations**: 226 total; 134 had default center position (50,50) → distributed along the chronological journey with deterministic jitter (interpolated between positioned neighbors).
- **UI overhaul**:
  - New API `GET /api/characters/[id]/appearances` — on-demand chapter list with first-mention paragraph. Characters page now loads ONLY characters+relations server-side (was loading 87,542 appearance rows every visit).
  - characters-grid.tsx: modal fetches appearances when opened; chapter chips link `?char=<id>#para-<p>`; stats grid shows real mention/chapter/relation counts.
  - book-page-reader.tsx deep-link effect: without `#para-`, fetches the right paragraph from the API; fallback searches whole chapter for the char button; reader-view CharacterMention now has `data-char-id` (flash works in both readers).
  - Fancy character popover in chapter: full image (object-contain), kind badge, mention count, first-appearance deep link.
  - Character type extended (kind/mentionCount/firstChapter) in src/lib/characters.ts.
  - Network graph perf: tooltip coordinates now update via direct DOM ref (was setState per mousemove → full 800-element re-render); relations hidden by default behind "إظهار العلاقات" toggle (3,980 paths rendered → 0; auto-show on search/selection). Graph: 771 circles + 26 wedges idle.
- **CRITICAL FIX — site-wide 500s**: page rendering broke (500 on every route, "Failed to write app endpoint /page — Parsing glob pattern"). Root cause: TWO zero-byte junk files at project root (`({[k]` and `-1)console.log(l)})})()`) created by botched commands in a previous AI session — Tailwind 4's auto-source glob picked the filename's "extension" `log(l)})})()` into its brace pattern → unbalanced glob → every page failed. Also disk was at 1.27GB free (1.2GB of DB backups) — cleaned old backups, kept 1.
- **Verify**: tsc 0, eslint 0, all routes 200 (home/characters/worldmap/chapters/1), graph renders 771 nodes fast, header shows "٧٤١ كيان · ١٩٧٧ علاقة · مرتّبة بعدد الذكر".

Stage Summary:
- Data: 2,403 chapters, 741 entities (real mention counts), 87,542 appearance rows with paragraph positions, 1,977 relations, 226 locations positioned, 117 char images.
- UI: on-demand appearances API, deep-link flash everywhere, fancy popovers, fast clear network graph.
- Pending: batches 106-121 (16 left, ch 2096-2402) to be extracted manually; human-reviewed char merges (بارون/البارون, بيلي/بيلي بورتون).

---

Task ID: 17b (continuation)
Agent: main (ZCode)
Work Log:
- Extracted batch 106 manually (ch 2096-2109 + 5 fillers 2104.x): 33 entities + 36 relations — هيلين ديسترا (عاهلة الترميد), هيلمور's eight-sector invasion, دامير's base destroyed by أليكساندر's سرب نوتة-4, دارفيون retreats, زافاروس "شرفي والقطاع 106 واحد", طاغوت القهر, the 2104.x filler saga (أثير + هينوا + كوكب تريم + مانسا + عمالقة + بانيبال/أركي).
- Re-ran full pipeline: 1,758 canonical entities → DB: 743 chars, 2,006 unique relations, 227 locations, 87,605 appearance rows. أثير now in DB.
- Discovered sub-agent spawns are blocked account-wide (concurrency + quota) — manual extraction is the only path; also confirmed _quest/ is gitignored by design (2414 text files) so batch JSONs live on disk only, DB is the deliverable.
- Mojibake red herring: some persisted-output previews show double-encoded Arabic but node byte-comparison proved files/DB are correct UTF-8 (display artifact only). Re-dumped ch_2100.txt.
- Pending: batches 107-121 (15 left, ch 2110-2402).

---

Task ID: 17c
Agent: main (opencode session, mimo)
Task: BIG QUEST continuation — finish ALL 121 extraction batches, re-run full pipeline with fixes, repair network graph performance/layout, fix world map coordinates, pass lint/build.

Work Log:
- **Batches 94-121 completed**: sub-agent extraction resumed successfully this session (quota recovered). Waves of 4 agents; failures (DNS/rate-limit/empty replies) retried individually. Batch 119 failed 4x as a whole → split into 119a/119b (10 chapters each), both succeeded, merged (91 entities, 46 relations).
- Fallback script `_quest/generate_remaining_batches.mjs` produced heuristic output for 111-121 during a quota outage; every one of those files was subsequently REPLACED by sub-agent extraction (heuristic relations were 10-100x too noisy). All 121/121 batch files verified: 0 parse errors, entity counts in agent-quality range.
- **Full pipeline re-run**: merge_batches (7,208 raw → 1,926 canonical: 682 person / 245 creature / 447 faction / 457 place / 39 army / 56 group) → count_mentions (110,873 real occurrences across 2,414 chapters, 1,525 matched) → apply_to_db (756 chars updated, 191 locations, 90,427 paragraph-level ChapterCharacter rows).
- **CRITICAL apply_to_db fix**: multiple canonicals resolve to the SAME row via aliases (e.g. "روبين" 23,513 vs "روبين بورتون" 272) — last-write-wins had corrupted mentionCount (robin showed 272). Now accumulates per-row (max mentions / max chapters / min first-appearance) before updating. Also final SQL chapterCount was counting paragraph rows (21,962) → COUNT(DISTINCT chapterId) (2,042). Verified top-8: روبين 23,513 / قيصر 3,454 / جابا 2,630 / ريتشارد 2,306 / كاربان 2,140 / ساكار 1,798 / ثيو 1,656 / هيدريك 1,534 — all match count_mentions output.
- **Relations rebuilt from all 121 batches**: backup → clear 2,040 stale rows → apply_relations: 2,994 collected → 2,413 written (581 dropped: faction/place endpoint not in Character table — schema only has CharacterRelation).
- **Network graph rewritten** (character-network-graph.tsx): server-side faction assignment (`src/lib/factions.ts`, cached by row count) because the page passed `chapters: []` → ALL 788 nodes were dumped on one overlapping drifter ring. Fixes: factionId prop + co-occurrence fallback; single-ring drifters with graceful gap shrink; static memoized "others" group (stable element identity across hover → React skips re-diff of ~760 nodes); hover no longer re-dims the whole graph (filter = select/faction/search only); continuous SMIL animations removed (static aura/glow rings); drag-to-pan added (pointer capture + click suppression) alongside zoom buttons; relation hit-path culling above 700 lines; CSS transitions on relation paths removed.
- **World map fixed** (world-map-interactive.tsx + `_quest/layout_locations.mjs`): 24 locations were stacked at (50,50), 45+ collided on y=92 rows, and ~15 were at posY 133-264 → rendered OUTSIDE the viewBox (invisible). Re-laid ALL 249 locations on a golden-angle (phyllotaxis) spiral ordered by startChapter, radius 44, 0.1 precision — deterministic, in-bounds, ~5% min spacing. Label soup fixed: permanent name/chapter badges only for top-40 by mentionCount; hover/selection always shows a label; path arrows only on active path.
- **Lint**: 8 errors fixed (3 mine: useCallback use-before-declare + ref-read-during-render in graph; 5 legacy no-require-imports in scripts/*.js → one-line eslint-disable headers). Now 0 errors / 21 pre-existing warnings. `next build` passes (16.2.12, all routes). tsc 0.
- API checks: /api/stats 2,414 chapters / 2,153,748 words; /api/characters 788 rows with mentionCount/kind/firstChapter.

Stage Summary:
- Data: 121/121 batches extracted; 1,926 canonical entities; 110,873 mentions; 788 chars + 249 locations in DB; 90,427 appearance rows; 2,413 relations; 117 char images; map coordinates deterministic.
- UI: characters page sorted/filtered by real counts; network graph faction-correct, memoized, pannable; world map fully visible + decluttered.
- Pending: browser visual QA (Browser MCP extension needs user to connect); 62 chars with >=100 mentions have no image in the Discord manifest; possible person/faction kind mislabels from extraction (e.g. هيدريك=faction); commit after QA.
