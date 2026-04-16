const STORAGE_KEY = 'sns_calendar_posts';

let posts = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-based
let currentFilter = 'all';

// --- localStorage ---
function loadPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    posts = data ? JSON.parse(data) : [];
  } catch (e) {
    posts = [];
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// --- 投稿追加 ---
function addPost() {
  const date = document.getElementById('post-date').value;
  const platform = document.getElementById('post-platform').value;
  const content = document.getElementById('post-content').value.trim();

  if (!date) { alert('日付を入力してください。'); return; }
  if (!content) { alert('投稿内容を入力してください。'); return; }

  const post = {
    id: Date.now(),
    date,
    platform,
    content,
    done: false
  };

  posts.push(post);
  posts.sort((a, b) => a.date.localeCompare(b.date));
  savePosts();

  document.getElementById('post-date').value = '';
  document.getElementById('post-content').value = '';

  // カレンダーをその月に移動
  const [y, m] = date.split('-').map(Number);
  currentYear = y;
  currentMonth = m - 1;

  renderCalendar();
  renderList();
}

// --- ステータス切替 ---
function toggleDone(id) {
  const post = posts.find(p => p.id === id);
  if (post) {
    post.done = !post.done;
    savePosts();
    renderCalendar();
    renderList();
  }
}

// --- 削除 ---
function deletePost(id) {
  posts = posts.filter(p => p.id !== id);
  savePosts();
  renderCalendar();
  renderList();
}

// --- カレンダー描画 ---
function renderCalendar() {
  const title = document.getElementById('calendar-title');
  title.textContent = `${currentYear}年 ${currentMonth + 1}月`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
  dayHeaders.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (dayOfWeek === 0) cell.classList.add('sun');
    if (dayOfWeek === 6) cell.classList.add('sat');
    if (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === d
    ) {
      cell.classList.add('today');
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'cal-date';
    dateEl.textContent = d;
    cell.appendChild(dateEl);

    // その日の投稿バッジ
    const dayPosts = posts.filter(p => p.date === dateStr);
    dayPosts.forEach(post => {
      const badge = document.createElement('span');
      badge.className = `cal-badge ${post.done ? 'done' : 'pending'}`;
      badge.textContent = `[${post.platform}] ${post.content}`;
      badge.title = post.content;
      badge.addEventListener('click', () => {
        toggleDone(post.id);
      });
      cell.appendChild(badge);
    });

    if (dayPosts.length > 0) {
      cell.setAttribute('data-count', dayPosts.length + '件');
    }

    grid.appendChild(cell);
  }
}

// --- 月移動 ---
function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

// --- 一覧描画 ---
function renderList() {
  const container = document.getElementById('post-list');
  container.innerHTML = '';

  let filtered = posts;
  if (currentFilter === 'pending') filtered = posts.filter(p => !p.done);
  if (currentFilter === 'done') filtered = posts.filter(p => p.done);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-msg">投稿が登録されていません</div>';
    return;
  }

  filtered.forEach(post => {
    const item = document.createElement('div');
    item.className = `post-item${post.done ? ' done' : ''}`;

    item.innerHTML = `
      <input type="checkbox" class="post-checkbox" ${post.done ? 'checked' : ''} onchange="toggleDone(${post.id})">
      <div class="post-info">
        <div class="post-meta">
          <span class="post-date">${formatDate(post.date)}</span>
          <span class="post-platform">${post.platform}</span>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
      </div>
      <button class="btn-delete" onclick="deletePost(${post.id})" title="削除">✕</button>
    `;

    container.appendChild(item);
  });
}

// --- フィルター ---
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

// --- ユーティリティ ---
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${y}/${m}/${d}（${days[date.getDay()]}）`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 初期化 ---
loadPosts();
renderCalendar();
renderList();
