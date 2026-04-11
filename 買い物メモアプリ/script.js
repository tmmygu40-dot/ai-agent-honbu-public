'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'shopping-memo-list';

// ===== 要素取得 =====
const itemInput      = document.getElementById('itemInput');
const addBtn         = document.getElementById('addBtn');
const clearCheckedBtn = document.getElementById('clearCheckedBtn');
const itemList       = document.getElementById('itemList');
const emptyMsg       = document.getElementById('emptyMsg');
const counter        = document.getElementById('counter');

// ===== データ =====
let items = loadItems();

// ===== 初期描画 =====
render();

// ===== イベント =====
addBtn.addEventListener('click', addItem);

itemInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

clearCheckedBtn.addEventListener('click', () => {
  items = items.filter(item => !item.checked);
  saveItems();
  render();
});

// ===== 品物を追加 =====
function addItem() {
  const text = itemInput.value.trim();
  if (!text) return;

  items.push({
    id: Date.now(),
    text,
    checked: false
  });

  itemInput.value = '';
  itemInput.focus();
  saveItems();
  render();
}

// ===== チェック切り替え =====
function toggleCheck(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveItems();
    render();
  }
}

// ===== 削除 =====
function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

// ===== 描画 =====
function render() {
  itemList.innerHTML = '';

  const remaining = items.filter(i => !i.checked).length;
  const total     = items.length;

  // カウンター
  counter.textContent = total > 0
    ? `残り ${remaining} / ${total} 件`
    : '';

  // 空メッセージ
  emptyMsg.style.display = total === 0 ? 'block' : 'none';

  // リスト描画（未チェックを上、チェック済みを下）
  const sorted = [
    ...items.filter(i => !i.checked),
    ...items.filter(i =>  i.checked)
  ];

  sorted.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item' + (item.checked ? ' checked' : '');

    li.innerHTML = `
      <div class="check-icon">${item.checked ? '✓' : ''}</div>
      <span class="item-text">${escapeHtml(item.text)}</span>
      <button class="delete-btn" title="削除">×</button>
    `;

    // チェック切り替え（削除ボタン以外をタップ）
    li.addEventListener('click', e => {
      if (!e.target.classList.contains('delete-btn')) {
        toggleCheck(item.id);
      }
    });

    // 削除
    li.querySelector('.delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteItem(item.id);
    });

    itemList.appendChild(li);
  });
}

// ===== localStorage =====
function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ===== XSS対策 =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
