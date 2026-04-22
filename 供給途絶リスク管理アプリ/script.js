'use strict';

const STORAGE_KEY = 'supply_risk_items';

let items = [];
let editingId = null;

// ---- DOM ----
const itemNameEl   = document.getElementById('item-name');
const itemStockEl  = document.getElementById('item-stock');
const itemDailyEl  = document.getElementById('item-daily');
const itemLeadEl   = document.getElementById('item-lead');
const itemNoteEl   = document.getElementById('item-note');
const saveBtn      = document.getElementById('save-btn');
const cancelBtn    = document.getElementById('cancel-btn');
const formError    = document.getElementById('form-error');
const formTitle    = document.getElementById('form-title');
const itemsTbody   = document.getElementById('items-tbody');
const itemsTable   = document.getElementById('items-table');
const emptyMsg     = document.getElementById('empty-msg');
const itemCount    = document.getElementById('item-count');
const clearBtn     = document.getElementById('clear-btn');

// ---- Storage ----
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch (e) {
    items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ---- Risk ----
function calcRisk(stock, daily, lead) {
  if (!daily || daily <= 0) return { days: null, level: 'green' };
  const days = Math.floor(stock / daily);
  let level;
  if (days <= lead) {
    level = 'red';
  } else if (days <= Math.floor(lead * 1.5)) {
    level = 'yellow';
  } else {
    level = 'green';
  }
  return { days, level };
}

// ---- Render ----
function render() {
  itemsTbody.innerHTML = '';
  itemCount.textContent = items.length + '件';

  if (items.length === 0) {
    emptyMsg.style.display = 'block';
    itemsTable.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  itemsTable.style.display = 'table';

  // 危険順にソート
  const levelOrder = { red: 0, yellow: 1, green: 2 };
  const sorted = [...items].sort((a, b) => {
    const { level: la } = calcRisk(a.stock, a.daily, a.lead);
    const { level: lb } = calcRisk(b.stock, b.daily, b.lead);
    return levelOrder[la] - levelOrder[lb];
  });

  sorted.forEach(item => {
    const { days, level } = calcRisk(item.stock, item.daily, item.lead);
    const tr = document.createElement('tr');

    const daysText = days === null ? '−' : days + '日';
    const levelLabel = level === 'red' ? '危険' : level === 'yellow' ? '注意' : '安全';

    tr.innerHTML = `
      <td><span class="badge badge-${level}">${levelLabel}</span></td>
      <td><strong>${escHtml(item.name)}</strong></td>
      <td>${item.stock.toLocaleString()}</td>
      <td>${item.daily}</td>
      <td class="days-cell days-${level}">${daysText}</td>
      <td>${item.lead}日</td>
      <td class="note-cell" title="${escHtml(item.note)}">${escHtml(item.note) || '−'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" data-id="${item.id}">編集</button>
          <button class="btn-delete" data-id="${item.id}">削除</button>
        </div>
      </td>
    `;
    itemsTbody.appendChild(tr);
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Form ----
function clearForm() {
  itemNameEl.value  = '';
  itemStockEl.value = '';
  itemDailyEl.value = '';
  itemLeadEl.value  = '';
  itemNoteEl.value  = '';
  formError.textContent = '';
  editingId = null;
  saveBtn.textContent = '追加する';
  formTitle.textContent = '品目を追加';
  cancelBtn.style.display = 'none';
}

function validate() {
  const name  = itemNameEl.value.trim();
  const stock = parseFloat(itemStockEl.value);
  const daily = parseFloat(itemDailyEl.value);
  const lead  = parseInt(itemLeadEl.value);

  if (!name)              return '品目名を入力してください。';
  if (isNaN(stock) || stock < 0) return '在庫数量を正しく入力してください。';
  if (isNaN(daily) || daily <= 0) return '1日あたり使用量を正しく入力してください（0より大きい値）。';
  if (isNaN(lead) || lead < 1)    return 'リードタイムを正しく入力してください（1以上）。';
  return null;
}

saveBtn.addEventListener('click', () => {
  const err = validate();
  if (err) { formError.textContent = err; return; }
  formError.textContent = '';

  const entry = {
    id:    editingId || Date.now().toString(),
    name:  itemNameEl.value.trim(),
    stock: parseFloat(itemStockEl.value),
    daily: parseFloat(itemDailyEl.value),
    lead:  parseInt(itemLeadEl.value),
    note:  itemNoteEl.value.trim(),
  };

  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx !== -1) items[idx] = entry;
  } else {
    items.push(entry);
  }

  save();
  render();
  clearForm();
});

cancelBtn.addEventListener('click', () => {
  clearForm();
});

clearBtn.addEventListener('click', () => {
  if (items.length === 0) return;
  if (!confirm('全品目を削除しますか？')) return;
  items = [];
  save();
  render();
  clearForm();
});

// ---- Table events (delegation) ----
itemsTbody.addEventListener('click', e => {
  const editBtn   = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');

  if (editBtn) {
    const id   = editBtn.dataset.id;
    const item = items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    itemNameEl.value  = item.name;
    itemStockEl.value = item.stock;
    itemDailyEl.value = item.daily;
    itemLeadEl.value  = item.lead;
    itemNoteEl.value  = item.note;
    saveBtn.textContent = '更新する';
    formTitle.textContent = '品目を編集';
    cancelBtn.style.display = 'inline-block';
    formError.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (!confirm(`「${item.name}」を削除しますか？`)) return;
    items = items.filter(i => i.id !== id);
    save();
    render();
    if (editingId === id) clearForm();
  }
});

// ---- Init ----
load();
render();
