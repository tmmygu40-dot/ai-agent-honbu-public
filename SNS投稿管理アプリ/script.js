const STORAGE_KEY = 'sns_posts';

let posts = [];
let currentFilter = 'all';

function loadPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    posts = saved ? JSON.parse(saved) : [];
  } catch {
    posts = [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function formatDatetime(datetimeStr) {
  if (!datetimeStr) return '日時未設定';
  const d = new Date(datetimeStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function renderPosts() {
  const listEl = document.getElementById('postList');
  const emptyEl = document.getElementById('emptyMsg');

  const filtered = currentFilter === 'all'
    ? posts
    : posts.filter(p => p.status === currentFilter);

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl.classList.add('show');
    return;
  }

  emptyEl.classList.remove('show');

  // 投稿予定日時の新しい順に並べる
  const sorted = [...filtered].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  sorted.forEach(post => {
    const card = document.createElement('div');
    card.className = `post-card status-${post.status}`;
    card.dataset.id = post.id;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-meta">
          <span class="platform-badge">${escapeHtml(post.platform)}</span>
          <span class="card-date">${formatDatetime(post.date)}</span>
        </div>
        <span class="status-badge status-${post.status}" data-id="${post.id}" title="クリックでステータス変更">
          ${escapeHtml(post.status)}
        </span>
      </div>
      <div class="card-content">${escapeHtml(post.content)}</div>
      <div class="card-actions">
        <button class="btn-delete" data-id="${post.id}">削除</button>
      </div>
    `;

    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addPost() {
  const dateVal = document.getElementById('postDate').value;
  const platformVal = document.getElementById('snsPlatform').value;
  const contentVal = document.getElementById('postContent').value.trim();

  if (!contentVal) {
    alert('投稿内容を入力してください');
    return;
  }

  const post = {
    id: Date.now().toString(),
    date: dateVal,
    platform: platformVal,
    content: contentVal,
    status: '未投稿',
    createdAt: new Date().toISOString()
  };

  posts.unshift(post);
  savePosts();
  renderPosts();

  // フォームリセット
  document.getElementById('postContent').value = '';
  document.getElementById('postDate').value = '';
}

function toggleStatus(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.status = post.status === '未投稿' ? '投稿済み' : '未投稿';
  savePosts();
  renderPosts();
}

function deletePost(id) {
  if (!confirm('この投稿を削除しますか？')) return;
  posts = posts.filter(p => p.id !== id);
  savePosts();
  renderPosts();
}

// イベントリスナー
document.getElementById('addBtn').addEventListener('click', addPost);

document.getElementById('postList').addEventListener('click', e => {
  const statusBadge = e.target.closest('.status-badge');
  if (statusBadge) {
    toggleStatus(statusBadge.dataset.id);
    return;
  }

  const deleteBtn = e.target.closest('.btn-delete');
  if (deleteBtn) {
    deletePost(deleteBtn.dataset.id);
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderPosts();
  });
});

// Enterキーで登録（Ctrl+Enter）
document.getElementById('postContent').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    addPost();
  }
});

// 初期化
loadPosts();
renderPosts();
