// =============================================
// シンプルメモアプリ - app.js
// localStorage を使ってメモを保存・表示・削除する
// =============================================

// localStorage に使うキー名（保存場所の名前）
const STORAGE_KEY = 'simple-memo-list';

// ページが開いたらメモ一覧を表示する
document.addEventListener('DOMContentLoaded', function () {
  renderMemos();

  // Ctrl + Enter でも追加できるようにする
  document.getElementById('memoInput').addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'Enter') {
      addMemo();
    }
  });
});

// ----------------------------------------
// メモを追加する
// ----------------------------------------
function addMemo() {
  const input = document.getElementById('memoInput');
  const text = input.value.trim(); // 前後の空白を取り除く

  // 何も書いていない場合は何もしない
  if (text === '') return;

  // 今のメモ一覧を取得する
  const memos = getMemos();

  // 新しいメモを作る
  const newMemo = {
    id: Date.now(),        // 一意なIDとして現在時刻を使う
    text: text,
    date: getNowString()   // 保存した日時
  };

  // 先頭に追加する（新しいものを上に表示するため）
  memos.unshift(newMemo);

  // 保存する
  saveMemos(memos);

  // 入力欄を空にする
  input.value = '';
  input.focus();

  // 画面を更新する
  renderMemos();
}

// ----------------------------------------
// メモを削除する
// ----------------------------------------
function deleteMemo(id) {
  // 削除前に確認する
  if (!confirm('このメモを削除しますか？')) return;

  // 指定したID以外のメモだけ残す
  const memos = getMemos().filter(function (memo) {
    return memo.id !== id;
  });

  // 保存する
  saveMemos(memos);

  // 画面を更新する
  renderMemos();
}

// ----------------------------------------
// メモ一覧を画面に表示する
// ----------------------------------------
function renderMemos() {
  const memos = getMemos();
  const list = document.getElementById('memoList');

  // 一覧エリアをいったん空にする
  list.innerHTML = '';

  // メモが1件もない場合はメッセージを表示する
  if (memos.length === 0) {
    list.innerHTML = '<p class="empty-message">メモがまだありません。<br>上の入力欄に書いて「追加する」を押してください。</p>';
    return;
  }

  // メモを1件ずつカードとして表示する
  memos.forEach(function (memo) {
    const card = document.createElement('div');
    card.className = 'memo-card';

    card.innerHTML = `
      <div class="memo-body">
        <div class="memo-text">${escapeHtml(memo.text)}</div>
        <div class="memo-date">${memo.date}</div>
      </div>
      <button class="delete-btn" title="削除">✕</button>
    `;

    // 削除ボタンにクリックイベントをつける
    card.querySelector('.delete-btn').addEventListener('click', function () {
      deleteMemo(memo.id);
    });

    list.appendChild(card);
  });
}

// ----------------------------------------
// localStorage からメモ一覧を取得する
// ----------------------------------------
function getMemos() {
  const data = localStorage.getItem(STORAGE_KEY);
  // データがない場合は空の配列を返す
  return data ? JSON.parse(data) : [];
}

// ----------------------------------------
// localStorage にメモ一覧を保存する
// ----------------------------------------
function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

// ----------------------------------------
// 今の日時を「2026/04/09 09:00」の形で返す
// ----------------------------------------
function getNowString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

// ----------------------------------------
// XSS対策：HTMLに直接入れる文字を安全にする
// ----------------------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
