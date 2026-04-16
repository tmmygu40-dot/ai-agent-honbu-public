const STORAGE_KEY = 'taichou_memo_records';

const dateInput = document.getElementById('record-date');
const categorySelect = document.getElementById('category');
const severitySelect = document.getElementById('severity');
const memoInput = document.getElementById('memo');
const addBtn = document.getElementById('add-btn');
const recordList = document.getElementById('record-list');
const emptyMsg = document.getElementById('empty-msg');
const countLabel = document.getElementById('count-label');

// 今日の日付をデフォルトにセット
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
dateInput.value = toLocalDateStr(new Date());

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

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

function renderRecords() {
  const records = loadRecords();
  recordList.innerHTML = '';

  if (records.length === 0) {
    emptyMsg.style.display = 'block';
    countLabel.textContent = '';
    return;
  }

  emptyMsg.style.display = 'none';
  countLabel.textContent = `${records.length}件`;

  // 新しい順で表示
  [...records].reverse().forEach((rec, revIdx) => {
    const realIdx = records.length - 1 - revIdx;
    const li = document.createElement('li');

    const severityClass = `severity-${rec.severity}`;

    li.innerHTML = `
      <div class="record-info">
        <div class="record-top">
          <span class="record-date">${formatDate(rec.date)}</span>
          <span class="record-category">${escapeHtml(rec.category)}</span>
          <span class="record-severity ${severityClass}">${escapeHtml(rec.severity)}</span>
        </div>
        ${rec.memo ? `<div class="record-memo">${escapeHtml(rec.memo)}</div>` : ''}
      </div>
      <button class="delete-btn" data-idx="${realIdx}" title="削除">×</button>
    `;

    recordList.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

addBtn.addEventListener('click', () => {
  const date = dateInput.value.trim();
  const category = categorySelect.value;
  const severity = severitySelect.value;
  const memo = memoInput.value.trim();

  if (!date) {
    alert('日付を入力してください');
    dateInput.focus();
    return;
  }

  const records = loadRecords();
  records.push({ date, category, severity, memo, id: Date.now() });
  saveRecords(records);

  memoInput.value = '';
  dateInput.value = toLocalDateStr(new Date());
  renderRecords();
});

recordList.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;

  const idx = Number(btn.dataset.idx);
  const records = loadRecords();
  records.splice(idx, 1);
  saveRecords(records);
  renderRecords();
});

// 初期表示
renderRecords();
