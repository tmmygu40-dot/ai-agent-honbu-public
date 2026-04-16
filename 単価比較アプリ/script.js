const STORAGE_KEY = 'tankahikaku_products';

let products = [];

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      products = JSON.parse(saved);
    }
  } catch (e) {
    products = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function addProduct() {
  const nameEl = document.getElementById('productName');
  const amountEl = document.getElementById('amount');
  const priceEl = document.getElementById('price');

  const name = nameEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const price = parseFloat(priceEl.value);

  if (!name) {
    alert('商品名を入力してください');
    nameEl.focus();
    return;
  }
  if (!amount || amount <= 0) {
    alert('内容量（g）を正しく入力してください');
    amountEl.focus();
    return;
  }
  if (!price || price <= 0) {
    alert('価格を正しく入力してください');
    priceEl.focus();
    return;
  }

  const unitPrice = price / amount;

  products.push({
    id: Date.now(),
    name,
    amount,
    price,
    unitPrice
  });

  saveToStorage();
  render();

  nameEl.value = '';
  amountEl.value = '';
  priceEl.value = '';
  nameEl.focus();
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveToStorage();
  render();
}

function clearAll() {
  if (products.length === 0) return;
  if (!confirm('全ての商品を削除しますか？')) return;
  products = [];
  saveToStorage();
  render();
}

function render() {
  const resultArea = document.getElementById('resultArea');
  const productList = document.getElementById('productList');
  const countLabel = document.getElementById('countLabel');

  if (products.length === 0) {
    resultArea.classList.add('hidden');
    return;
  }

  resultArea.classList.remove('hidden');
  countLabel.textContent = `（${products.length}件）`;

  const sorted = [...products].sort((a, b) => a.unitPrice - b.unitPrice);
  const bestId = sorted[0].id;

  productList.innerHTML = '';

  sorted.forEach((p, index) => {
    const isBest = p.id === bestId;
    const item = document.createElement('div');
    item.className = 'product-item' + (isBest ? ' best' : '');

    item.innerHTML = `
      <div class="product-info">
        <div class="product-name-row">
          <span class="product-name">${escapeHtml(p.name)}</span>
          ${isBest ? '<span class="best-badge">最安値</span>' : ''}
        </div>
        <div class="product-detail">${p.amount}g / ${p.price.toLocaleString()}円</div>
      </div>
      <div class="product-unit-price">${p.unitPrice.toFixed(2)}円/g</div>
      <button class="delete-btn" onclick="deleteProduct(${p.id})" title="削除">✕</button>
    `;

    productList.appendChild(item);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const active = document.activeElement;
    if (['productName', 'amount', 'price'].includes(active.id)) {
      addProduct();
    }
  }
});

loadFromStorage();
render();
