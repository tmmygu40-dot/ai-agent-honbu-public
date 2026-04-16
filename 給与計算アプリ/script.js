const STORAGE_KEY = 'salary_records';

let records = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function formatMoney(amount) {
  return '¥' + amount.toLocaleString('ja-JP');
}

function renderMonthLabel() {
  document.getElementById('current-month').textContent =
    `${currentYear}年${currentMonth + 1}月`;
}

function getMonthRecords() {
  return records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function renderRecords() {
  const list = document.getElementById('records-list');
  const monthRecords = getMonthRecords();

  if (monthRecords.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    document.getElementById('monthly-total').textContent = '¥0';
    return;
  }

  let total = 0;
  list.innerHTML = '';

  monthRecords.forEach(r => {
    const pay = Math.round(r.hours * r.wage);
    total += pay;

    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = `
      <div class="record-info">
        <div class="record-date">${formatDate(r.date)}</div>
        <div class="record-detail">${r.hours}時間 × ${formatMoney(r.wage)}/h</div>
      </div>
      <div class="record-pay">${formatMoney(pay)}</div>
      <button class="btn-delete" data-id="${r.id}">削除</button>
    `;
    list.appendChild(item);
  });

  document.getElementById('monthly-total').textContent = formatMoney(total);
}

function addRecord() {
  const dateEl = document.getElementById('work-date');
  const hoursEl = document.getElementById('work-hours');
  const wageEl = document.getElementById('hourly-wage');

  const date = dateEl.value;
  const hours = parseFloat(hoursEl.value);
  const wage = parseInt(wageEl.value);

  if (!date) { alert('日付を入力してください'); return; }
  if (!hours || hours <= 0) { alert('勤務時間を入力してください'); return; }
  if (!wage || wage <= 0) { alert('時給を入力してください'); return; }

  const record = {
    id: Date.now().toString(),
    date,
    hours,
    wage
  };

  records.push(record);
  saveRecords();

  // 追加した月に画面を合わせる
  const d = new Date(date);
  currentYear = d.getFullYear();
  currentMonth = d.getMonth();

  renderMonthLabel();
  renderRecords();

  hoursEl.value = '';
  // 時給はそのまま残す（連続入力の利便性のため）
  dateEl.value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderRecords();
}

// イベント
document.getElementById('add-btn').addEventListener('click', addRecord);

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderMonthLabel();
  renderRecords();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderMonthLabel();
  renderRecords();
});

document.getElementById('records-list').addEventListener('click', e => {
  if (e.target.classList.contains('btn-delete')) {
    if (confirm('この記録を削除しますか？')) {
      deleteRecord(e.target.dataset.id);
    }
  }
});

// 今日の日付をデフォルトにセット
document.getElementById('work-date').value = new Date().toISOString().slice(0, 10);

// 初期化
loadRecords();
renderMonthLabel();
renderRecords();
