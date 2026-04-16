const STORAGE_KEY = 'tsukurioki_items';

let items = [];

function load() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(expiryStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryStr);
  return Math.floor((exp - now) / (1000 * 60 * 60 * 24));
}

function getStatus(expiryStr) {
  const d = daysUntil(expiryStr);
  if (d < 0) return 'expired';
  if (d <= 3) return 'soon';
  return 'ok';
}

function formatExpiry(expiryStr) {
  const d = daysUntil(expiryStr);
  const label = expiryStr.replace(/-/g, '/');
  if (d < 0) return `${label}（期限切れ ${Math.abs(d)}日経過）`;
  if (d === 0) return `${label}（今日まで）`;
  return `${label}（あと${d}日）`;
}

function addItem() {
  const name = document.getElementById('name').value.trim();
  const amount = document.getElementById('amount').value.trim();
  const expiry = document.getElementById('expiry').value;

  if (!name) { alert('料理名を入力してください'); return; }
  if (!expiry) { alert('保存期限を入力してください'); return; }

  items.push({ id: Date.now(), name, amount, expiry });
  save();
  render();

  document.getElementById('name').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('expiry').value = '';
  document.getElementById('name').focus();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  save();
  render();
}

function render() {
  // 期限が近い順にソート
  const sorted = [...items].sort((a, b) => a.expiry.localeCompare(b.expiry));

  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  count.textContent = `${sorted.length}件`;

  if (sorted.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = sorted.map(item => {
    const status = getStatus(item.expiry);
    const amountText = item.amount ? `<span>${item.amount}</span>` : '';
    return `
      <li class="${status}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">
            ${amountText}
            <span class="expiry-label">${formatExpiry(item.expiry)}</span>
          </div>
        </div>
        <button class="delete-btn" onclick="deleteItem(${item.id})">削除</button>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// キーボード Enter でも登録
document.addEventListener('DOMContentLoaded', () => {
  load();
  render();

  // 今日の日付をデフォルト設定（3日後）
  const d = new Date();
  d.setDate(d.getDate() + 3);
  document.getElementById('expiry').value = d.toISOString().slice(0, 10);

  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });
  });
});
