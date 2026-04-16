const STORAGE_KEY = 'safety_records';

let records = loadRecords();

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord() {
  const date = document.getElementById('date').value;
  const location = document.getElementById('location').value.trim();
  const cause = document.getElementById('cause').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!date || !location || !cause || !content) {
    alert('すべての項目を入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    date,
    location,
    cause,
    content
  };

  records.unshift(record);
  saveRecords();
  renderAll();
  clearForm();
}

function clearForm() {
  document.getElementById('location').value = '';
  document.getElementById('cause').value = '';
  document.getElementById('content').value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderAll();
}

function renderAll() {
  renderList();
  renderSummary();
}

function renderList() {
  const container = document.getElementById('records-list');
  const countEl = document.getElementById('total-count');
  countEl.textContent = records.length + '件';

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }

  container.innerHTML = records.map(r => `
    <div class="record-card">
      <button class="delete-btn" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      <div class="record-meta">
        <span class="record-date">${formatDate(r.date)}</span>
        <span class="meta-tag">📍 ${escapeHtml(r.location)}</span>
        <span class="meta-tag">⚡ ${escapeHtml(r.cause)}</span>
      </div>
      <div class="record-content">${escapeHtml(r.content)}</div>
    </div>
  `).join('');
}

function renderSummary() {
  renderGroupedSummary('location-summary', 'location');
  renderGroupedSummary('cause-summary', 'cause');
}

function renderGroupedSummary(containerId, key) {
  const container = document.getElementById(containerId);

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }

  const counts = {};
  records.forEach(r => {
    const val = r[key];
    counts[val] = (counts[val] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sorted.map(([label, count]) => `
    <div class="summary-item">
      <span class="label">${escapeHtml(label)}</span>
      <span class="badge">${count}件</span>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// タブ切り替え
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// 記録ボタン
document.getElementById('add-btn').addEventListener('click', addRecord);

// 今日の日付をデフォルトセット
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

// 初期描画
renderAll();
