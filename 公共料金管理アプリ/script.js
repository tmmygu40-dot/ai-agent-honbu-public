'use strict';

const STORAGE_KEY = 'utility_records';
const TYPE_LABELS = { electricity: '電気', gas: 'ガス', water: '水道' };
const TYPE_UNITS  = { electricity: 'kWh', gas: 'm³', water: 'm³' };

let records = [];
let currentTab = 'all';

// --- 初期化 ---
function init() {
  loadFromStorage();
  populateYearSelect();
  setDefaultDate();
  setupEvents();
  render();
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function populateYearSelect() {
  const sel = document.getElementById('inputYear');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '年';
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

function setDefaultDate() {
  const now = new Date();
  document.getElementById('inputMonth').value = now.getMonth() + 1;
}

function setupEvents() {
  document.getElementById('addBtn').addEventListener('click', addRecord);

  // 種別変更でunit表示を更新
  document.getElementById('inputType').addEventListener('change', updateUnit);

  // タブ
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.type;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });
}

function updateUnit() {
  const type = document.getElementById('inputType').value;
  document.getElementById('unitLabel').textContent = TYPE_UNITS[type];
}

// --- 追加 ---
function addRecord() {
  const year   = parseInt(document.getElementById('inputYear').value);
  const month  = parseInt(document.getElementById('inputMonth').value);
  const type   = document.getElementById('inputType').value;
  const usage  = parseFloat(document.getElementById('inputUsage').value);
  const amount = parseInt(document.getElementById('inputAmount').value);

  if (isNaN(usage) || usage < 0 || isNaN(amount) || amount < 0) {
    alert('使用量と金額を正しく入力してください。');
    return;
  }

  // 同じ年月・種別があれば上書き確認
  const idx = records.findIndex(r => r.year === year && r.month === month && r.type === type);
  if (idx !== -1) {
    if (!confirm(`${year}年${month}月の${TYPE_LABELS[type]}はすでに記録があります。上書きしますか？`)) return;
    records.splice(idx, 1);
  }

  records.push({ id: Date.now(), year, month, type, usage, amount });
  saveToStorage();

  // 入力リセット
  document.getElementById('inputUsage').value = '';
  document.getElementById('inputAmount').value = '';

  render();
}

// --- 削除 ---
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveToStorage();
  render();
}

// --- 前月比計算 ---
function getPrevRecord(record) {
  let prevYear = record.year;
  let prevMonth = record.month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  return records.find(r => r.year === prevYear && r.month === prevMonth && r.type === record.type) || null;
}

function diffHtml(current, prev) {
  if (!prev) return '<span class="diff-same">前月データなし</span>';
  const usageDiff  = current.usage  - prev.usage;
  const amountDiff = current.amount - prev.amount;
  const uSign = usageDiff  >= 0 ? '+' : '';
  const aSign = amountDiff >= 0 ? '+' : '';
  const cls   = amountDiff > 0 ? 'diff-up' : amountDiff < 0 ? 'diff-down' : 'diff-same';
  return `<span class="${cls}">前月比 使用量${uSign}${usageDiff.toFixed(1)} / 金額${aSign}${amountDiff.toLocaleString()}円</span>`;
}

// --- 描画 ---
function render() {
  const list = document.getElementById('recordList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = currentTab === 'all'
    ? [...records]
    : records.filter(r => r.type === currentTab);

  // 降順ソート（年月の新しい順）
  filtered.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.type.localeCompare(b.type);
  });

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  list.innerHTML = filtered.map(r => {
    const unit = TYPE_UNITS[r.type];
    const prev = getPrevRecord(r);
    return `
      <div class="record-card ${r.type}">
        <div class="record-header">
          <div class="record-title">
            <span class="type-badge">${TYPE_LABELS[r.type]}</span>
            <span class="record-date">${r.year}年${r.month}月</span>
          </div>
          <button class="delete-btn" onclick="deleteRecord(${r.id})" title="削除">×</button>
        </div>
        <div class="record-body">
          <div class="record-stat">
            <span class="stat-label">使用量</span>
            <span class="stat-value">${r.usage.toLocaleString()} ${unit}</span>
          </div>
          <div class="record-stat">
            <span class="stat-label">金額</span>
            <span class="stat-value">${r.amount.toLocaleString()} 円</span>
          </div>
          <div class="record-stat">
            <span class="stat-label">前月比</span>
            <span class="stat-value">${diffHtml(r, prev)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

init();
