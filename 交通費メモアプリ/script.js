const STORAGE_KEY = 'kotsuhiMemo_records';

let records = [];

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentMonthStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function initDefaults() {
  document.getElementById('date').value = todayStr();
  document.getElementById('month-filter').value = currentMonthStr();
}

function addRecord() {
  const date = document.getElementById('date').value;
  const route = document.getElementById('route').value.trim();
  const amount = parseInt(document.getElementById('amount').value, 10);

  if (!date || !route || isNaN(amount) || amount < 0) {
    alert('日付・路線・金額をすべて入力してください');
    return;
  }

  records.push({
    id: Date.now(),
    date,
    route,
    amount
  });

  saveRecords();
  renderList();

  document.getElementById('route').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('date').value = todayStr();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
}

function renderList() {
  const filterMonth = document.getElementById('month-filter').value;
  const filtered = filterMonth
    ? records.filter(r => r.date.startsWith(filterMonth))
    : records;

  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const list = document.getElementById('record-list');
  const emptyMsg = document.getElementById('empty-msg');

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    document.getElementById('total-amount').textContent = '¥0';
    return;
  }

  emptyMsg.style.display = 'none';

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('total-amount').textContent = '¥' + total.toLocaleString();

  filtered.forEach(r => {
    const li = document.createElement('li');
    li.className = 'record-item';

    const dateEl = document.createElement('span');
    dateEl.className = 'record-date';
    dateEl.textContent = r.date.slice(5); // MM-DD

    const routeEl = document.createElement('span');
    routeEl.className = 'record-route';
    routeEl.textContent = r.route;

    const amountEl = document.createElement('span');
    amountEl.className = 'record-amount';
    amountEl.textContent = '¥' + r.amount.toLocaleString();

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = () => deleteRecord(r.id);

    li.appendChild(dateEl);
    li.appendChild(routeEl);
    li.appendChild(amountEl);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

loadRecords();
initDefaults();
renderList();
