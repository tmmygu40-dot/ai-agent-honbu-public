const STORAGE_KEY = 'nerifuda_tags';

let tags = [];

function loadTags() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tags = JSON.parse(saved);
    } catch (e) {
      tags = [];
    }
  }
  renderTags();
}

function saveTags() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

function addTag() {
  const nameInput = document.getElementById('itemName');
  const priceInput = document.getElementById('itemPrice');

  const name = nameInput.value.trim();
  const priceRaw = priceInput.value.trim();

  if (!name) {
    nameInput.focus();
    return;
  }
  if (priceRaw === '' || isNaN(Number(priceRaw)) || Number(priceRaw) < 0) {
    priceInput.focus();
    return;
  }

  const price = Math.floor(Number(priceRaw));

  tags.push({ id: Date.now(), name, price });
  saveTags();
  renderTags();

  nameInput.value = '';
  priceInput.value = '';
  nameInput.focus();
}

function deleteTag(id) {
  tags = tags.filter(t => t.id !== id);
  saveTags();
  renderTags();
}

function clearAll() {
  if (tags.length === 0) return;
  if (!confirm('全ての値札を削除しますか？')) return;
  tags = [];
  saveTags();
  renderTags();
}

function formatPrice(price) {
  return '¥' + price.toLocaleString('ja-JP');
}

function renderTags() {
  const grid = document.getElementById('tagsGrid');
  const emptyMsg = document.getElementById('emptyMsg');
  const tagCount = document.getElementById('tagCount');

  tagCount.textContent = tags.length;

  if (tags.length === 0) {
    grid.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  grid.innerHTML = tags.map(tag => `
    <div class="price-tag" id="tag-${tag.id}">
      <button class="delete-btn" onclick="deleteTag(${tag.id})" title="削除">✕</button>
      <span class="tag-name">${escapeHtml(tag.name)}</span>
      <span class="tag-price">${formatPrice(tag.price)}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printTags() {
  if (tags.length === 0) {
    alert('値札がありません。先に追加してください。');
    return;
  }
  window.print();
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
  loadTags();

  document.getElementById('itemName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('itemPrice').focus();
  });

  document.getElementById('itemPrice').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTag();
  });
});
