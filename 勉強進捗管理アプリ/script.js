'use strict';

const STORAGE_KEY = 'study_progress_books';

let books = [];
let editingId = null;

function loadBooks() {
  try {
    books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    books = [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function calcCompletionDate(totalPages, currentPage, dailyGoal) {
  const remaining = totalPages - currentPage;
  if (remaining <= 0) return null; // 完了済み
  if (dailyGoal <= 0) return null;
  const daysNeeded = Math.ceil(remaining / dailyGoal);
  const date = new Date();
  date.setDate(date.getDate() + daysNeeded);
  return date;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function calcProgress(totalPages, currentPage) {
  if (totalPages <= 0) return 0;
  return Math.min(100, Math.round((currentPage / totalPages) * 100));
}

function renderBooks() {
  const list = document.getElementById('bookList');
  if (books.length === 0) {
    list.innerHTML = '<p class="empty-msg">教材が登録されていません</p>';
    return;
  }

  list.innerHTML = books.map(book => {
    const progress = calcProgress(book.totalPages, book.currentPage);
    const isDone = book.currentPage >= book.totalPages;
    const completionDate = isDone ? null : calcCompletionDate(book.totalPages, book.currentPage, book.dailyGoal);

    let dateText = '';
    if (isDone) {
      dateText = `<p class="completion-date done-label">✅ 完了！</p>`;
    } else if (completionDate) {
      dateText = `<p class="completion-date">📅 完了予定日：${formatDate(completionDate)}</p>`;
    } else {
      dateText = `<p class="completion-date">完了予定日を計算できません</p>`;
    }

    return `
      <div class="book-card" data-id="${book.id}">
        <div class="book-header">
          <span class="book-name">${escapeHtml(book.name)}</span>
          <button class="book-delete" data-id="${book.id}" title="削除">✕</button>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${isDone ? 'done' : ''}" style="width:${progress}%"></div>
        </div>
        <div class="book-info">
          <span>現在：<strong>${book.currentPage}</strong> ページ</span>
          <span>合計：<strong>${book.totalPages}</strong> ページ</span>
          <span>進捗：<strong>${progress}%</strong></span>
          <span>1日目標：<strong>${book.dailyGoal}</strong> ページ</span>
        </div>
        ${dateText}
        <button class="btn-update" data-id="${book.id}">進捗を更新</button>
      </div>
    `;
  }).join('');

  // イベント再設定
  list.querySelectorAll('.book-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteBook(btn.dataset.id));
  });
  list.querySelectorAll('.btn-update').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addBook() {
  const name = document.getElementById('bookName').value.trim();
  const totalPages = parseInt(document.getElementById('totalPages').value, 10);
  const dailyGoal = parseInt(document.getElementById('dailyGoal').value, 10);

  if (!name) { alert('教材名を入力してください'); return; }
  if (!totalPages || totalPages < 1) { alert('総ページ数を入力してください'); return; }
  if (!dailyGoal || dailyGoal < 1) { alert('1日の目標ページ数を入力してください'); return; }

  books.push({
    id: Date.now().toString(),
    name,
    totalPages,
    dailyGoal,
    currentPage: 0,
  });

  saveBooks();
  renderBooks();

  document.getElementById('bookName').value = '';
  document.getElementById('totalPages').value = '';
  document.getElementById('dailyGoal').value = '';
}

function deleteBook(id) {
  if (!confirm('この教材を削除しますか？')) return;
  books = books.filter(b => b.id !== id);
  saveBooks();
  renderBooks();
}

function openModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = `「${book.name}」の進捗更新`;
  document.getElementById('currentPage').value = book.currentPage;
  document.getElementById('currentPage').max = book.totalPages;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('currentPage').focus();
}

function closeModal() {
  editingId = null;
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

function saveProgress() {
  if (!editingId) return;
  const book = books.find(b => b.id === editingId);
  if (!book) return;

  const val = parseInt(document.getElementById('currentPage').value, 10);
  if (isNaN(val) || val < 0) { alert('正しいページ数を入力してください'); return; }
  if (val > book.totalPages) { alert(`${book.totalPages} ページを超えることはできません`); return; }

  book.currentPage = val;
  saveBooks();
  renderBooks();
  closeModal();
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addBook);
document.getElementById('saveBtn').addEventListener('click', saveProgress);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', closeModal);

document.getElementById('bookName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addBook();
});

// 初期化
loadBooks();
renderBooks();
