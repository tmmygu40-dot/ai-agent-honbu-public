const STORAGE_KEY = 'failure_records';

let records = [];
let searchQuery = '';

// ---- 初期化 ----
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { records = JSON.parse(saved); } catch(e) { records = []; }
  }

  // 今日の日付をデフォルトにセット
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('failure-date').value = today;

  document.getElementById('add-btn').addEventListener('click', addRecord);
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderList();
  });

  render();
}

// ---- 保存 ----
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---- 追加 ----
function addRecord() {
  const device = document.getElementById('device-name').value.trim();
  const date = document.getElementById('failure-date').value;
  const content = document.getElementById('repair-content').value.trim();

  if (!device) { alert('設備・機器名を入力してください。'); return; }
  if (!date) { alert('故障日を入力してください。'); return; }
  if (!content) { alert('修理内容・状況を入力してください。'); return; }

  records.unshift({
    id: Date.now(),
    device,
    date,
    content
  });

  save();
  render();

  // 入力欄クリア
  document.getElementById('device-name').value = '';
  document.getElementById('repair-content').value = '';
  // 日付はそのまま
}

// ---- 削除 ----
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  save();
  render();
}

// ---- 全体描画 ----
function render() {
  renderRanking();
  renderList();
}

// ---- ランキング描画 ----
function renderRanking() {
  const container = document.getElementById('ranking-list');

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // 設備別カウント
  const countMap = {};
  records.forEach(r => {
    countMap[r.device] = (countMap[r.device] || 0) + 1;
  });

  const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  container.innerHTML = sorted.map(([name, count], i) => `
    <div class="ranking-item">
      <span class="rank-num">${i + 1}位</span>
      <span class="rank-name">${escapeHtml(name)}</span>
      <span class="rank-count">${count}件</span>
    </div>
  `).join('');
}

// ---- 一覧描画 ----
function renderList() {
  const container = document.getElementById('record-list');
  const countEl = document.getElementById('record-count');

  const filtered = searchQuery
    ? records.filter(r => r.device.includes(searchQuery))
    : records;

  countEl.textContent = filtered.length + '件';

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="record-card">
      <div class="record-header">
        <div>
          <div class="record-device">${escapeHtml(r.device)}</div>
          <div class="record-date">${formatDate(r.date)}</div>
        </div>
        <button class="delete-btn" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      </div>
      <div class="record-content">${escapeHtml(r.content)}</div>
    </div>
  `).join('');
}

// ---- ユーティリティ ----
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- 起動 ----
document.addEventListener('DOMContentLoaded', init);
