'use strict';

const STORAGE_KEY = 'shiire_kakaku_data';

// データ構造: [{id, itemName, supplierName, price, unit}]
let entries = [];

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { entries = JSON.parse(raw); } catch { entries = []; }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 品目一覧を取得
function getItems() {
  const set = new Set(entries.map(e => e.itemName));
  return [...set].sort();
}

// フィルターセレクトを更新
function updateFilter() {
  const select = document.getElementById('filterItem');
  const current = select.value;
  const items = getItems();

  select.innerHTML = '<option value="">すべて</option>';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });

  // 以前の選択を維持
  if (items.includes(current)) select.value = current;
}

// メイン描画
function render() {
  updateFilter();

  const filterValue = document.getElementById('filterItem').value;
  const area = document.getElementById('comparisonArea');

  const items = filterValue ? [filterValue] : getItems();

  if (items.length === 0) {
    area.innerHTML = '<p class="empty-msg">登録されたデータがありません。<br>上のフォームから品目・仕入れ先・単価を登録してください。</p>';
    return;
  }

  area.innerHTML = '';

  items.forEach(itemName => {
    const itemEntries = entries.filter(e => e.itemName === itemName);
    if (itemEntries.length === 0) return;

    // 最安値を求める
    const minPrice = Math.min(...itemEntries.map(e => Number(e.price)));

    const card = document.createElement('div');
    card.className = 'item-card';

    const title = document.createElement('h3');
    title.textContent = itemName;
    card.appendChild(title);

    const table = document.createElement('table');
    table.className = 'price-table';

    // ヘッダー
    table.innerHTML = `
      <thead>
        <tr>
          <th>仕入れ先</th>
          <th>単価（円）</th>
          <th>単位</th>
          <th></th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');

    // 単価昇順でソート
    const sorted = [...itemEntries].sort((a, b) => Number(a.price) - Number(b.price));

    sorted.forEach(entry => {
      const isCheapest = Number(entry.price) === minPrice;
      const tr = document.createElement('tr');
      if (isCheapest) tr.className = 'cheapest';

      tr.innerHTML = `
        <td>
          ${escHtml(entry.supplierName)}
          ${isCheapest ? '<span class="badge-cheapest">最安値</span>' : ''}
        </td>
        <td class="price-cell">¥${Number(entry.price).toLocaleString()}</td>
        <td>${escHtml(entry.unit || '—')}</td>
        <td>
          <button class="delete-btn" data-id="${escHtml(entry.id)}">削除</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    card.appendChild(table);
    area.appendChild(card);
  });

  // 削除ボタンのイベント
  area.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      entries = entries.filter(e => e.id !== id);
      saveData();
      render();
    });
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 登録
document.getElementById('addBtn').addEventListener('click', () => {
  const itemName = document.getElementById('itemName').value.trim();
  const supplierName = document.getElementById('supplierName').value.trim();
  const priceRaw = document.getElementById('price').value.trim();
  const unit = document.getElementById('unit').value.trim();

  if (!itemName || !supplierName || !priceRaw) {
    alert('品目名・仕入れ先・単価は必須です。');
    return;
  }

  const price = Number(priceRaw);
  if (isNaN(price) || price < 0) {
    alert('単価には0以上の数値を入力してください。');
    return;
  }

  entries.push({ id: generateId(), itemName, supplierName, price, unit });
  saveData();

  // フォームリセット（品目名は維持して連続登録しやすく）
  document.getElementById('supplierName').value = '';
  document.getElementById('price').value = '';
  document.getElementById('unit').value = '';

  render();
});

// Enterキーで登録
['itemName', 'supplierName', 'price', 'unit'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addBtn').click();
  });
});

// フィルター変更
document.getElementById('filterItem').addEventListener('change', render);

// 全削除
document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (!confirm('全データを削除しますか？この操作は元に戻せません。')) return;
  entries = [];
  saveData();
  render();
});

// 初期化
loadData();
render();
