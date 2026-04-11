const STORAGE_KEY = 'zangyou_records';

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  renderAll();
  bindEvents();
});

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

function bindEvents() {
  document.getElementById('addBtn').addEventListener('click', addRecord);
  document.getElementById('monthFilter').addEventListener('change', renderAll);
  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('monthFilter').value = '';
    renderAll();
  });
}

// --- データ ---
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

// --- 残業時間の計算 ---
// 残業時間 = 退勤 - 定時（マイナスは0）
function calcOvertimeMinutes(endTime, normalEnd) {
  const [eh, em] = endTime.split(':').map(Number);
  const [nh, nm] = normalEnd.split(':').map(Number);
  const diff = (eh * 60 + em) - (nh * 60 + nm);
  return Math.max(0, diff);
}

function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}時間${String(m).padStart(2, '0')}分`;
}

// --- 追加 ---
function addRecord() {
  const date = document.getElementById('date').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const normalEnd = document.getElementById('normalEnd').value;
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.textContent = '';

  if (!date || !startTime || !endTime || !normalEnd) {
    errorMsg.textContent = '日付・出勤・退勤・定時をすべて入力してください';
    return;
  }

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    errorMsg.textContent = '退勤時刻は出勤時刻より後にしてください';
    return;
  }

  const records = loadRecords();

  // 同日の記録があれば上書き確認せず上書き
  const existingIndex = records.findIndex(r => r.date === date);
  const newRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : Date.now(),
    date,
    startTime,
    endTime,
    normalEnd,
    overtimeMinutes: calcOvertimeMinutes(endTime, normalEnd),
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  // 日付順に並び替え
  records.sort((a, b) => a.date.localeCompare(b.date));
  saveRecords(records);
  renderAll();
}

// --- 削除 ---
function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderAll();
}

// --- 描画 ---
function renderAll() {
  const allRecords = loadRecords();
  const filterMonth = document.getElementById('monthFilter').value; // "YYYY-MM" or ""

  const filtered = filterMonth
    ? allRecords.filter(r => r.date.startsWith(filterMonth))
    : allRecords;

  renderSummary(filtered);
  renderList(filtered);
}

function renderSummary(records) {
  const total = records.reduce((sum, r) => sum + r.overtimeMinutes, 0);
  document.getElementById('totalOvertime').textContent = minutesToHHMM(total);
  document.getElementById('recordCount').textContent = `${records.length}件`;
}

function renderList(records) {
  const listEl = document.getElementById('recordList');
  if (records.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // 新しい日付順（降順）で表示
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  listEl.innerHTML = sorted.map(r => {
    const dateLabel = formatDate(r.date);
    const overtimeLabel = minutesToHHMM(r.overtimeMinutes);
    const overtimeClass = r.overtimeMinutes > 0 ? 'overtime-positive' : 'overtime-zero';

    return `
      <div class="record-item">
        <div class="record-info">
          <span class="record-date">${dateLabel}</span>
          <span class="record-times">${r.startTime} → ${r.endTime}（定時 ${r.normalEnd}）</span>
          <span class="record-overtime ${overtimeClass}">残業：${overtimeLabel}</span>
        </div>
        <button class="delete-btn" onclick="deleteRecord(${r.id})">削除</button>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dow = days[new Date(dateStr).getDay()];
  return `${y}/${m}/${d}（${dow}）`;
}
