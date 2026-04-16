const STORAGE_KEY = 'clinicRecords';

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
  const hospital = document.getElementById('hospital').value.trim();
  const visitDate = document.getElementById('visitDate').value;
  const symptom = document.getElementById('symptom').value.trim();
  const medicine = document.getElementById('medicine').value.trim();
  const nextDate = document.getElementById('nextDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!hospital) {
    alert('病院名を入力してください');
    document.getElementById('hospital').focus();
    return;
  }
  if (!visitDate) {
    alert('診察日を入力してください');
    document.getElementById('visitDate').focus();
    return;
  }

  const record = {
    id: Date.now(),
    hospital,
    visitDate,
    symptom,
    medicine,
    nextDate,
    memo
  };

  records.unshift(record);
  saveRecords();
  clearForm();
  render();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

function clearForm() {
  document.getElementById('hospital').value = '';
  document.getElementById('visitDate').value = '';
  document.getElementById('symptom').value = '';
  document.getElementById('medicine').value = '';
  document.getElementById('nextDate').value = '';
  document.getElementById('memo').value = '';
}

function getDaysDiff(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getBadgeText(diff) {
  if (diff < 0) return `${Math.abs(diff)}日前`;
  if (diff === 0) return '今日';
  if (diff === 1) return '明日';
  return `${diff}日後`;
}

function renderUpcoming() {
  const section = document.getElementById('upcomingSection');
  const list = document.getElementById('upcomingList');

  const withNext = records
    .filter(r => r.nextDate)
    .map(r => ({ ...r, diff: getDaysDiff(r.nextDate) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5);

  if (withNext.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  list.innerHTML = withNext.map(r => {
    const diff = r.diff;
    let cls = '';
    if (diff < 0) cls = 'overdue';
    else if (diff <= 7) cls = 'soon';

    return `
      <div class="upcoming-item ${cls}">
        <div>
          <div class="upcoming-hospital">${escapeHtml(r.hospital)}</div>
          <div class="upcoming-date">予約日：${formatDate(r.nextDate)}</div>
        </div>
        <span class="upcoming-badge">${getBadgeText(diff)}</span>
      </div>
    `;
  }).join('');
}

function renderList() {
  const list = document.getElementById('recordList');
  const count = document.getElementById('recordCount');

  count.textContent = `${records.length}件`;

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がまだありません</p>';
    return;
  }

  list.innerHTML = records.map(r => {
    const hasNext = !!r.nextDate;
    const nextHtml = hasNext ? `
      <div class="record-next">
        <span class="record-next-label">次回予約</span>
        <span class="record-next-date">${formatDate(r.nextDate)}</span>
        <span style="font-size:0.8rem;color:#999;margin-left:4px">(${getBadgeText(getDaysDiff(r.nextDate))})</span>
      </div>` : '';

    return `
      <div class="record-card ${hasNext ? 'has-next' : ''}">
        <div class="record-header">
          <div>
            <div class="record-hospital">${escapeHtml(r.hospital)}</div>
            <div class="record-visit">診察日：${formatDate(r.visitDate)}</div>
          </div>
          <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">&#10005;</button>
        </div>
        <div class="record-body">
          <div class="record-field">
            <label>症状</label>
            <span>${escapeHtml(r.symptom) || '—'}</span>
          </div>
          <div class="record-field">
            <label>処方薬</label>
            <span>${escapeHtml(r.medicine) || '—'}</span>
          </div>
          ${r.memo ? `<div class="record-field" style="grid-column:1/-1">
            <label>メモ</label>
            <span>${escapeHtml(r.memo)}</span>
          </div>` : ''}
        </div>
        ${nextHtml}
      </div>
    `;
  }).join('');
}

function render() {
  renderUpcoming();
  renderList();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('addBtn').addEventListener('click', addRecord);

// Enterキーで追加
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') addRecord();
  });
});

// 初期表示
render();
