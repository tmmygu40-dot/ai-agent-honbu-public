'use strict';

const STORAGE_KEY = 'reply_items';
let items = [];
let currentFilter = 'all';

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

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

function render() {
  const list = document.getElementById('list');
  const emptyMsg = document.getElementById('empty-msg');
  list.innerHTML = '';

  const filtered = items.filter(item => {
    if (currentFilter === 'pending') return !item.done;
    if (currentFilter === 'done') return item.done;
    return true;
  });

  if (filtered.length === 0) {
    emptyMsg.classList.add('visible');
  } else {
    emptyMsg.classList.remove('visible');
  }

  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item' + (item.done ? ' done' : '');

    const badgeClass = item.done ? 'done' : 'pending';
    const badgeText = item.done ? '返信済み' : '未返信';
    const memoHtml = item.memo
      ? `<div class="item-memo">${escHtml(item.memo)}</div>`
      : '';

    div.innerHTML = `
      <input type="checkbox" class="item-check" ${item.done ? 'checked' : ''} data-id="${item.id}" aria-label="返信済みにする">
      <div class="item-body">
        <div class="item-subject">
          ${escHtml(item.subject)}
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="item-meta">${escHtml(item.contact)}　登録日：${formatDate(item.date)}</div>
        ${memoHtml}
      </div>
      <button class="btn-delete" data-id="${item.id}" aria-label="削除">×</button>
    `;
    list.appendChild(div);
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addItem() {
  const contact = document.getElementById('contact').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const date = document.getElementById('date').value || todayStr();
  const memo = document.getElementById('memo').value.trim();

  if (!contact || !subject) {
    alert('連絡先と件名は必須です');
    return;
  }

  const item = {
    id: Date.now().toString(),
    contact,
    subject,
    date,
    memo,
    done: false
  };

  items.unshift(item);
  save();
  render();

  document.getElementById('contact').value = '';
  document.getElementById('subject').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('date').value = todayStr();
  document.getElementById('contact').focus();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('subject').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('list').addEventListener('change', e => {
  if (e.target.classList.contains('item-check')) {
    const id = e.target.dataset.id;
    const item = items.find(i => i.id === id);
    if (item) {
      item.done = e.target.checked;
      save();
      render();
    }
  }
});

document.getElementById('list').addEventListener('click', e => {
  if (e.target.classList.contains('btn-delete')) {
    const id = e.target.dataset.id;
    if (confirm('この案件を削除しますか？')) {
      items = items.filter(i => i.id !== id);
      save();
      render();
    }
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// 初期化
load();
document.getElementById('date').value = todayStr();
render();
