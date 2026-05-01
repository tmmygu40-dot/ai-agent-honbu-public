# OPS LOG (ai-agent-honbu-public)

---

## 2026-04-30 本日追加バッジが朝に消える問題（JST対応）

### 症状
- 「本日◯件追加」バッジが毎日 0:00〜9:00（JST）に表示されない

### 原因
- 日付判定に `toISOString()`（UTC）を使用していたため、日本時間とズレが発生

### 対応
- JSTローカル日付で比較するように修正
  ```js
  var n = new Date();
  var today = n.getFullYear() + '-' +
              String(n.getMonth() + 1).padStart(2, '0') + '-' +
              String(n.getDate()).padStart(2, '0');
  ```

---

## 2026-05-01 SNS自動投稿準備フェーズ（土台実装）

### 実施内容
- SNS導線の準備として、`sns/` 配下に以下を追加
  - 投稿キュー生成
  - 優先度スコア
  - 鮮度調整
  - 画像カード生成
  - プレビューHTML
- `sns/sns_queue.json` に投稿候補を保存し、`status=draft` で管理
- SNS投稿候補はテーマ優先度に加えて鮮度調整も実施
- 過去月の制度・値上げネタはクリック率が落ちやすいため、現在月より前の月入りタイトルを減点
- Instagram / TikTok 向けに `sns/cards/` へ 1200x1200 PNG 画像カードを生成
- `sns/preview.html` で投稿文とカード画像を目視確認してから実投稿フェーズへ進む運用

### 未実施（意図的に未接続）
- 実投稿
- 外部通信
- API接続
- ログイン処理
