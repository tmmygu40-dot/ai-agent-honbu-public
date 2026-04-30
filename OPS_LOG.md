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
