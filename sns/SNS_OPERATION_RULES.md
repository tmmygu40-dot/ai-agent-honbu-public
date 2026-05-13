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

## 7) SNSネタ補充時の重複防止ルール（2026-05-13 追加）

### 7-1) チェック対象 status
- 重複チェックは **全 status** を対象にする。
  - `posted` / `draft` / `scheduled` / `archived_not_for_now` / `archived_old_*` を含む。
- `archived_old_*` も「過去に使った／候補にしたネタ」として扱い、**基本的に再利用しない**。

### 7-2) 絶対 NG（追加禁止）
既存 `sns_queue.json` の中に同じ値があるものは、status を問わず追加しない。
- `app_path` が既存と同じ
- `url` が既存と同じ
- `short_url` が既存と同じ

### 7-3) 原則 NG
- `app_name` が既存と同じ → 原則追加禁止。**兄貴が明示した時だけ例外**。
- `x_text` が既存と似すぎているもの → 避ける。
- 同じアプリを別文面で再投稿するのも、**兄貴が明示した時だけ**許可。

### 7-4) 補充手順
1. `sns/sns_queue.json` を全件読み込み、`app_name` / `app_path` / `url` / `short_url` / `x_text` を集合化する。
2. public repo 直下から `index.html` を持つアプリディレクトリ一覧を取得する。
3. 上記2から、**sns_queue 未使用の `app_path` だけ**を候補にする。
4. 候補に対して投稿文を作成する。
5. **追加直前にもう一度** 5項目（`app_name` / `app_path` / `url` / `short_url` / `x_text`）で重複チェックを行う。
6. **重複が1件でもあれば追加しない**（補充を中断して兄貴に報告）。

### 7-5) 報告フォーマット
SNS補充作業の最後に、必ず以下を報告する。
- 追加数
- 重複除外数
- 未使用アプリ候補数
- 追加した `app_name` / `url` / `status`
- JSONチェック結果（`json.load` 成功 + 件数）
- `git status -sb`

## 8) SNSダッシュボードの起動方法（2026-05-14 追加）

- SNSダッシュボード本体は `sns/x_dashboard.html`。
- 表示元データは `sns/sns_queue.json`。
- `x_dashboard.html` は内部で `fetch("./sns_queue.json")` を使うため、`file://` のダブルクリック表示では正常に読めない場合がある（CORS / file scheme 制限）。
- **必ずローカルHTTPサーバー経由で開く**。

### 起動手順

- 起動場所:
  ```
  C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public\sns
  ```
- 起動コマンド:
  ```
  python -m http.server 8765
  ```
- 開くURL:
  ```
  http://localhost:8765/x_dashboard.html
  ```

### 表示・更新

- 表示されない／古い内容が出る時は **Ctrl + F5** で強制更新する。
- `sns_queue.json` を変更した後は、ブラウザで **Ctrl + F5** すると反映確認しやすい。

### 停止

- サーバー停止は、起動したプロセス／ターミナルを止める。
- バックグラウンド起動の場合はプロセス停止が必要。

### 注意

- 起動作業ではファイル変更・git 操作は **不要**。
- 起動中はポート 8765 が使われる。別アプリと衝突する時はポート番号を変える。

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
