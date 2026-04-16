const STORAGE_KEY = 'haiki_records';

let records = [];
let filterMonth = null;

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  setTodayDate();
  render();
  bindEvents();
});

function setTodayDate() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('wasteDate').value = today;
}

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch (e) {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function bindEvents() {
  document.getElementById('addBtn').addEventListener('click', addRecord);
  document.getElementById('filterBtn').addEventListener('click', applyFilter);
  document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);
}

function addRecord() {
  const name = document.getElementById('productName').value.trim();
  const count = parseInt(document.getElementById('wasteCount').value, 10);
  const price = parseInt(document.getElementById('unitPrice').value, 10);
  const date = document.getElementById('wasteDate').value;

  if (!name) {
    alert('商品名を入力してください');
    return;
  }
  if (!count || count < 1) {
    alert('廃棄数は1以上を入力してください');
    return;
  }
  if (isNaN(price) || price < 0) {
    alert('単価は0以上を入力してください');
    return;
  }
  if (!date) {
    alert('日付を選択してください');
    return;
  }

  const record = {
    id: Date.now(),
    date,
    name,
    count,
    price,
    amount: count * price
  };

  records.unshift(record);
  saveRecords();

  // フォームリセット（商品名・廃棄数のみ）
  document.getElementById('productName').value = '';
  document.getElementById('wasteCount').value = '1';

  render();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

function applyFilter() {
  filterMonth = document.getElementById('filterMonth').value;
  render();
}

function clearFilter() {
  filterMonth = null;
  document.getElementById('filterMonth').value = '';
  render();
}

function getFilteredRecords() {
  if (!filterMonth) return records;
  return records.filter(r => r.date.slice(0, 7) === filterMonth);
}

function render() {
  renderSummary();
  renderRanking();
  renderTable();
}

function renderSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.date === today);
  const todayTotal = todayRecords.reduce((sum, r) => sum + r.amount, 0);
  const grandTotal = records.reduce((sum, r) => sum + r.amount, 0);

  document.getElementById('todayTotal').textContent = '¥' + todayTotal.toLocaleString();
  document.getElementById('grandTotal').textContent = '¥' + grandTotal.toLocaleString();
}

function renderRanking() {
  // 商品ごとの廃棄数合計を集計
  const map = {};
  records.forEach(r => {
    if (!map[r.name]) {
      map[r.name] = { count: 0, amount: 0 };
    }
    map[r.name].count += r.count;
    map[r.name].amount += r.amount;
  });

  const sorted = Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const list = document.getElementById('rankingList');

  if (sorted.length === 0) {
    list.innerHTML = '<li class="empty-msg">まだデータがありません</li>';
    return;
  }

  const medalClass = ['gold', 'silver', 'bronze', '', ''];

  list.innerHTML = sorted.map(([name, data], i) => `
    <li>
      <span class="rank-num ${medalClass[i] || ''}">${i + 1}</span>
      <span class="rank-name">${escapeHtml(name)}</span>
      <span class="rank-info">${data.count}個</span>
      <span class="rank-amount">¥${data.amount.toLocaleString()}</span>
    </li>
  `).join('');
}

function renderTable() {
  const filtered = getFilteredRecords();
  const tbody = document.getElementById('recordBody');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">記録がありません</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.count}個</td>
      <td>¥${r.price.toLocaleString()}</td>
      <td class="amount-cell">¥${r.amount.toLocaleString()}</td>
      <td><button class="delete-btn" onclick="deleteRecord(${r.id})">削除</button></td>
    </tr>
  `).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
