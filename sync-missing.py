"""
sync-missing.py — 掲載済みアプリのフォルダ不足を検出・自動補完
使い方: python sync-missing.py
"""
import os, re, shutil, subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DEV = r"C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部\ai-agent-honbu-public"
PUB = r"C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public"

# ── 1. index.html の #all-apps からアプリ名一覧を取得 ──────────────────
with open(os.path.join(PUB, "index.html"), encoding="utf-8") as f:
    html = f.read()

m = re.search(r'id="all-apps"[^>]*>(.*?)</ul>', html, re.DOTALL)
if not m:
    print("ERROR: #all-apps が見つかりません")
    sys.exit(1)

apps = re.findall(r'href="\./([^/"]+)/', m.group(1))
print(f"掲載アプリ数: {len(apps)} 件")

# ── 2. フォルダ存在確認 ────────────────────────────────────────────────
missing = [a for a in apps
           if not os.path.exists(os.path.join(PUB, a, "index.html"))]

if not missing:
    print("✅ 不足フォルダなし。全件公開済みです。")
    sys.exit(0)

print(f"\n不足検出: {len(missing)} 件")

# ── 3. dev repo から補完 ──────────────────────────────────────────────
fixed   = []   # 補完成功
no_src  = []   # dev にもない
no_idx  = []   # コピー成功だが index.html がない

for app in missing:
    src = os.path.join(DEV, app)
    dst = os.path.join(PUB, app)

    if not os.path.exists(src):
        no_src.append(app)
        print(f"  [DEV無し] {app}")
        continue

    # コピー
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)

    # index.html 確認
    if os.path.exists(os.path.join(dst, "index.html")):
        fixed.append(app)
        print(f"  [補完OK ] {app}")
    else:
        no_idx.append(app)
        print(f"  [index.html無し] {app}")

# ── 4. git add / commit / push ────────────────────────────────────────
if fixed:
    os.chdir(PUB)
    subprocess.run(["git", "add", "--"] + fixed, check=True)
    msg = f"fix: 不足アプリ {len(fixed)} 件を自動補完"
    subprocess.run(["git", "commit", "-m", msg], check=True)
    subprocess.run(["git", "push", "origin", "main"], check=True)

# ── 5. サマリ ─────────────────────────────────────────────────────────
errors = no_src + no_idx
print("\n" + "="*40)
print(f"✅ 自動補完: {len(fixed)} 件")
print(f"❌ 補完不可: {len(errors)} 件")
if errors:
    for a in errors:
        reason = "devにも無し" if a in no_src else "index.html無し"
        print(f"   - {a}（{reason}）")
print(f"📊 公開完了: {len(apps) - len(errors)} 件 / 全{len(apps)}件")
if errors:
    sys.exit(1)
