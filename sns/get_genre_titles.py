"""各ジャンルのアプリからHTMLタイトルを取得してJSONに保存"""
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE, 'sns/_reports/tmp_genre_hits2.json'), encoding='utf-8') as f:
    genres = json.load(f)

def get_title(app_dir):
    p = os.path.join(BASE, app_dir, 'index.html')
    if not os.path.exists(p):
        return app_dir
    with open(p, encoding='utf-8', errors='ignore') as f:
        html = f.read(3000)
    m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.I)
    if m: return m.group(1).strip()
    m = re.search(r'<h1[^>]*>([^<]+)</h1>', html, re.I)
    if m: return m.group(1).strip()
    return app_dir

out = {}
for genre, apps in genres.items():
    titles = []
    for app in apps[:20]:
        t = get_title(app)
        titles.append({'dir': app, 'title': t})
    out[genre] = titles
    print(f'[{genre}] {len(titles)}件')
    for x in titles[:6]:
        print(f'  {x["title"]}')

with open(os.path.join(BASE, 'sns/_reports/tmp_genre_titles2.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print('\nDone => sns/_reports/tmp_genre_titles2.json')
