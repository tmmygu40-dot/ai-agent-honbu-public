'use strict';

const STORAGE_KEY = 'zaiko_products';

let products = loadProducts();

const productNameInput = document.getElementById('productName');
const stockInInput = document.getElementById('stockIn');
const stockOutInput = document.getElementById('stockOut');
const addBtn = document.getElementById('addBtn');
const errorMsg = document.getElementById('errorMsg');
const productList = document.getElementById('productList');
const totalCount = document.getElementById('totalCount');

addBtn.addEventListener('click', handleAdd);
[productNameInput, stockInInput, stockOutInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });
});

function handleAdd() {
  errorMsg.textContent = '';
  const name = productNameInput.value.trim();
  const stockIn = parseInt(stockInInput.value, 10);
  const stockOut = parseInt(stockOutInput.value, 10);

  if (!name) { errorMsg.textContent = '商品名を入力してください。'; productNameInput.focus(); return; }
  if (isNaN(stockIn) || stockIn < 0) { errorMsg.textContent = '仕入れ数は0以上の数値で入力してください。'; stockInInput.focus(); return; }
  if (isNaN(stockOut) || stockOut < 0) { errorMsg.textContent = '販売数は0以上の数値で入力してください。'; stockOutInput.focus(); return; }
  if (stockOut > stockIn) { errorMsg.textContent = '販売数が仕入れ数を超えています。'; stockOutInput.focus(); return; }

  const product = {
    id: Date.now().toString(),
    name,
    stockIn,
    stockOut,
    createdAt: new Date().toISOString()
  };

  products.push(product);
  saveProducts();
  renderList();

  productNameInput.value = '';
  stockInInput.value = '';
  stockOutInput.value = '';
  productNameInput.focus();
}

function handleDelete(id) {
  if (!confirm('この商品を削除しますか？')) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderList();
}

function handleToggleEdit(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  const existing = card.querySelector('.update-form');
  if (existing) {
    existing.remove();
    return;
  }

  const product = products.find(p => p.id === id);
  const form = document.createElement('div');
  form.className = 'update-form';
  form.innerHTML = `
    <div class="form-group">
      <label>仕入れ数</label>
      <input type="number" class="edit-in" value="${product.stockIn}" min="0">
    </div>
    <div class="form-group">
      <label>販売数</label>
      <input type="number" class="edit-out" value="${product.stockOut}" min="0">
    </div>
    <button class="btn-update">更新</button>
  `;

  form.querySelector('.btn-update').addEventListener('click', () => {
    const newIn = parseInt(form.querySelector('.edit-in').value, 10);
    const newOut = parseInt(form.querySelector('.edit-out').value, 10);
    if (isNaN(newIn) || newIn < 0 || isNaN(newOut) || newOut < 0) {
      alert('0以上の数値を入力してください。');
      return;
    }
    if (newOut > newIn) {
      alert('販売数が仕入れ数を超えています。');
      return;
    }
    product.stockIn = newIn;
    product.stockOut = newOut;
    saveProducts();
    renderList();
  });

  card.appendChild(form);
}

function renderList() {
  if (products.length === 0) {
    productList.innerHTML = '<p class="empty-msg">商品が登録されていません。</p>';
    totalCount.textContent = '';
    return;
  }

  totalCount.textContent = `${products.length} 件`;

  productList.innerHTML = products.map(p => {
    const remaining = p.stockIn - p.stockOut;
    const isZero = remaining === 0;
    const isLow = remaining > 0 && remaining <= Math.max(1, Math.floor(p.stockIn * 0.1));
    const cardClass = isZero ? 'product-card zero-stock' : (isLow ? 'product-card low-stock' : 'product-card');
    const remainClass = isZero ? 'stat remaining zero' : (isLow ? 'stat remaining low' : 'stat remaining');

    return `
      <div class="${cardClass}" data-id="${p.id}">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-stats">
          <div class="stat">
            <span class="stat-label">仕入れ</span>
            <span class="stat-value">${p.stockIn}</span>
          </div>
          <div class="stat">
            <span class="stat-label">販売</span>
            <span class="stat-value">${p.stockOut}</span>
          </div>
          <div class="${remainClass}">
            <span class="stat-label">残在庫</span>
            <span class="stat-value">${remaining}</span>
          </div>
        </div>
        <button class="edit-btn" data-id="${p.id}" title="在庫を更新" aria-label="在庫を更新">✏️</button>
        <button class="delete-btn" data-id="${p.id}" title="削除" aria-label="削除">✕</button>
      </div>
    `;
  }).join('');

  productList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
  productList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => handleToggleEdit(btn.dataset.id));
  });
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

renderList();
