# SNS 投稿運用ルール（X）

最終更新: 2026-05-07

## 1) Xでは日本語URLを直接貼らない
- 日本語パスURLは、X上で途中切れして404になることがある。
- パーセントエンコードURLは長く、見た目とクリック率の面で不利。
- X本文のURLは必ず `https://nekopoke.jp/s/英数字スラッグ/` の `short_url` を使う。

## 2) 投稿前に short_url の遷移確認
- 投稿前に `short_url` をブラウザで開く。
- 実アプリページに正しく遷移することを確認してから投稿する。

## 3) 投稿文の基本型
```text
【今日のチェック】

悩み・あるある・少しユーモアのある一言。

アプリ名

何を整理/入力すると、何に使えるかを短く書く。
※必要なジャンルだけ参考・確認用です
↓↓↓
short_url
```

## 4) 投稿の優先順位
- ネコポケ全体投稿より、個別アプリ投稿を優先する。
- 目安は **個別アプリ8割 / 運営ネタ2割**。
- 運営ネタは、個別アプリ候補が不足する場合のみ使う。

## 5) URL直前のレイアウト
- `↓↓↓` の前に空行を入れない。
- 説明文（または `※参考・確認用です`）の直下に `↓↓↓`。
- その次の行に `short_url` を置く。

## 6) SNS作業の禁止事項
- `fix-queue.json` はSNS作業で触らない。

## 関連ファイル
- キュー: `sns/sns_queue.json`
- ダッシュボード: `sns/x_dashboard.html`
- 補助メモ: `sns/SNS_OPERATION_MEMO.md`

## 2026-05-07 追加メモ（半自動運用）

1. X投稿は完全自動投稿ではなく、兄貴が手動でポストする半自動運用にする。  
2. ダッシュボードで「投稿済みにする」を押すと、localStorage上で次候補に切り替わる。  
3. 投稿候補が減ったら `refill` コマンドで補充する。  
4. 補充確認（dry-run）:  
   `python sns/sns_x_post_manager.py --refill-x-posts --target 30 --dry-run`  
5. 実補充:  
   `python sns/sns_x_post_manager.py --refill-x-posts --target 30`  
6. short_url補完確認（dry-run）:  
   `python sns/sns_x_post_manager.py --ensure-short-urls --dry-run`  
7. 実補完:  
   `python sns/sns_x_post_manager.py --ensure-short-urls`  
8. Xでは日本語URLを直接貼らず、必ず short_url を使う。  
9. 投稿前に short_url の遷移確認をする。  
10. 投稿文の基本型:

```text
【今日のチェック】

あるある・少しユーモア

アプリ名

用途説明
↓↓↓
short_url
```
