const STORAGE_KEY = 'sns_plan_posts';

const postDateEl = document.getElementById('postDate');
const platformEl = document.getElementById('platform');
const memoEl = document.getElementById('memo');
const addBtn = document.getElementById('addBtn');
const postList = document.getElementById('postList');
const filterPlatform = document.getElementById('filterPlatform');
const hidePosted = document.getElementById('hidePosted');

// 今日の日付をデフォルト値に
postDateEl.value = new Date().toISOString().split('T')[0];

let posts = loadPosts();
renderList();

const formError = document.getElementById('formError');

addBtn.addEventListener('click', () => {
  const date = postDateEl.value;
  const platform = platformEl.value;
  const memo = memoEl.value.trim();

  formError.textContent = '';
  if (!date) {
    formError.textContent = '投稿日を入力してください。';
    return;
  }
  if (!memo) {
    formError.textContent = '内容メモを入力してください。';
    return;
  }

  const post = {
    id: Date.now(),
    date,
    platform,
    memo,
    posted: false,
  };

  posts.push(post);
  savePosts();
  renderList();

  formError.textContent = '';
  memoEl.value = '';
  postDateEl.value = new Date().toISOString().split('T')[0];
});

filterPlatform.addEventListener('change', renderList);
hidePosted.addEventListener('change', renderList);

function renderList() {
  const filterVal = filterPlatform.value;
  const hideVal = hidePosted.checked;

  let filtered = [...posts];

  if (filterVal !== 'all') {
    filtered = filtered.filter(p => p.platform === filterVal);
  }
  if (hideVal) {
    filtered = filtered.filter(p => !p.posted);
  }

  // 日付の昇順
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  postList.innerHTML = '';

  if (filtered.length === 0) {
    postList.innerHTML = '<p class="empty-message">投稿予定がありません</p>';
    return;
  }

  filtered.forEach(post => {
    const item = document.createElement('div');
    item.className = 'post-item' + (post.posted ? ' posted' : '');

    const badgeClass = getBadgeClass(post.platform);
    const dateFormatted = formatDate(post.date);

    item.innerHTML = `
      <input type="checkbox" class="post-check" ${post.posted ? 'checked' : ''} data-id="${post.id}" title="投稿済みにする">
      <div class="post-body">
        <div class="post-header">
          <span class="post-date">${dateFormatted}</span>
          <span class="platform-badge ${badgeClass}">${post.platform}</span>
        </div>
        <div class="post-memo">${escapeHtml(post.memo)}</div>
      </div>
      <div class="post-actions">
        <button class="btn-delete" data-id="${post.id}" title="削除">×</button>
      </div>
    `;

    postList.appendChild(item);
  });

  // チェックボックス
  postList.querySelectorAll('.post-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = Number(chk.dataset.id);
      const post = posts.find(p => p.id === id);
      if (post) {
        post.posted = chk.checked;
        savePosts();
        renderList();
      }
    });
  });

  // 削除ボタン
  postList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      posts = posts.filter(p => p.id !== id);
      savePosts();
      renderList();
    });
  });
}

function getBadgeClass(platform) {
  const map = {
    'Twitter/X': 'badge-twitter',
    'Instagram': 'badge-instagram',
    'Facebook': 'badge-facebook',
    'YouTube': 'badge-youtube',
    'TikTok': 'badge-tiktok',
    'その他': 'badge-other',
  };
  return map[platform] || 'badge-other';
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const day = days[date.getDay()];
  return `${y}/${m}/${d}（${day}）`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}
