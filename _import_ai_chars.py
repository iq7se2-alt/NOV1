#!/usr/bin/env python3
"""python _import_ai_chars.py - imports ai_characters.json into DB"""
import sqlite3, json, re, os

DB = "db/custom.db"
JSON_FILE = "ai_characters.json"

if not os.path.exists(JSON_FILE):
    print(f"ERROR: {JSON_FILE} not found!")
    exit(1)

with open(JSON_FILE, 'r', encoding='utf-8') as f:
    chars = json.load(f)

print(f"📚 {len(chars)} AI characters\n📖 Loading chapters...")
db = sqlite3.connect(DB)
chapters = db.execute("SELECT id, number, content FROM Chapter ORDER BY number").fetchall()
print(f"   {len(chapters)} chapters")

db.execute("DELETE FROM ChapterCharacter")
db.execute("DELETE FROM CharacterRelation")
db.execute("DELETE FROM Character")
db.commit()

MAIN = {'روبين','قيصر','ثيو','بيون','زارا','لينا','مالك','ريتشارد','هيدريك','أليكساندر','آرو','جابا','ساكار'}
TOTAL = len(chars)

for i in range(TOTAL):
    c = chars[i]
    name = c['name']
    aliases = c.get('aliases', [])
    is_main = name in MAIN or any(a in MAIN for a in aliases)
    
    try:
        db.execute("INSERT INTO Character(name,isMain,createdAt,updatedAt) VALUES(?,?,unixepoch()*1000,unixepoch()*1000)", (name, 1 if is_main else 0))
    except: continue
    
    char_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    terms = [name] + [a for a in aliases if a != name]
    seen = set()
    for term in terms:
        for ch_id, ch_num, content in chapters:
            if content and term in content and ch_id not in seen:
                seen.add(ch_id)
                try: db.execute("INSERT OR IGNORE INTO ChapterCharacter(chapterId,characterId,paragraphIndex,wordIndex) VALUES(?,?,0,0)", (ch_id, char_id))
                except: pass
    
    if (i+1) % 25 == 0 or i == TOTAL-1:
        t = db.execute("SELECT COUNT(*) FROM Character").fetchone()[0]
        a = db.execute("SELECT COUNT(*) FROM ChapterCharacter").fetchone()[0]
        print(f"   [{i+1}/{TOTAL} {(i+1)/TOTAL*100:.0f}%] {t} chars | {a} apps | {name} ({len(seen)} ch)")
    
    if (i+1) % 25 == 0: db.commit()

db.commit()

# MERGE: auto-detect same person
print("\n🔀 Merging duplicates...")
char_names = {r[0]: r[1] for r in db.execute("SELECT id, name FROM Character").fetchall()}
merged = 0
for c in chars:
    for alias in c.get('aliases', []):
        if alias in char_names and char_names[alias] != char_names.get(c['name']):
            fr = db.execute("SELECT id,imageUrl,isMain FROM Character WHERE name=?",(alias,)).fetchone()
            tr = db.execute("SELECT id,imageUrl,isMain FROM Character WHERE name=?",(c['name'],)).fetchone()
            if fr and tr:
                db.execute("UPDATE OR IGNORE ChapterCharacter SET characterId=? WHERE characterId=?",(tr[0],fr[0]))
                if fr[1] and not tr[1]: db.execute("UPDATE Character SET imageUrl=? WHERE id=?",(fr[1],tr[0]))
                if fr[2] and not tr[2]: db.execute("UPDATE Character SET isMain=1 WHERE id=?",(tr[0],))
                db.execute("DELETE FROM Character WHERE id=?",(fr[0],))
                merged += 1; del char_names[alias]
db.commit(); print(f"   {merged} merged")

# IMAGES
print("🖼️  Matching images...")
img_dir = "public/images/characters"
if os.path.exists(img_dir):
    def norm(s): return re.sub(r'[إأآا]','ا',s).replace('ة','ه').replace('ى','ي').strip()
    cm = {norm(n): (cid,n) for cid,n in db.execute("SELECT id,name FROM Character WHERE imageUrl IS NULL OR imageUrl=''").fetchall()}
    m = 0
    for f in os.listdir(img_dir):
        if not f.endswith(('.jpg','.jpeg','.png','.webp')): continue
        base = f.rsplit('.',1)[0]; base = re.sub(r'_\d+$','',base)
        ap = [p for p in base.split('_') if re.search(r'[\u0600-\u06FF]',p)]
        if not ap: continue
        an = ' '.join(ap).replace('بواسطة','').replace('المصدر','').strip(); ni = norm(an)
        if ni in cm:
            cid,_ = cm[ni]
            db.execute("UPDATE Character SET imageUrl=? WHERE id=? AND (imageUrl IS NULL OR imageUrl='')",(f'/images/characters/{f}',cid))
            m+=1; del cm[ni]; continue
        for nch,(cid,_) in list(cm.items()):
            if len(nch)>=3 and len(ni)>=3 and (nch in ni or ni in nch):
                db.execute("UPDATE Character SET imageUrl=? WHERE id=? AND (imageUrl IS NULL OR imageUrl='')",(f'/images/characters/{f}',cid))
                m+=1; del cm[nch]; break
    print(f"   {m} matched")
db.commit()

# STATS
t = db.execute("SELECT COUNT(*) FROM Character").fetchone()[0]
im = db.execute("SELECT COUNT(*) FROM Character WHERE imageUrl IS NOT NULL AND imageUrl!=''").fetchone()[0]
a = db.execute("SELECT COUNT(*) FROM ChapterCharacter").fetchone()[0]
mc = db.execute("SELECT COUNT(*) FROM Character WHERE isMain=1").fetchone()[0]
print(f"\n{'='*60}\n✅ {t} chars | 🖼️ {im} images | ⭐ {mc} main | 📖 {a:,} apps\n{'='*60}")

print("\n📊 Top 30:")
for r in db.execute("SELECT c.name, COUNT(DISTINCT cc.chapterId), c.imageUrl IS NOT NULL FROM Character c LEFT JOIN ChapterCharacter cc ON c.id=cc.characterId GROUP BY c.id ORDER BY COUNT(DISTINCT cc.chapterId) DESC LIMIT 30").fetchall():
    print(f"  {'📷' if r[2] else '👤'} {r[0]}: {r[1]} ch")

ru = db.execute("SELECT MIN(ch.number),MAX(ch.number),COUNT(DISTINCT ch.number) FROM ChapterCharacter cc JOIN Chapter ch ON cc.chapterId=ch.id JOIN Character c ON cc.characterId=c.id WHERE c.name='روبين'").fetchone()
if ru: print(f"\n❖ روبين: {ru[2]} chapters ({ru[0]}→{ru[1]})")

db.close()
print("\n✨ Done!")
