'use strict';

const STORAGE_KEY = 'price_simulator_items';

let items = [];

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function calcRecommendedPrice(newCost, grossMarginPct) {
  if (grossMarginPct >= 100) return newCost * 10;
  return newCost / (1 - grossMarginPct / 100);
}

function fmt(num) {
  return Math.round(num).toLocaleString('ja-JP');
}

function fmtDecimal(num, digits = 1) {
  return num.toFixed(digits);
}

function render() {
  const tbody = document.getElementById('resultBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const tableWrap = document.getElementById('tableWrap');
  const countBadge = document.getElementById('count');

  countBadge.textContent = items.length + '件';

  if (items.length === 0) {
    emptyMsg.classList.remove('hidden');
    tableWrap.classList.add('hidden');
    return;
  }

  emptyMsg.classList.add('hidden');
  tableWrap.classList.remove('hidden');

  tbody.innerHTML = items.map((item, i) => {
    const rateUp = item.oldCost > 0
      ? ((item.newCost - item.oldCost) / item.oldCost * 100)
      : 0;
    const recommendedPrice = calcRecommendedPrice(item.newCost, item.grossMargin);
    const profitAmount = recommendedPrice - item.newCost;

    return `
      <tr>
        <td class="product-name">${escHtml(item.name)}</td>
        <td class="price">¥${fmt(item.oldCost)}</td>
        <td class="price">¥${fmt(item.newCost)}</td>
        <td class="rate-up">+${fmtDecimal(rateUp)}%</td>
        <td class="margin-rate">${fmtDecimal(item.grossMargin)}%</td>
        <td class="price recommended-price">¥${fmt(recommendedPrice)}</td>
        <td class="price profit">¥${fmt(profitAmount)}</td>
        <td><button class="btn-delete" data-index="${i}" title="削除">✕</button></td>
      </tr>
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

function addItem() {
  const name = document.getElementById('productName').value.trim();
  const oldCost = parseFloat(document.getElementById('oldCost').value);
  const newCost = parseFloat(document.getElementById('newCost').value);
  const grossMargin = parseFloat(document.getElementById('grossMargin').value);

  if (!name) {
    alert('商品名を入力してください');
    return;
  }
  if (isNaN(oldCost) || oldCost < 0) {
    alert('現行仕入れ値を正しく入力してください');
    return;
  }
  if (isNaN(newCost) || newCost < 0) {
    alert('新仕入れ値を正しく入力してください');
    return;
  }
  if (isNaN(grossMargin) || grossMargin < 0 || grossMargin >= 100) {
    alert('目標粗利率は0〜99%で入力してください');
    return;
  }

  items.push({ name, oldCost, newCost, grossMargin });
  saveItems();
  render();

  document.getElementById('productName').value = '';
  document.getElementById('oldCost').value = '';
  document.getElementById('newCost').value = '';
  document.getElementById('productName').focus();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('productName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('resultBody').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const idx = parseInt(btn.dataset.index, 10);
  items.splice(idx, 1);
  saveItems();
  render();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (items.length === 0) return;
  if (!confirm('全件削除しますか？')) return;
  items = [];
  saveItems();
  render();
});

loadItems();
render();
