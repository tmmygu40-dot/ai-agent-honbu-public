# SNS 運用メモ（X向けチェックリスト）

文体・禁止表現・テンプレの詳細は `SNS_RULES.md`。ここでは **運用での手順だけ** メモする。

---

## X投稿 URL（再発防止）

1. **Xの本文には、日本語パスの実URLを直接貼らない。**  
   タイムライン上でリンクが途中で終わり、**404になることがある**。

2. **パスだけ `encodeURIComponent` で伸びた長いURLも、`x_dashboard` が出すだけでなく手貼りも避ける。**  
   動くことが多いが **見た目が悪くクリックしづらい**。

3. **X に載せるリンクは、`https://nekopoke.jp/s/英数字スラッグ/` の短縮URLに統一する。**  
   キューの `sns_queue.json` で **`url`**（実ページ・確認用）と **`short_url`**（X用）を分ける。

4. **投稿前に、その `short_url` をブラウザで開き、実アプリに着地するまで確認する。**

### 短縮URLの例

- `https://nekopoke.jp/s/16bit-map/`
- `https://nekopoke.jp/s/1on1-record/`

（リダイレクトページは `ai-agent-honbu-public/s/{slug}/index.html`。転送先は必要に応じて **パーセントエンコードを使う**と環境差を減らせることがある — 実装済みのスラッグを参照すること。）

---

## 関連ファイル

- 投稿キュー・`short_url` フィールド: `sns/sns_queue.json`
- 手動投稿用ダッシュボード: `sns/x_dashboard.html`
