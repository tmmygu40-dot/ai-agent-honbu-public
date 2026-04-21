// データ管理
let items = [];
let currentItemId = null;
const STORAGE_KEY = 'alt-procurement-items';

// 初期化
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      items = JSON.parse(saved);
    } catch (e) {
      items = [];
    }
  }
  renderItems();
}

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ID生成
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 品目追加
function addItem() {
  const name = document.getElementById('itemName').value.trim();
  if (!name) {
    alert('品目名を入力してください');
    document.getElementById('itemName').focus();
    return;
  }

  const item = {
    id: genId(),
    name,
    mainSupplier: document.getElementById('mainSupplier').value.trim(),
    mainContact: document.getElementById('mainContact').value.trim(),
    mainNote: document.getElementById('mainNote').value.trim(),
    altSuppliers: [],
    expanded: true,
  };

  items.unshift(item);
  save();
  clearItemForm();
  renderItems();
}

function clearItemForm() {
  ['itemName', 'mainSupplier', 'mainContact', 'mainNote'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// 品目削除
function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`「${item.name}」を削除しますか？\n代替仕入れ先の情報もすべて削除されます。`)) return;
  items = items.filter(i => i.id !== id);
  save();
  renderItems();
}

// 展開切り替え
function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.expanded = !item.expanded;
    save();
    renderItems();
  }
}

// モーダルを開く
function openModal(itemId) {
  currentItemId = itemId;
  const item = items.find(i => i.id === itemId);
  document.getElementById('modalTitle').textContent = `代替仕入れ先を追加：${item.name}`;
  ['altSupplier', 'altContact', 'altPrice', 'altNote'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('altSupplier').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  currentItemId = null;
}

// 代替仕入れ先追加
function addAltSupplier() {
  const name = document.getElementById('altSupplier').value.trim();
  if (!name) {
    alert('代替仕入れ先名を入力してください');
    document.getElementById('altSupplier').focus();
    return;
  }

  const item = items.find(i => i.id === currentItemId);
  if (!item) return;

  item.altSuppliers.push({
    id: genId(),
    name,
    contact: document.getElementById('altContact').value.trim(),
    price: document.getElementById('altPrice').value.trim(),
    note: document.getElementById('altNote').value.trim(),
  });

  save();
  closeModal();
  renderItems();
}

// 代替仕入れ先削除
function deleteAlt(itemId, altId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  item.altSuppliers = item.altSuppliers.filter(a => a.id !== altId);
  save();
  renderItems();
}

// 検索フィルター
function getFilteredItems() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i => i.name.toLowerCase().includes(q));
}

// 描画
function renderItems() {
  const filtered = getFilteredItems();
  const container = document.getElementById('itemList');
  document.getElementById('itemCount').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">品目が登録されていません</div>';
    return;
  }

  container.innerHTML = filtered.map(item => {
    const altCount = item.altSuppliers.length;
    const expanded = item.expanded !== false;

    const mainInfo = [
      item.mainSupplier ? `<p>🏢 ${esc(item.mainSupplier)}</p>` : '',
      item.mainContact ? `<p>📞 ${esc(item.mainContact)}</p>` : '',
      item.mainNote ? `<p>📝 ${esc(item.mainNote)}</p>` : '',
    ].filter(Boolean).join('');

    const altCards = item.altSuppliers.map(alt => `
      <div class="alt-card">
        <div class="alt-card-header">
          <span class="alt-name">🔄 ${esc(alt.name)}</span>
          <button class="btn-icon red" onclick="deleteAlt('${item.id}','${alt.id}')" title="削除">🗑️</button>
        </div>
        ${alt.contact ? `<div class="alt-info">📞 ${esc(alt.contact)}</div>` : ''}
        ${alt.price ? `<div class="alt-info">💴 ${esc(alt.price)}</div>` : ''}
        ${alt.note ? `<div class="alt-info">📝 ${esc(alt.note)}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="item-card">
        <div class="item-header" onclick="toggleItem('${item.id}')">
          <span class="item-name">${esc(item.name)}</span>
          <span class="item-meta">代替${altCount}件</span>
          <div class="item-actions" onclick="event.stopPropagation()">
            <button class="btn-icon red" onclick="deleteItem('${item.id}')" title="削除">🗑️</button>
          </div>
          <span class="toggle-icon ${expanded ? 'open' : ''}">▼</span>
        </div>
        ${expanded ? `
        <div class="item-body">
          ${mainInfo ? `
          <div class="main-supplier-info">
            <div class="label">メイン仕入れ先</div>
            ${mainInfo}
          </div>` : ''}
          <div class="alt-section-title">
            代替仕入れ先
            <button class="btn-add-alt" onclick="openModal('${item.id}')">＋ 追加</button>
          </div>
          <div class="alt-list">
            ${altCards || '<div class="no-alt">代替仕入れ先がまだ登録されていません</div>'}
          </div>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Enterキーで品目追加
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mainNote').addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });
  document.getElementById('altNote').addEventListener('keydown', e => {
    if (e.key === 'Enter') addAltSupplier();
  });
});

init();
