# ERROR LOG

[2026-04-21 10:42:43] ERROR: Missing in dev: デジタルおみくじ,お詫び文ジェネレーター,ニックネームメーカー,難読地名クイズ,プレゼント候補診断
[2026-04-22 21:00:50] ERROR: git push failed
[2026-04-23 12:18:22] ERROR: Missing in dev: FC採算チェッカー,必要売上シミュレーター

---

## 2026-04-23 公開件数が 473 で止まる

### 症状
- 開発側の 完了一覧.md は 580 まで進んでいるのに、公開側の実アプリ数が 473 から増えなかった
- claude_log.txt では [PUBLISH] no_unpublished_apps が出ていた
- 公開サイト件数も 473 で停止していた

### 原因
- ai-agent-honbu-public/publish-batch.ps1 の 3-point check で不一致が発生していた
- 実際の件数は以下だった
  - Folders = 473
  - PUBLISHED.md = 473
  - index.html = 479
- 原因は index.html の件数カウントがずれていたこと
- new-apps の6件が件数に混ざり、all-apps だけを数えるべき check で余計にカウントされていた
- その結果、STOP: mismatch -- will NOT commit で安全停止していた

### 対応
- ai-agent-honbu-public/publish-batch.ps1 の 3-point check を修正
- index.html 全体ではなく、all-apps ブロック内の `<li><a href="./...">` だけを数える形に変更
- 修正後は
  - Folders = 474
  - index.html = 474
  - PUBLISHED.md = 474
  で一致
- mismatch 解消後、publish 再実行で 474 → 476 まで公開反映
- Post-publish check: OK 476 / WARN 0 / NG 0

### 再発防止
- index.html の件数確認は、ページ全体ではなく all-apps ブロックだけを見る
- new-apps 表示と 3-point check の集計対象を混ぜない
- 今後、公開件数が止まったら最初に
  1. 完了一覧.md の末尾
  2. public 実フォルダ数
  3. index.html 件数
  4. PUBLISHED.md 件数
  を比較する
[2026-04-24_114040] SCAN apps=体重記録アプリ_v2 total=0 exit=0
[2026-04-24_122946] SCAN apps=仕入れインフレ影響シミュレーター total=0 exit=0
[2026-04-24_162852] SCAN apps=値上げ影響シミュレーター total=0 exit=0
[2026-04-24_165504] SCAN apps=熱中症対策診断アプリ total=0 exit=0
[2026-04-24_181115] SCAN apps=販促POPコピージェネレーター total=0 exit=0
[2026-04-24_183436] SCAN apps=売掛金督促メールジェネレーター total=0 exit=0
[2026-04-24_190008] SCAN apps=現場作業報告書コメントジェネレーター total=0 exit=0
[2026-04-24_192347] SCAN apps=仕入れ採算ライン診断アプリ total=0 exit=0
[2026-04-24_202503] SCAN apps=売上目標逆算シミュレーター total=0 exit=0
[2026-04-24_214434] SCAN apps=食品値上がり家計コストシミュレーター total=0 exit=0
[2026-04-24_224745] SCAN apps=資金繰りシミュレーター total=0 exit=0
[2026-04-24_225737] SCAN apps=業務工程表ジェネレーター total=0 exit=0
[2026-04-25_052413] SCAN apps=値上げ後売価・利益率シミュレーター total=0 exit=0
[2026-04-25_054339] SCAN apps=発注書ジェネレーター total=0 exit=0
[2026-04-25_095113] SCAN apps=ふるさと納税シミュレーター total=0 exit=0
[2026-04-25_100631] SCAN apps=在庫枯渇日数シミュレーター total=0 exit=0
[2026-04-25 10:55:02] ERROR: Missing in dev: 老後資産寿命シミュレーター,円安・関税コストシミュレーター
[2026-04-25_112555] SCAN apps=老後資産寿命シミュレーター,円安・関税コストシミュレーター total=0 exit=0
[2026-04-25_122430] SCAN apps=仕入れ値上げ通知返答メールジェネレーター total=1 exit=0
[2026-04-25_140300] SCAN apps=店頭POP文言ジェネレーター total=0 exit=0
[2026-04-25_184349] SCAN apps=週次発注量シミュレーター total=0 exit=0
