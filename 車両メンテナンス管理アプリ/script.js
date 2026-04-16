const STORAGE_KEY = 'vehicleMaintenanceRecords';

let records = [];

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord(record) {
  records.push(record);
  records.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveRecords();
  render();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

function getBadgeClass(type) {
  if (type === '定期点検') return 'badge-点検';
  if (type === 'オイル交換') return 'badge-オイル';
  if (type === 'タイヤ交換') return 'badge-タイヤ';
  if (type === '車検') return 'badge-車検';
  return 'badge-その他';
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function daysDiff(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = targetDate - today;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function renderNextMaintenance() {
  const grid = document.getElementById('nextGrid');

  // 対象種別ごとに最新記録を取得
  const types = [
    { label: '定期点検', key: '定期点検', months: 6 },
    { label: 'オイル交換', key: 'オイル交換', months: 3 },
    { label: 'タイヤ交換', key: 'タイヤ交換', months: 12 },
    { label: '車検', key: '車検', months: 24 },
  ];

  const cards = [];
  types.forEach(t => {
    const latest = records.find(r => r.type === t.key);
    if (!latest) return;
    const nextDate = addMonths(latest.date, t.months);
    const diff = daysDiff(nextDate);
    cards.push({ label: t.label, nextDate, diff });
  });

  if (cards.length === 0) {
    grid.innerHTML = '<p class="no-data">記録がありません</p>';
    return;
  }

  grid.innerHTML = cards.map(c => {
    let cls = '';
    let daysText = '';
    if (c.diff < 0) {
      cls = 'danger';
      daysText = `⚠ ${Math.abs(c.diff)}日超過`;
    } else if (c.diff <= 30) {
      cls = 'warning';
      daysText = `⚡ あと${c.diff}日`;
    } else {
      daysText = `あと${c.diff}日`;
    }
    return `
      <div class="next-card ${cls}">
        <div class="type">${c.label}</div>
        <div class="date">${formatDate(c.nextDate)}</div>
        <div class="days">${daysText}</div>
      </div>
    `;
  }).join('');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const countEl = document.getElementById('recordCount');
  countEl.textContent = `${records.length}件`;

  if (records.length === 0) {
    list.innerHTML = '<p class="no-data">記録がありません</p>';
    return;
  }

  list.innerHTML = records.map(r => `
    <div class="record-item">
      <button class="btn-delete" onclick="deleteRecord('${r.id}')" title="削除">✕</button>
      <div class="record-top">
        <span class="badge ${getBadgeClass(r.type)}">${r.type}</span>
        <span class="record-date">${r.date.replace(/-/g, '/')}</span>
        <span class="record-mileage">${Number(r.mileage).toLocaleString()} km</span>
        ${r.vehicle ? `<span class="record-vehicle">${escapeHtml(r.vehicle)}</span>` : ''}
      </div>
      ${r.details ? `<div class="record-details">${escapeHtml(r.details)}</div>` : ''}
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  renderNextMaintenance();
  renderHistory();
}

document.getElementById('recordForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const date = document.getElementById('recordDate').value;
  const mileage = document.getElementById('mileage').value;
  const type = document.getElementById('maintenanceType').value;
  const vehicle = document.getElementById('vehicleName').value.trim();
  const details = document.getElementById('details').value.trim();

  if (!date || !mileage || !type) return;

  addRecord({
    id: Date.now().toString(),
    date,
    mileage: Number(mileage),
    type,
    vehicle,
    details,
  });

  // フォームリセット（車両名は残す）
  document.getElementById('recordDate').value = '';
  document.getElementById('mileage').value = '';
  document.getElementById('maintenanceType').value = '';
  document.getElementById('details').value = '';
});

// 今日の日付をデフォルト設定
(function setDefaultDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('recordDate').value = `${y}-${m}-${d}`;
})();

loadRecords();
render();
