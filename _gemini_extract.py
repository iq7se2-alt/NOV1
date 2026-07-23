#!/usr/bin/env python3
"""Gemini AI - استخراج شخصيات - python _gemini_extract.py"""
import sqlite3, json, re, time, os, urllib.request, urllib.error

DB = "db/custom.db"
MODEL = "gemini-2.5-flash"
BATCH = 30
CHARS = 2500

keys = []
if os.path.exists("_gemini_keys.txt"):
    with open("_gemini_keys.txt") as f:
        keys = [l.strip() for l in f if l.strip() and not l.startswith("#")]
if not keys and os.environ.get("GEMINI_KEY"):
    keys = [os.environ["GEMINI_KEY"]]
if not keys:
    print("ERROR: No keys! Create _gemini_keys.txt (one key per line) or set GEMINI_KEY env var")
    exit(1)
print(f"🔑 {len(keys)} keys loaded")

def ask(text, ki):
    k = keys[ki % len(keys)]
    for url in [
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={k}",
        f"https://generativelanguage.googleapis.com/v1/models/{MODEL}:generateContent?key={k}",
    ]:
        try:
            d = json.dumps({"contents":[{"parts":[{"text":text}]}],"generationConfig":{"temperature":0.1,"maxOutputTokens":3000}}).encode()
            req = urllib.request.Request(url, data=d, headers={"Content-Type":"application/json"})
            r = json.loads(urllib.request.urlopen(req, timeout=90).read())
            c = r.get("candidates",[])
            if c: return "".join(p.get("text","") for p in c[0].get("content",{}).get("parts",[]))
        except Exception as e: continue
    return None

db = sqlite3.connect(DB)
chapters = db.execute("SELECT number, title, content FROM Chapter ORDER BY number").fetchall()
T = len(chapters); tb = (T + BATCH - 1) // BATCH
print(f"📚 {T} chapters | {tb} batches | {MODEL}\n")

all_names = {}; ki = 0
for bi in range(tb):
    batch = chapters[bi*BATCH:(bi+1)*BATCH]
    txt = "".join(f"\n=== Ch{n}: {t} ===\n{c[:CHARS]}\n" for n,t,c in batch)
    print(f"[{bi+1}/{tb}] Ch{batch[0][0]}-{batch[-1][0]} ({len(txt):,}c)", end=" ", flush=True)
    
    prompt = f"""Extract ONLY real person names (proper nouns) from these Arabic novel excerpts.
RULES: Only output person names (روبين, قيصر, آرو, بيلي, زارا etc). Include compound names. No verbs/adjectives/pronouns/places/concepts. One per line.
Text:
{txt[:140000]}
Names:"""

    t0 = time.time(); resp = None
    for _ in range(min(3, len(keys))):
        resp = ask(prompt, ki)
        if resp: break
        ki += 1; time.sleep(0.5)
    if not resp: print("FAILED"); continue
    
    added = 0
    for line in resp.split('\n'):
        name = re.sub(r'^[\d\.\-\s•★☆✦→•·▪\*\#✓✅❌\-\s]+','',line.strip())
        name = re.sub(r'[،,]$','',name).strip()
        if 2<=len(name)<=80 and re.search(r'[\u0600-\u06FF]',name):
            if name not in all_names: all_names[name]={'cnt':0,'ch':set()}
            all_names[name]['cnt']+=1
            for n,t,c in batch:
                if name in c: all_names[name]['ch'].add(n)
            added+=1
    print(f"+{added} ({time.time()-t0:.1f}s) total:{len(all_names)}")
    json.dump({n:{'cnt':d['cnt'],'ch':len(d['ch'])} for n,d in all_names.items()},
              open('_gemini_progress.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
    ki=(ki+1)%len(keys); time.sleep(1.5)

print(f"\n💾 Saving {len(all_names)} to DB...")
db.execute("DELETE FROM ChapterCharacter"); db.execute("DELETE FROM CharacterRelation"); db.execute("DELETE FROM Character")
MAIN={'روبين','قيصر','ثيو','بيون','زارا','لينا','مالك','ريتشارد','هيدريك','أليكساندر','آرو','جابا','ساكار'}
for name,data in sorted(all_names.items(),key=lambda x:-x[1]['cnt']):
    try:
        db.execute("INSERT INTO Character(name,isMain,createdAt,updatedAt) VALUES(?,?,unixepoch()*1000,unixepoch()*1000)",(name,1 if name in MAIN else 0))
        cid=db.execute("SELECT last_insert_rowid()").fetchone()[0]
        for n,t,c in chapters:
            if name in c:
                ch=db.execute("SELECT id FROM Chapter WHERE number=?",(n,)).fetchone()
                if ch:
                    try: db.execute("INSERT OR IGNORE INTO ChapterCharacter(chapterId,characterId,paragraphIndex,wordIndex) VALUES(?,?,0,0)",(ch[0],cid))
                    except: pass
    except: pass
db.commit()
tc=db.execute("SELECT COUNT(*) FROM Character").fetchone()[0]; ta=db.execute("SELECT COUNT(*) FROM ChapterCharacter").fetchone()[0]
print(f"✅ {tc} characters | {ta} appearances")
for n,d in sorted(all_names.items(),key=lambda x:-len(x[1]['ch']))[:20]:
    print(f"   {n}: {len(d['ch'])} ch")
json.dump(sorted(all_names.keys()),open('_gemini_characters.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
db.close()
