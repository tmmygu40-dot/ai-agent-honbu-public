const STORAGE_KEY = 'afterFollowItems';

let items = [];

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      items = JSON.parse(saved);
    } catch {
      items = [];
    }
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysDiff(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

function getUrgency(dateStr) {
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'normal';
}

function getDateLabel(dateStr) {
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return `<span class="date-label label-overdue">${Math.abs(diff)}日超過</span>`;
  if (diff === 0) return `<span class="date-label label-today">今日</span>`;
  if (diff <= 3) return `<span class="date-label label-soon">あと${diff}日</span>`;
  return '';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function addItem() {
  const client = document.getElementById('client').value.trim();
  const date = document.getElementById('date').value;
  const memo = document.getElementById('memo').value.trim();

  if (!client) {
    alert('顧客名を入力してください');
    return;
  }
  if (!date) {
    alert('次回連絡日を入力してください');
    return;
  }

  const item = {
    id: Date.now(),
    client,
    date,
    memo,
    contacted: false
  };

  items.push(item);
  saveItems();
  render();

  document.getElementById('client').value = '';
  document.getElementById('date').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('client').focus();
}

function toggleContacted(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.contacted = !item.contacted;
    saveItems();
    render();
  }
}

function deleteItem(id) {
  if (!confirm('この案件を削除しますか？')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

function render() {
  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const countEl = document.getElementById('count');

  // 連絡済み以外を連絡日昇順、連絡済みは後ろに
  const sorted = [...items].sort((a, b) => {
    if (a.contacted !== b.contacted) return a.contacted ? 1 : -1;
    return a.date.localeCompare(b.date);
  });

  const active = items.filter(i => !i.contacted).length;
  countEl.textContent = `${active}件`;

  if (sorted.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  listEl.innerHTML = sorted.map(item => {
    const urgency = item.contacted ? 'contacted' : getUrgency(item.date);
    const label = item.contacted ? '' : getDateLabel(item.date);
    const doneLabel = item.contacted ? '未対応に戻す' : '連絡済み';
    return `
      <div class="card ${urgency}">
        <div class="card-top">
          <span class="card-client">${escHtml(item.client)}</span>
          <div class="card-date-wrap">
            <span class="card-date">${formatDate(item.date)}</span>
            ${label}
          </div>
        </div>
        ${item.memo ? `<div class="card-memo">${escHtml(item.memo)}</div>` : ''}
        <div class="card-actions">
          <button class="btn-done" onclick="toggleContacted(${item.id})">${doneLabel}</button>
          <button class="btn-delete" onclick="deleteItem(${item.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
loadItems();
render();

// Enterキーで登録（テキストエリア以外）
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.id !== 'addBtn') {
    const client = document.getElementById('client').value.trim();
    const date = document.getElementById('date').value;
    if (client && date) {
      addItem();
    }
  }
});
