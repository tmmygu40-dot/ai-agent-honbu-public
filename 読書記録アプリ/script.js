const STORAGE_KEY = 'bookRecords';
let books = [];
let currentTab = 'finished';
let selectedRating = 0;

// 初期化
function init() {
  loadBooks();
  renderStars(0);
  renderList();
  updateStats();
  bindEvents();
}

// localStorage 読み込み
function loadBooks() {
  try {
    books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    books = [];
  }
}

// localStorage 保存
function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// イベントバインド
function bindEvents() {
  // フォーム送信
  document.getElementById('bookForm').addEventListener('submit', function(e) {
    e.preventDefault();
    addBook();
  });

  // タブ切り替え
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentTab = this.dataset.tab;
      renderList();
    });
  });

  // 星評価クリック
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.value);
      document.getElementById('rating').value = selectedRating;
      renderStars(selectedRating);
    });
  });

  // ステータス変更で評価欄表示切り替え
  document.getElementById('status').addEventListener('change', function() {
    const ratingGroup = document.getElementById('ratingGroup');
    ratingGroup.style.display = this.value === 'finished' ? 'block' : 'block';
  });
}

// 星の表示更新
function renderStars(value) {
  document.querySelectorAll('.star').forEach(star => {
    const v = parseInt(star.dataset.value);
    star.classList.toggle('active', v <= value);
  });
}

// 本を追加
function addBook() {
  const title = document.getElementById('title').value.trim();
  if (!title) return;

  const book = {
    id: Date.now(),
    title: title,
    author: document.getElementById('author').value.trim(),
    status: document.getElementById('status').value,
    rating: selectedRating,
    memo: document.getElementById('memo').value.trim(),
    createdAt: new Date().toISOString()
  };

  books.unshift(book);
  saveBooks();
  resetForm();
  renderList();
  updateStats();
}

// フォームリセット
function resetForm() {
  document.getElementById('bookForm').reset();
  selectedRating = 0;
  document.getElementById('rating').value = 0;
  renderStars(0);
}

// ステータス切り替え
function toggleStatus(id) {
  books = books.map(b => {
    if (b.id === id) {
      b.status = b.status === 'finished' ? 'toread' : 'finished';
    }
    return b;
  });
  saveBooks();
  renderList();
  updateStats();
}

// 削除
function deleteBook(id) {
  if (!confirm('この本を削除しますか？')) return;
  books = books.filter(b => b.id !== id);
  saveBooks();
  renderList();
  updateStats();
}

// 一覧レンダリング
function renderList() {
  const list = document.getElementById('bookList');
  let filtered;
  if (currentTab === 'all') {
    filtered = books;
  } else {
    filtered = books.filter(b => b.status === currentTab);
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-msg">登録された本がありません</div>';
    return;
  }

  list.innerHTML = filtered.map(book => {
    const stars = book.rating > 0
      ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating)
      : '（評価なし）';
    const badgeClass = book.status === 'finished' ? 'badge-finished' : 'badge-toread';
    const badgeText = book.status === 'finished' ? '読了' : '積ん読';
    const toggleText = book.status === 'finished' ? '積ん読に戻す' : '読了にする';

    return `
      <div class="book-card">
        <div class="book-card-header">
          <div class="book-title">${escapeHtml(book.title)}</div>
          <span class="book-status-badge ${badgeClass}">${badgeText}</span>
        </div>
        ${book.author ? `<div class="book-author">${escapeHtml(book.author)}</div>` : ''}
        <div class="book-stars">${stars}</div>
        ${book.memo ? `<div class="book-memo">${escapeHtml(book.memo)}</div>` : ''}
        <div class="book-actions">
          <button class="btn-toggle" onclick="toggleStatus(${book.id})">${toggleText}</button>
          <button class="btn-delete" onclick="deleteBook(${book.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

// 統計更新
function updateStats() {
  const finished = books.filter(b => b.status === 'finished').length;
  const toread = books.filter(b => b.status === 'toread').length;
  document.getElementById('finishedCount').textContent = finished;
  document.getElementById('toReadCount').textContent = toread;
}

// XSS対策
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

init();
