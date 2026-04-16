const STORAGE_KEY = 'petty_cash_records';

let records = [];

function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function calcSummary() {
  let totalIncome = 0;
  let totalExpense = 0;
  records.forEach(r => {
    if (r.type === 'income') totalIncome += r.amount;
    else totalExpense += r.amount;
  });
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

function formatMoney(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

function renderSummary() {
  const { totalIncome, totalExpense, balance } = calcSummary();
  document.getElementById('balance').textContent = formatMoney(balance);
  document.getElementById('total-income').textContent = formatMoney(totalIncome);
  document.getElementById('total-expense').textContent = formatMoney(totalExpense);
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (records.length === 0) {
    list.innerHTML = '<div class="empty-msg">まだ記録がありません</div>';
    return;
  }

  const sorted = [...records].sort((a, b) => b.id - a.id);
  list.innerHTML = sorted.map(r => `
    <div class="history-item ${r.type}">
      <span class="item-date">${r.date}</span>
      <span class="item-desc">${escapeHtml(r.description)}</span>
      <span class="item-amount">${r.type === 'income' ? '+' : '-'}${formatMoney(r.amount)}</span>
      <button class="item-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function render() {
  renderSummary();
  renderHistory();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

document.getElementById('clear-btn').addEventListener('click', () => {
  if (records.length === 0) return;
  if (confirm('全件削除しますか？')) {
    records = [];
    saveRecords();
    render();
  }
});

document.getElementById('add-btn').addEventListener('click', () => {
  const date = document.getElementById('date').value;
  const description = document.getElementById('description').value.trim();
  const amount = parseInt(document.getElementById('amount').value, 10);
  const type = document.querySelector('input[name="type"]:checked').value;

  if (!date) { alert('日付を入力してください'); return; }
  if (!description) { alert('内容を入力してください'); return; }
  if (!amount || amount <= 0) { alert('正しい金額を入力してください'); return; }

  const record = {
    id: Date.now(),
    date,
    description,
    amount,
    type
  };

  records.push(record);
  saveRecords();
  render();

  document.getElementById('description').value = '';
  document.getElementById('amount').value = '';
});

// 今日の日付をデフォルトセット
function setTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

loadRecords();
setTodayDate();
render();
