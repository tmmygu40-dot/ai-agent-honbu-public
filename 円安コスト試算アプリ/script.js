'use strict';

const STORAGE_KEY = 'ensoku_items';

const itemNameEl = document.getElementById('itemName');
const costUsdEl  = document.getElementById('costUsd');
const oldRateEl  = document.getElementById('oldRate');
const newRateEl  = document.getElementById('newRate');
const grossMarginEl = document.getElementById('grossMargin');

const previewEl       = document.getElementById('preview');
const prevOldCostEl   = document.getElementById('prevOldCost');
const prevNewCostEl   = document.getElementById('prevNewCost');
const prevIncreaseEl  = document.getElementById('prevIncrease');
const prevIncreaseRateEl = document.getElementById('prevIncreaseRate');
const prevSellPriceEl = document.getElementById('prevSellPrice');

const btnAdd      = document.getElementById('btnAdd');
const emptyMsg    = document.getElementById('emptyMsg');
const itemTable   = document.getElementById('itemTable');
const tableBody   = document.getElementById('tableBody');
const summaryEl   = document.getElementById('summary');
const totalIncreaseEl = document.getElementById('totalIncrease');

let items = [];

// ── ユーティリティ ──────────────────────────────────────────────
function fmt(num) {
  return num.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

function calcItem(costUsd, oldRate, newRate, grossMargin) {
  const oldCost    = costUsd * oldRate;
  const newCost    = costUsd * newRate;
  const increase   = newCost - oldCost;
  const increaseRate = oldCost > 0 ? (increase / oldCost) * 100 : 0;
  const sellPrice  = grossMargin < 100 ? newCost / (1 - grossMargin / 100) : 0;
  return { oldCost, newCost, increase, increaseRate, sellPrice };
}

// ── プレビュー ───────────────────────────────────────────────────
function updatePreview() {
  const costUsd    = parseFloat(costUsdEl.value);
  const oldRate    = parseFloat(oldRateEl.value);
  const newRate    = parseFloat(newRateEl.value);
  const grossMargin = parseFloat(grossMarginEl.value);

  if (!costUsd || !oldRate || !newRate) {
    previewEl.hidden = true;
    return;
  }

  const margin = isNaN(grossMargin) ? 0 : grossMargin;
  const r = calcItem(costUsd, oldRate, newRate, margin);

  prevOldCostEl.textContent      = fmt(r.oldCost) + ' 円';
  prevNewCostEl.textContent      = fmt(r.newCost) + ' 円';
  prevIncreaseEl.textContent     = '+' + fmt(r.increase) + ' 円';
  prevIncreaseRateEl.textContent = '+' + r.increaseRate.toFixed(1) + '%';
  prevSellPriceEl.textContent    = margin > 0 ? fmt(r.sellPrice) + ' 円' : '-(粗利率未入力)';
  previewEl.hidden = false;
}

[costUsdEl, oldRateEl, newRateEl, grossMarginEl].forEach(el => {
  el.addEventListener('input', updatePreview);
});

// ── 追加 ────────────────────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  const name       = itemNameEl.value.trim();
  const costUsd    = parseFloat(costUsdEl.value);
  const oldRate    = parseFloat(oldRateEl.value);
  const newRate    = parseFloat(newRateEl.value);
  const grossMargin = parseFloat(grossMarginEl.value);

  if (!name) { alert('品目名を入力してください'); return; }
  if (!costUsd || costUsd <= 0) { alert('仕入れ値を入力してください'); return; }
  if (!oldRate || oldRate <= 0) { alert('旧為替レートを入力してください'); return; }
  if (!newRate || newRate <= 0) { alert('新為替レートを入力してください'); return; }

  const margin = isNaN(grossMargin) ? 0 : grossMargin;
  const r = calcItem(costUsd, oldRate, newRate, margin);

  const item = {
    id: Date.now(),
    name,
    costUsd,
    oldRate,
    newRate,
    grossMargin: margin,
    ...r
  };

  items.push(item);
  saveItems();
  renderTable();
  clearForm();
});

function clearForm() {
  itemNameEl.value = '';
  costUsdEl.value  = '';
  oldRateEl.value  = '';
  newRateEl.value  = '';
  grossMarginEl.value = '';
  previewEl.hidden = true;
}

// ── 削除 ────────────────────────────────────────────────────────
function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  renderTable();
}

// ── テーブル描画 ────────────────────────────────────────────────
function renderTable() {
  tableBody.innerHTML = '';

  if (items.length === 0) {
    emptyMsg.hidden  = false;
    itemTable.hidden = true;
    summaryEl.hidden = true;
    return;
  }

  emptyMsg.hidden  = true;
  itemTable.hidden = false;
  summaryEl.hidden = false;

  let totalIncrease = 0;

  items.forEach(item => {
    totalIncrease += item.increase;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(item.name)}</td>
      <td>${fmt(item.costUsd)}</td>
      <td>${fmt(item.oldRate)}</td>
      <td>${fmt(item.newRate)}</td>
      <td>${fmt(item.oldCost)}</td>
      <td>${fmt(item.newCost)}</td>
      <td class="td-increase">+${fmt(item.increase)}</td>
      <td class="td-increase">+${item.increaseRate.toFixed(1)}%</td>
      <td>${item.grossMargin > 0 ? item.grossMargin + '%' : '-'}</td>
      <td class="td-sell">${item.grossMargin > 0 ? fmt(item.sellPrice) : '-'}</td>
      <td><button class="btn-del" data-id="${item.id}">削除</button></td>
    `;
    tableBody.appendChild(tr);
  });

  totalIncreaseEl.textContent = fmt(totalIncrease);

  tableBody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.id)));
  });
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

// ── localStorage ────────────────────────────────────────────────
function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    items = data ? JSON.parse(data) : [];
  } catch (e) {
    items = [];
  }
}

// ── 初期化 ──────────────────────────────────────────────────────
loadItems();
renderTable();
