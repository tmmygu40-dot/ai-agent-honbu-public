'use strict';

const STORAGE_KEY = 'handmade_items';
let items = [];
let editingId = null;

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  loadItems();
  renderList();
  attachPreviewListeners();
  updatePreview();
});

// localStorage 操作
function loadItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    items = data ? JSON.parse(data) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 価格計算
function calcPrice(materialCost, hours, minutes, hourlyWage, profitRate) {
  const totalHours = hours + minutes / 60;
  const laborCost = totalHours * hourlyWage;
  const cost = materialCost + laborCost;
  const price = Math.ceil(cost * profitRate);
  return { laborCost: Math.round(laborCost), cost: Math.round(cost), price };
}

// プレビュー更新
function updatePreview() {
  const material = parseFloat(document.getElementById('materialCost').value) || 0;
  const hours    = parseFloat(document.getElementById('workHours').value) || 0;
  const minutes  = parseFloat(document.getElementById('workMinutes').value) || 0;
  const wage     = parseFloat(document.getElementById('hourlyWage').value) || 0;
  const rate     = parseFloat(document.getElementById('profitRate').value) || 1;

  const { laborCost, cost, price } = calcPrice(material, hours, minutes, wage, rate);

  document.getElementById('previewMaterial').textContent = '¥' + material.toLocaleString();
  document.getElementById('previewLabor').textContent    = '¥' + laborCost.toLocaleString();
  document.getElementById('previewCost').textContent     = '¥' + cost.toLocaleString();
  document.getElementById('previewPrice').textContent    = '¥' + price.toLocaleString();
}

function attachPreviewListeners() {
  ['materialCost', 'workHours', 'workMinutes', 'hourlyWage', 'profitRate'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });
}

// 作品追加・更新
function addItem() {
  const name     = document.getElementById('itemName').value.trim();
  const material = parseFloat(document.getElementById('materialCost').value);
  const hours    = parseFloat(document.getElementById('workHours').value) || 0;
  const minutes  = parseFloat(document.getElementById('workMinutes').value) || 0;
  const wage     = parseFloat(document.getElementById('hourlyWage').value) || 1000;
  const rate     = parseFloat(document.getElementById('profitRate').value) || 1.5;

  if (!name) { showToast('作品名を入力してください'); return; }
  if (isNaN(material) || material < 0) { showToast('材料費を正しく入力してください'); return; }

  const { laborCost, cost, price } = calcPrice(material, hours, minutes, wage, rate);

  if (editingId !== null) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], name, material, hours, minutes, wage, rate, laborCost, cost, price };
    }
    editingId = null;
    document.getElementById('addBtn').textContent = '作品を追加';
    document.getElementById('cancelBtn').style.display = 'none';
    showToast('更新しました');
  } else {
    const newItem = {
      id: Date.now(),
      name, material, hours, minutes, wage, rate,
      laborCost, cost, price,
      createdAt: new Date().toLocaleDateString('ja-JP')
    };
    items.unshift(newItem);
    showToast('追加しました');
  }

  saveItems();
  clearForm();
  renderList();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('addBtn').textContent = '作品を追加';
  document.getElementById('cancelBtn').style.display = 'none';
  clearForm();
}

// フォームクリア
function clearForm() {
  document.getElementById('itemName').value    = '';
  document.getElementById('materialCost').value = '';
  document.getElementById('workHours').value   = '0';
  document.getElementById('workMinutes').value = '0';
  document.getElementById('hourlyWage').value  = '1000';
  document.getElementById('profitRate').value  = '1.5';
  updatePreview();
}

// 一覧描画
function renderList() {
  const list    = document.getElementById('itemList');
  const empty   = document.getElementById('emptyMsg');
  const countEl = document.getElementById('itemCount');
  const clearBtn = document.getElementById('clearBtn');

  countEl.textContent = items.length + '件';

  if (items.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    clearBtn.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  clearBtn.style.display = 'inline-block';

  list.innerHTML = items.map(item => {
    const workLabel = formatWork(item.hours, item.minutes);
    return `
      <div class="item-card" id="card-${item.id}">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-price">
          <span class="item-price-label">推奨販売価格</span><br>
          ¥${item.price.toLocaleString()}
        </div>
        <div class="item-details">
          <span>材料費：¥${item.material.toLocaleString()}</span>
          <span>人件費：¥${item.laborCost.toLocaleString()}</span>
          <span>原価：¥${item.cost.toLocaleString()}</span>
          <span>制作時間：${workLabel}</span>
          <span>時給：¥${item.wage.toLocaleString()}</span>
          <span>利益率：${item.rate}倍</span>
        </div>
        <div style="font-size:0.75rem;color:#aaa;margin-bottom:0.5rem">${item.createdAt}</div>
        <div class="item-actions">
          <button class="btn-edit" onclick="editItem(${item.id})">編集</button>
          <button class="btn-delete" onclick="deleteItem(${item.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function formatWork(hours, minutes) {
  const h = hours || 0;
  const m = minutes || 0;
  if (h === 0 && m === 0) return '0分';
  let s = '';
  if (h > 0) s += h + '時間';
  if (m > 0) s += m + '分';
  return s;
}

// 編集
function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('itemName').value    = item.name;
  document.getElementById('materialCost').value = item.material;
  document.getElementById('workHours').value   = item.hours;
  document.getElementById('workMinutes').value = item.minutes;
  document.getElementById('hourlyWage').value  = item.wage;
  document.getElementById('profitRate').value  = item.rate;
  document.getElementById('addBtn').textContent = '更新する';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  updatePreview();
  document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

// 削除
function deleteItem(id) {
  if (!confirm('この作品を削除しますか？')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
  showToast('削除しました');
}

// 全削除
function clearAll() {
  if (!confirm('全作品を削除しますか？')) return;
  items = [];
  saveItems();
  renderList();
  showToast('全件削除しました');
}

// Toast
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

// XSS対策
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
