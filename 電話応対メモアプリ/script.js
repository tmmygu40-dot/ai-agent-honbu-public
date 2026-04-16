const STORAGE_KEY = 'tel-memo-list';

let memos = [];

function loadMemos() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      memos = JSON.parse(saved);
    } catch {
      memos = [];
    }
  }
}

function saveMemos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function formatDateTime(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${m}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMemos() {
  const list = document.getElementById('memo-list');
  const countEl = document.getElementById('memo-count');

  countEl.textContent = `${memos.length}件`;

  if (memos.length === 0) {
    list.innerHTML = '<p class="empty-message">メモがありません</p>';
    return;
  }

  list.innerHTML = memos.map((memo, index) => `
    <div class="memo-card${memo.done ? ' done' : ''}">
      <div class="memo-card-header">
        <span class="caller${memo.done ? ' done-text' : ''}">${escapeHtml(memo.caller)}</span>
        <span class="call-time">${escapeHtml(memo.callTime)}</span>
      </div>
      <div class="memo-matter">${escapeHtml(memo.matter).replace(/\n/g, '<br>')}</div>
      <div class="memo-meta">記録：${formatDateTime(memo.createdAt)}</div>
      <div class="memo-actions">
        <button class="btn-done${memo.done ? ' undone' : ''}" onclick="toggleDone(${index})">
          ${memo.done ? '未対応に戻す' : '対応済み'}
        </button>
        <button class="btn-delete" onclick="deleteMemo(${index})">削除</button>
      </div>
    </div>
  `).join('');
}

function addMemo() {
  const callerEl = document.getElementById('caller');
  const callTimeEl = document.getElementById('call-time');
  const matterEl = document.getElementById('matter');

  const caller = callerEl.value.trim();
  const callTime = callTimeEl.value.trim();
  const matter = matterEl.value.trim();

  if (!caller && !matter) {
    alert('相手の名前または用件を入力してください。');
    callerEl.focus();
    return;
  }

  const memo = {
    id: Date.now(),
    caller: caller || '（名前なし）',
    callTime: callTime || '（時間不明）',
    matter: matter || '（用件なし）',
    done: false,
    createdAt: new Date().toISOString()
  };

  memos.unshift(memo);
  saveMemos();
  renderMemos();

  callerEl.value = '';
  callTimeEl.value = '';
  matterEl.value = '';
  callerEl.focus();
}

function toggleDone(index) {
  memos[index].done = !memos[index].done;
  saveMemos();
  renderMemos();
}

function deleteMemo(index) {
  if (!confirm('このメモを削除しますか？')) return;
  memos.splice(index, 1);
  saveMemos();
  renderMemos();
}

// 追加ボタン
document.getElementById('add-btn').addEventListener('click', addMemo);

// Enterキーで追加（テキストエリア以外）
document.getElementById('caller').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('call-time').focus();
  }
});

document.getElementById('call-time').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('matter').focus();
  }
});

// 初期表示
loadMemos();
renderMemos();
