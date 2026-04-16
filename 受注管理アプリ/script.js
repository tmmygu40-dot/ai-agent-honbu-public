const STORAGE_KEY = 'juchu_kanri_entries';
let currentFilter = 'all';
let entries = [];

function loadEntries() {
  const data = localStorage.getItem(STORAGE_KEY);
  entries = data ? JSON.parse(data) : [];
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addEntry() {
  const client = document.getElementById('client').value.trim();
  const amount = document.getElementById('amount').value;
  const status = document.getElementById('status').value;
  const date = document.getElementById('date').value;
  const memo = document.getElementById('memo').value.trim();

  if (!client) {
    alert('送付先を入力してください');
    return;
  }
  if (amount === '' || isNaN(Number(amount)) || Number(amount) < 0) {
    alert('金額を正しく入力してください');
    return;
  }

  const entry = {
    id: Date.now(),
    client,
    amount: Number(amount),
    status,
    date,
    memo
  };

  entries.unshift(entry);
  saveEntries();
  renderAll();
  clearForm();
}

function clearForm() {
  document.getElementById('client').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('status').value = '未決';
  document.getElementById('date').value = '';
  document.getElementById('memo').value = '';
}

function deleteEntry(id) {
  if (!confirm('この案件を削除しますか？')) return;
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderAll();
}

function cycleStatus(id) {
  const order = ['未決', '成約', '失注'];
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  const idx = order.indexOf(entry.status);
  entry.status = order[(idx + 1) % order.length];
  saveEntries();
  renderAll();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderAll() {
  renderSummary();
  renderList();
}

function renderSummary() {
  const total = entries.length;
  const won = entries.filter(e => e.status === '成約').length;
  const wonAmount = entries.filter(e => e.status === '成約').reduce((s, e) => s + e.amount, 0);
  const pendingAmount = entries.filter(e => e.status === '未決').reduce((s, e) => s + e.amount, 0);
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('winRate').textContent = winRate + '%';
  document.getElementById('expectedRevenue').textContent = '¥' + pendingAmount.toLocaleString();
  document.getElementById('wonRevenue').textContent = '¥' + wonAmount.toLocaleString();
}

function renderList() {
  const list = document.getElementById('entryList');
  const empty = document.getElementById('emptyMessage');

  const filtered = currentFilter === 'all'
    ? entries
    : entries.filter(e => e.status === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = filtered.map(entry => `
    <div class="entry-item">
      <div class="entry-main">
        <div class="entry-client">${escapeHtml(entry.client)}</div>
        <div class="entry-meta">
          ${entry.date ? '<span>' + formatDate(entry.date) + '</span>' : ''}
          ${entry.memo ? '<span>' + escapeHtml(entry.memo) + '</span>' : ''}
        </div>
        <div class="entry-amount">¥${entry.amount.toLocaleString()}</div>
      </div>
      <div class="entry-right">
        <span class="badge badge-${entry.status}">${entry.status}</span>
        <button class="btn-status" onclick="cycleStatus(${entry.id})">変更</button>
        <button class="btn-delete" onclick="deleteEntry(${entry.id})">削除</button>
      </div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
loadEntries();
renderAll();
