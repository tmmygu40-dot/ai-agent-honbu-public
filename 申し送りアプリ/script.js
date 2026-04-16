const STORAGE_KEY = 'moshiokuri_records';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function renderRecords() {
  const records = loadRecords();
  const list = document.getElementById('records-list');
  const badge = document.getElementById('count-badge');

  badge.textContent = `${records.length}件`;

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  list.innerHTML = records.map((rec, idx) => `
    <div class="record-card">
      <div class="record-meta">
        <span class="record-date">${formatDate(rec.date)}</span>
        ${rec.shift ? `<span class="record-shift">${escapeHtml(rec.shift)}</span>` : ''}
      </div>
      <div class="record-content">${escapeHtml(rec.content)}</div>
      <div class="record-actions">
        <button class="btn-delete" onclick="deleteRecord(${idx})">削除</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deleteRecord(idx) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords();
  records.splice(idx, 1);
  saveRecords(records);
  renderRecords();
}

document.getElementById('add-btn').addEventListener('click', () => {
  const dateInput = document.getElementById('date-input');
  const shiftInput = document.getElementById('shift-input');
  const contentInput = document.getElementById('content-input');

  const date = dateInput.value;
  const shift = shiftInput.value;
  const content = contentInput.value.trim();

  if (!date) {
    alert('日付を入力してください');
    dateInput.focus();
    return;
  }
  if (!content) {
    alert('伝達事項を入力してください');
    contentInput.focus();
    return;
  }

  const records = loadRecords();
  records.unshift({ date, shift, content, createdAt: Date.now() });
  saveRecords(records);

  contentInput.value = '';
  renderRecords();
});

// 今日の日付をデフォルトにセット
(function initDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('date-input').value = `${y}-${m}-${d}`;
})();

renderRecords();
