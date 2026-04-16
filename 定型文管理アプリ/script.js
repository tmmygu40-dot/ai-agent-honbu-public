const STORAGE_KEY = 'teikei_items';

let items = [];

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch (e) {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const title = document.getElementById('titleInput').value.trim();
  const text = document.getElementById('textInput').value.trim();
  const category = document.getElementById('categorySelect').value;

  if (!title || !text) {
    alert('タイトルと本文を入力してください');
    return;
  }

  const item = {
    id: Date.now(),
    title,
    text,
    category,
    createdAt: new Date().toLocaleDateString('ja-JP')
  };

  items.unshift(item);
  saveItems();

  document.getElementById('titleInput').value = '';
  document.getElementById('textInput').value = '';
  document.getElementById('categorySelect').value = '';

  renderList();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  renderList();
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  showToast();
  btn.textContent = 'コピー済✓';
  setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
}

function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function getFilteredItems() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('filterCategory').value;
  return items.filter(item => {
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search) ||
      item.text.toLowerCase().includes(search);
    const matchCat = !cat || item.category === cat;
    return matchSearch && matchCat;
  });
}

function renderList() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const filtered = getFilteredItems();

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const catHtml = item.category
      ? `<span class="item-category">${escHtml(item.category)}</span>`
      : '';

    card.innerHTML = `
      <div class="item-header">
        <div class="item-title">${escHtml(item.title)}</div>
        ${catHtml}
      </div>
      <div class="item-body">${escHtml(item.text)}</div>
      <div class="item-actions">
        <button class="btn-copy">コピー</button>
        <button class="btn-delete">削除</button>
      </div>
    `;

    card.querySelector('.btn-copy').addEventListener('click', function() {
      copyText(item.text, this);
    });
    card.querySelector('.btn-delete').addEventListener('click', () => {
      if (confirm(`「${item.title}」を削除しますか？`)) {
        deleteItem(item.id);
      }
    });

    list.appendChild(card);
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('searchInput').addEventListener('input', renderList);
document.getElementById('filterCategory').addEventListener('change', renderList);

document.getElementById('titleInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('textInput').focus();
});

// 初期化
loadItems();
renderList();
