// --- State ---
let currentYear, currentMonth;
let limit = 10;
let records = {}; // key: "YYYY-MM-DD", value: "office"|"remote"|"holiday"

// --- Init ---
(function init() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;

  loadData();
  setDateInputToday();
  updateMonthLabel();
  renderSummary();
  renderList();
})();

// --- Storage ---
function getStorageKey() {
  return `telework_${currentYear}_${String(currentMonth).padStart(2, '0')}`;
}

function getLimitKey() {
  return `telework_limit_${currentYear}_${String(currentMonth).padStart(2, '0')}`;
}

function loadData() {
  const saved = localStorage.getItem(getStorageKey());
  records = saved ? JSON.parse(saved) : {};

  const savedLimit = localStorage.getItem(getLimitKey());
  limit = savedLimit ? parseInt(savedLimit) : 10;
  document.getElementById('limitInput').value = limit;
}

function saveData() {
  localStorage.setItem(getStorageKey(), JSON.stringify(records));
  localStorage.setItem(getLimitKey(), String(limit));
}

// --- Helpers ---
function setDateInputToday() {
  const now = new Date();
  document.getElementById('dateInput').value = formatDate(now);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateJa(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dow = new Date(dateStr).getDay();
  return `${parseInt(m)}月${parseInt(d)}日（${days[dow]}）`;
}

function getTypeLabel(type) {
  if (type === 'office') return '出社';
  if (type === 'remote') return '在宅';
  return '休日';
}

// --- Month nav ---
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  loadData();
  updateMonthLabel();
  renderSummary();
  renderList();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  loadData();
  updateMonthLabel();
  renderSummary();
  renderList();
});

function updateMonthLabel() {
  document.getElementById('currentMonth').textContent =
    `${currentYear}年${currentMonth}月`;
}

// --- Limit setting ---
document.getElementById('saveLimit').addEventListener('click', () => {
  const val = parseInt(document.getElementById('limitInput').value);
  if (!isNaN(val) && val >= 1) {
    limit = val;
    saveData();
    renderSummary();
  }
});

// --- Add record ---
document.querySelectorAll('.btn-type').forEach(btn => {
  btn.addEventListener('click', () => {
    const dateVal = document.getElementById('dateInput').value;
    if (!dateVal) return;

    const [y, m] = dateVal.split('-').map(Number);
    if (y !== currentYear || m !== currentMonth) {
      alert('選択した日付が現在表示中の月と異なります。');
      return;
    }

    const type = btn.dataset.type;
    records[dateVal] = type;
    saveData();
    renderSummary();
    renderList();
  });
});

// --- Render summary ---
function renderSummary() {
  let officeCount = 0;
  let remoteCount = 0;

  Object.values(records).forEach(type => {
    if (type === 'office') officeCount++;
    else if (type === 'remote') remoteCount++;
  });

  const remaining = limit - officeCount;

  document.getElementById('officeCount').textContent = officeCount;
  document.getElementById('remoteCount').textContent = remoteCount;
  document.getElementById('remainingCount').textContent = remaining;

  const remCard = document.querySelector('.summary-card.remaining');
  if (remaining < 0) {
    remCard.classList.add('over');
  } else {
    remCard.classList.remove('over');
  }
}

// --- Render list ---
function renderList() {
  const list = document.getElementById('recordList');
  const entries = Object.entries(records)
    .filter(([key]) => {
      const [y, m] = key.split('-').map(Number);
      return y === currentYear && m === currentMonth;
    })
    .sort(([a], [b]) => b.localeCompare(a));

  if (entries.length === 0) {
    list.innerHTML = '<li class="empty-msg">まだ記録がありません</li>';
    return;
  }

  list.innerHTML = entries.map(([date, type]) => `
    <li class="record-item ${type}" data-date="${date}">
      <span class="record-date">${formatDateJa(date)}</span>
      <span class="record-type">${getTypeLabel(type)}</span>
      <button class="btn-delete" data-date="${date}" title="削除">✕</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      delete records[date];
      saveData();
      renderSummary();
      renderList();
    });
  });
}
