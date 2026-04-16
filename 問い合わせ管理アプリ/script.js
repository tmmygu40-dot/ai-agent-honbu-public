'use strict';

const STORAGE_KEY = 'inquiries_v1';
let inquiries = [];
let currentFilter = 'all';

// --- データ ---
function load() {
  try {
    inquiries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    inquiries = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${mi}`;
}

// --- 登録 ---
document.getElementById('addBtn').addEventListener('click', () => {
  const channel = document.getElementById('channel').value;
  const name = document.getElementById('name').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!content) {
    alert('内容を入力してください');
    return;
  }

  const item = {
    id: generateId(),
    channel,
    name: name || '（名前なし）',
    content,
    status: '未対応',
    createdAt: new Date().toISOString()
  };

  inquiries.unshift(item);
  save();

  document.getElementById('name').value = '';
  document.getElementById('content').value = '';

  render();
});

// --- フィルタータブ ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

// --- ステータス変更 ---
function changeStatus(id, newStatus) {
  const item = inquiries.find(i => i.id === id);
  if (item) {
    item.status = newStatus;
    save();
    render();
  }
}

// --- 削除 ---
function deleteItem(id) {
  if (!confirm('この問い合わせを削除しますか？')) return;
  inquiries = inquiries.filter(i => i.id !== id);
  save();
  render();
}

// --- 描画 ---
function render() {
  const filtered = currentFilter === 'all'
    ? inquiries
    : inquiries.filter(i => i.status === currentFilter);

  const list = document.getElementById('inquiryList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countDisplay = document.getElementById('countDisplay');

  const unresolved = inquiries.filter(i => i.status === '未対応').length;
  countDisplay.textContent = `全 ${inquiries.length} 件 ／ 未対応 ${unresolved} 件`;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  list.innerHTML = filtered.map(item => `
    <li class="inquiry-item status-${item.status}" data-id="${item.id}">
      <div class="item-header">
        <span class="badge-channel">${escHtml(item.channel)}</span>
        <span class="item-name">${escHtml(item.name)}</span>
        <span class="item-date">${formatDate(item.createdAt)}</span>
      </div>
      <div class="item-content">${escHtml(item.content)}</div>
      <div class="item-footer">
        <span class="status-badge badge-${item.status}">${item.status}</span>
        <select class="status-select" onchange="changeStatus('${item.id}', this.value)">
          <option value="未対応" ${item.status === '未対応' ? 'selected' : ''}>未対応</option>
          <option value="対応中" ${item.status === '対応中' ? 'selected' : ''}>対応中</option>
          <option value="完了"   ${item.status === '完了'   ? 'selected' : ''}>完了</option>
        </select>
        <button class="btn-delete" onclick="deleteItem('${item.id}')">削除</button>
      </div>
    </li>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- 初期化 ---
load();
render();
