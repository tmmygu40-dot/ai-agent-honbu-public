'use strict';

const STORAGE_KEY = 'bousai_items';

let items = loadItems();

// DOM
const nameInput   = document.getElementById('itemName');
const qtyInput    = document.getElementById('itemQty');
const unitInput   = document.getElementById('itemUnit');
const expiryInput = document.getElementById('itemExpiry');
const addBtn      = document.getElementById('addBtn');
const itemList    = document.getElementById('itemList');
const emptyMsg    = document.getElementById('emptyMsg');
const summaryEl   = document.getElementById('summary');

addBtn.addEventListener('click', addItem);

[nameInput, qtyInput, unitInput, expiryInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
});

render();

// ---- 関数 ----

function addItem() {
  const name   = nameInput.value.trim();
  const qty    = qtyInput.value.trim();
  const unit   = unitInput.value.trim() || '個';
  const expiry = expiryInput.value;

  if (!name) { alert('品名を入力してください'); nameInput.focus(); return; }
  if (!qty || isNaN(qty) || Number(qty) < 1) { alert('数量を正しく入力してください'); qtyInput.focus(); return; }

  const item = {
    id:     Date.now(),
    name,
    qty:    Number(qty),
    unit,
    expiry: expiry || null
  };

  items.push(item);
  saveItems();
  render();
  clearForm();
  nameInput.focus();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

function getStatus(expiry) {
  if (!expiry) return 'no-expiry';
  const today = todayStr();
  if (expiry < today) return 'expired';
  const diff = daysDiff(today, expiry);
  if (diff <= 30) return 'soon';
  return 'ok';
}

function statusLabel(status) {
  return { expired: '期限切れ', soon: '期限近い', ok: '余裕あり', 'no-expiry': '期限なし' }[status];
}

function render() {
  // ソート：期限切れ → 期限近い → 余裕あり → 期限なし
  const order = { expired: 0, soon: 1, ok: 2, 'no-expiry': 3 };
  const sorted = [...items].sort((a, b) => {
    const sa = order[getStatus(a.expiry)];
    const sb = order[getStatus(b.expiry)];
    if (sa !== sb) return sa - sb;
    if (a.expiry && b.expiry) return a.expiry.localeCompare(b.expiry);
    return 0;
  });

  itemList.innerHTML = '';
  emptyMsg.style.display = sorted.length === 0 ? 'block' : 'none';

  sorted.forEach(item => {
    const status = getStatus(item.expiry);
    const li = document.createElement('li');
    li.className = status === 'expired' ? 'expired-row' : status === 'soon' ? 'soon-row' : '';

    const expiryText = item.expiry ? formatDate(item.expiry) : '期限なし';
    const daysLeft = item.expiry ? daysLeftText(item.expiry) : '';

    li.innerHTML = `
      <div class="item-info">
        <div class="item-name">${esc(item.name)}</div>
        <div class="item-qty">数量：${item.qty} ${esc(item.unit)}</div>
        <span class="item-expiry ${status}">📅 ${expiryText}${daysLeft ? '　' + daysLeft : ''}</span>
      </div>
      <button class="btn-delete" data-id="${item.id}">削除</button>
    `;
    itemList.appendChild(li);
  });

  itemList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.id)));
  });

  // サマリー
  const expiredCount = items.filter(i => getStatus(i.expiry) === 'expired').length;
  const soonCount    = items.filter(i => getStatus(i.expiry) === 'soon').length;
  let parts = [`合計 ${items.length} 件`];
  if (expiredCount > 0) parts.push(`⚠️ 期限切れ ${expiredCount} 件`);
  if (soonCount > 0)    parts.push(`🔔 期限近い ${soonCount} 件`);
  summaryEl.textContent = parts.join('　');
}

function clearForm() {
  nameInput.value   = '';
  qtyInput.value    = '';
  unitInput.value   = '';
  expiryInput.value = '';
}

function daysLeftText(expiry) {
  const today = todayStr();
  if (expiry < today) {
    const d = daysDiff(expiry, today);
    return `（${d}日超過）`;
  }
  const d = daysDiff(today, expiry);
  if (d === 0) return '（今日まで）';
  return `（残り${d}日）`;
}

function daysDiff(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b - a) / 86400000);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${y}年${m}月${d}日`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
