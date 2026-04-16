'use strict';

const STORAGE_KEY = 'viewing_records';

let records = loadRecords();
let selectedRating = 0;
let currentFilter = 'すべて';

// DOM
const titleInput = document.getElementById('title');
const typeSelect = document.getElementById('type');
const commentInput = document.getElementById('comment');
const addBtn = document.getElementById('addBtn');
const recordList = document.getElementById('recordList');
const countEl = document.getElementById('count');
const starButtons = document.querySelectorAll('.star');
const starLabel = document.getElementById('starLabel');
const filterButtons = document.querySelectorAll('.filter-btn');

// 星評価
starButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.dataset.value);
    setRating(val);
  });

  btn.addEventListener('mouseover', () => {
    const val = parseInt(btn.dataset.value);
    highlightStars(val);
  });
});

document.getElementById('starRating').addEventListener('mouseleave', () => {
  highlightStars(selectedRating);
});

function setRating(val) {
  selectedRating = val;
  highlightStars(val);
  const labels = ['', '★1 ひどい', '★2 いまいち', '★3 普通', '★4 良い', '★5 最高！'];
  starLabel.textContent = labels[val] || '未選択';
}

function highlightStars(val) {
  starButtons.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.value) <= val);
  });
}

// フィルター
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  });
});

// 追加
addBtn.addEventListener('click', addRecord);
titleInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addRecord();
});

function addRecord() {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = '#e74c3c';
    setTimeout(() => { titleInput.style.borderColor = ''; }, 1000);
    return;
  }

  const record = {
    id: Date.now(),
    title,
    type: typeSelect.value,
    rating: selectedRating,
    comment: commentInput.value.trim(),
    date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  };

  records.unshift(record);
  saveRecords();
  renderList();

  // リセット
  titleInput.value = '';
  commentInput.value = '';
  selectedRating = 0;
  highlightStars(0);
  starLabel.textContent = '未選択';
  titleInput.focus();
}

// 削除
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
}

// 描画
function renderList() {
  const filtered = currentFilter === 'すべて'
    ? records
    : records.filter(r => r.type === currentFilter);

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    recordList.innerHTML = '<li class="empty-msg">記録がありません</li>';
    return;
  }

  recordList.innerHTML = filtered.map(r => {
    const stars = r.rating > 0
      ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
      : '未評価';
    const typeClass = r.type === '映画' ? 'movie' : 'drama';
    const icon = r.type === '映画' ? '🎬' : '📺';
    const commentHtml = r.comment
      ? `<div class="record-comment">「${escapeHtml(r.comment)}」</div>`
      : '';

    return `
      <li class="record-item" data-id="${r.id}">
        <div class="record-main">
          <div class="record-title-row">
            <span class="record-title">${escapeHtml(r.title)}</span>
            <span class="record-type ${typeClass}">${icon} ${r.type}</span>
          </div>
          <div class="record-stars">${stars}</div>
          ${commentHtml}
          <div class="record-date">${r.date}</div>
        </div>
        <button class="btn-delete" data-id="${r.id}" title="削除">✕</button>
      </li>
    `;
  }).join('');

  // 削除ボタン
  recordList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (confirm('この記録を削除しますか？')) deleteRecord(id);
    });
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 初期描画
renderList();
