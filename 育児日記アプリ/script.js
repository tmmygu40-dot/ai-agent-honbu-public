const STORAGE_KEY = 'ikuji-diary-records';

let records = [];
let selectedType = '授乳';
let selectedDiaper = 'おしっこ';
let currentFilter = 'すべて';

const typeIcons = { '授乳': '🍼', '睡眠': '😴', 'おむつ': '👶' };

// 初期化
function init() {
  loadFromStorage();
  setDefaultDatetime();
  bindTypeButtons();
  bindDiaperButtons();
  bindFilterButtons();
  document.getElementById('addBtn').addEventListener('click', addRecord);
  renderList();
}

function setDefaultDatetime() {
  const now = new Date();
  // datetime-local形式: YYYY-MM-DDTHH:MM
  const pad = n => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('datetime').value = local;
}

function bindTypeButtons() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      updateFormFields();
    });
  });
}

function updateFormFields() {
  const amountGroup = document.getElementById('amount-group');
  const durationGroup = document.getElementById('duration-group');
  const diaperGroup = document.getElementById('diaper-group');
  const amountLabel = document.getElementById('amount-label');

  amountGroup.style.display = 'none';
  durationGroup.style.display = 'none';
  diaperGroup.style.display = 'none';

  if (selectedType === '授乳') {
    amountGroup.style.display = '';
    amountLabel.textContent = '量 (ml)';
  } else if (selectedType === '睡眠') {
    durationGroup.style.display = '';
  } else if (selectedType === 'おむつ') {
    diaperGroup.style.display = '';
  }
}

function bindDiaperButtons() {
  document.querySelectorAll('.diaper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diaper-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiaper = btn.dataset.diaper;
    });
  });
}

function bindFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });
}

function addRecord() {
  const datetime = document.getElementById('datetime').value;
  if (!datetime) {
    alert('日時を入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    type: selectedType,
    datetime: datetime,
    memo: document.getElementById('memo').value.trim(),
  };

  if (selectedType === '授乳') {
    record.amount = document.getElementById('amount').value;
  } else if (selectedType === '睡眠') {
    record.duration = document.getElementById('duration').value;
  } else if (selectedType === 'おむつ') {
    record.diaper = selectedDiaper;
  }

  records.unshift(record);
  saveToStorage();
  renderList();

  // フォームリセット
  document.getElementById('amount').value = '';
  document.getElementById('duration').value = '';
  document.getElementById('memo').value = '';
  setDefaultDatetime();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveToStorage();
  renderList();
}

function renderList() {
  const container = document.getElementById('recordList');
  const filtered = currentFilter === 'すべて'
    ? records
    : records.filter(r => r.type === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const dt = new Date(r.datetime);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${dt.getFullYear()}/${pad(dt.getMonth()+1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

    let detail = '';
    if (r.type === '授乳' && r.amount) detail = `量：${r.amount} ml`;
    if (r.type === '睡眠' && r.duration) detail = `時間：${r.duration} 分`;
    if (r.type === 'おむつ' && r.diaper) detail = `種別：${r.diaper}`;

    return `
      <div class="record-card" data-type="${r.type}">
        <div class="record-icon">${typeIcons[r.type] || '📝'}</div>
        <div class="record-body">
          <div class="record-type">${r.type}</div>
          <div class="record-datetime">${dateStr}</div>
          ${detail ? `<div class="record-detail">${detail}</div>` : ''}
          ${r.memo ? `<div class="record-memo">${escapeHtml(r.memo)}</div>` : ''}
        </div>
        <button class="delete-btn" data-id="${r.id}" title="削除">✕</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(Number(btn.dataset.id)));
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      records = JSON.parse(data);
    } catch {
      records = [];
    }
  }
}

init();
