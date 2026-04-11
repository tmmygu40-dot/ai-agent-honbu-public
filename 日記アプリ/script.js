const STORAGE_KEY = 'diary_entries';

const dateInput = document.getElementById('diary-date');
const titleInput = document.getElementById('diary-title');
const contentInput = document.getElementById('diary-content');
const saveBtn = document.getElementById('save-btn');
const diaryList = document.getElementById('diary-list');
const emptyMessage = document.getElementById('empty-message');

// 今日の日付をデフォルトにセット
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

dateInput.value = getTodayStr();

// localStorage の読み書き
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// 一覧を描画
function renderList() {
  const entries = loadEntries();
  diaryList.innerHTML = '';

  if (entries.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  // 新しい順に並べる
  const sorted = [...entries].sort((a, b) => b.id - a.id);

  sorted.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'diary-card';

    const dateLabel = formatDate(entry.date);

    card.innerHTML = `
      <div class="card-date">${dateLabel}</div>
      ${entry.title ? `<div class="card-title">${escapeHtml(entry.title)}</div>` : ''}
      <div class="card-content">${escapeHtml(entry.content)}</div>
      <button class="delete-btn" data-id="${entry.id}" title="削除">×</button>
    `;

    diaryList.appendChild(card);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const w = weekdays[date.getDay()];
  return `${y}年${Number(m)}月${Number(d)}日（${w}）`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 保存ボタン
saveBtn.addEventListener('click', () => {
  const date = dateInput.value.trim();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!date) {
    alert('日付を入力してください。');
    dateInput.focus();
    return;
  }
  if (!content) {
    alert('内容を入力してください。');
    contentInput.focus();
    return;
  }

  const entries = loadEntries();
  const newEntry = {
    id: Date.now(),
    date,
    title,
    content
  };

  entries.push(newEntry);
  saveEntries(entries);

  // 入力欄をリセット
  titleInput.value = '';
  contentInput.value = '';
  dateInput.value = getTodayStr();

  renderList();
});

// 削除ボタン（イベント委任）
diaryList.addEventListener('click', (e) => {
  if (!e.target.classList.contains('delete-btn')) return;

  const id = Number(e.target.dataset.id);
  if (!confirm('この日記を削除しますか？')) return;

  const entries = loadEntries().filter(entry => entry.id !== id);
  saveEntries(entries);
  renderList();
});

// 初期描画
renderList();
