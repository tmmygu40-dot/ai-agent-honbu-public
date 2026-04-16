const STORAGE_KEY = 'priceHistoryRecords';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addRecord() {
  const name = document.getElementById('productName').value.trim();
  const priceVal = document.getElementById('price').value.trim();
  const date = document.getElementById('recordDate').value;
  const store = document.getElementById('storeName').value.trim();

  if (!name) { alert('商品名を入力してください'); return; }
  if (!priceVal || isNaN(Number(priceVal)) || Number(priceVal) < 0) {
    alert('正しい価格を入力してください');
    return;
  }
  if (!date) { alert('日付を入力してください'); return; }

  const records = loadRecords();
  records.push({
    id: Date.now(),
    name,
    price: Number(priceVal),
    date,
    store
  });
  saveRecords(records);

  document.getElementById('productName').value = '';
  document.getElementById('price').value = '';
  document.getElementById('recordDate').value = getTodayStr();
  document.getElementById('storeName').value = '';

  renderAll();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderAll();
}

function groupByProduct(records) {
  const map = {};
  records.forEach(r => {
    if (!map[r.name]) map[r.name] = [];
    map[r.name].push(r);
  });
  return map;
}

function renderAll() {
  const searchVal = document.getElementById('searchProduct').value.trim().toLowerCase();
  let records = loadRecords();

  if (searchVal) {
    records = records.filter(r => r.name.toLowerCase().includes(searchVal));
  }

  const container = document.getElementById('productList');

  if (records.length === 0) {
    container.innerHTML = '<div class="empty-msg">記録がありません。価格を記録してみましょう。</div>';
    return;
  }

  const grouped = groupByProduct(records);
  // Sort product names alphabetically
  const productNames = Object.keys(grouped).sort();

  container.innerHTML = productNames.map(name => {
    const items = grouped[name].sort((a, b) => b.date.localeCompare(a.date)); // newest first
    const prices = items.map(i => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

    const rows = items.map(item => {
      const isMin = item.price === minPrice;
      const isMax = item.price === maxPrice;
      const rowClass = isMin ? 'price-min-row' : isMax ? 'price-max-row' : '';
      const badge = isMin ? ' ▼最安' : isMax ? ' ▲最高' : '';
      return `
        <tr class="${rowClass}">
          <td>${item.date}</td>
          <td class="price-cell">¥${item.price.toLocaleString()}${badge}</td>
          <td>${item.store || '—'}</td>
          <td><button class="delete-btn" onclick="deleteRecord(${item.id})" title="削除">✕</button></td>
        </tr>`;
    }).join('');

    return `
      <div class="product-card">
        <div class="product-header">
          <span class="product-name">${escapeHtml(name)}</span>
          <div class="price-stats">
            <span class="stat-item stat-min">最安 ¥${minPrice.toLocaleString()}</span>
            <span class="stat-item stat-max">最高 ¥${maxPrice.toLocaleString()}</span>
            <span class="stat-item stat-avg">平均 ¥${avgPrice.toLocaleString()}</span>
          </div>
        </div>
        <table class="history-table">
          <thead>
            <tr><th>日付</th><th>価格</th><th>店舗</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('recordDate').value = getTodayStr();
  renderAll();
});
