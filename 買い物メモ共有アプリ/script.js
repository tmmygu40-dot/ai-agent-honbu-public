'use strict';

const STORAGE_KEY = 'kaimono_memo_items';

let items = [];         // { id, text, checked }
let isSharedView = false; // 共有URLから読み込んだ場合

// ---- 初期化 ----
function init() {
  const hash = location.hash.slice(1);
  if (hash) {
    // URLハッシュからリストを復元（共有URLの場合）
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(hash)));
      if (Array.isArray(decoded)) {
        items = decoded;
        isSharedView = true;
        document.getElementById('shared-notice').style.display = 'flex';
      }
    } catch (e) {
      loadFromStorage();
    }
  } else {
    loadFromStorage();
  }
  render();
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch (e) {
    items = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ---- レンダリング ----
function render() {
  const list = document.getElementById('item-list');
  const actions = document.getElementById('actions');
  list.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => toggleItem(item.id));

    const span = document.createElement('span');
    span.className = 'item-text' + (item.checked ? ' checked' : '');
    span.textContent = item.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', '削除');
    delBtn.addEventListener('click', () => deleteItem(item.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });

  const hasChecked = items.some(i => i.checked);
  actions.style.display = hasChecked && items.length > 0 ? 'block' : 'none';
}

// ---- 操作 ----
function addItem(text) {
  text = text.trim();
  if (!text) return;
  items.push({ id: Date.now(), text, checked: false });
  saveToStorage();
  render();
}

function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveToStorage();
    render();
  }
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveToStorage();
  render();
}

function clearChecked() {
  items = items.filter(i => !i.checked);
  saveToStorage();
  render();
}

// ---- URL共有 ----
function generateShareURL() {
  const encoded = btoa(encodeURIComponent(JSON.stringify(items)));
  const url = location.origin + location.pathname + '#' + encoded;
  return url;
}

function copyShareURL() {
  if (items.length === 0) {
    showShareMsg('アイテムがありません');
    return;
  }
  const url = generateShareURL();
  navigator.clipboard.writeText(url).then(() => {
    showShareMsg('URLをコピーしました！');
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showShareMsg('URLをコピーしました！');
  });
}

function showShareMsg(msg) {
  const el = document.getElementById('share-msg');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ---- イベント登録 ----
document.getElementById('add-btn').addEventListener('click', () => {
  const input = document.getElementById('item-input');
  addItem(input.value);
  input.value = '';
  input.focus();
});

document.getElementById('item-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = document.getElementById('item-input');
    addItem(input.value);
    input.value = '';
  }
});

document.getElementById('clear-checked-btn').addEventListener('click', clearChecked);

document.getElementById('share-btn').addEventListener('click', copyShareURL);

document.getElementById('use-this-btn').addEventListener('click', () => {
  isSharedView = false;
  saveToStorage();
  // hashを消してlocalStorage版として扱う
  history.replaceState(null, '', location.pathname);
  document.getElementById('shared-notice').style.display = 'none';
  showShareMsg('このリストを保存しました');
});

// ---- 起動 ----
init();
