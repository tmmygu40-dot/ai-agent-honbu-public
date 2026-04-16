const STORAGE_KEY = 'sns_posts';

let posts = [];
let currentDate = new Date();
let selectedDate = null;

function loadPosts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  posts = raw ? JSON.parse(raw) : [];
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                      '7月', '8月', '9月', '10月', '11月', '12月'];

  document.getElementById('currentMonth').textContent = `${year}年 ${monthNames[month]}`;

  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'calendar-header';
  ['日', '月', '火', '水', '木', '金', '土'].forEach((d, i) => {
    const span = document.createElement('span');
    span.textContent = d;
    if (i === 0) span.className = 'sun';
    if (i === 6) span.className = 'sat';
    header.appendChild(span);
  });
  cal.appendChild(header);

  // グリッド
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day empty';
    grid.appendChild(cell);
  }

  // 日付セル
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d);
    const dayOfWeek = (firstDay + d - 1) % 7;
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if (dayOfWeek === 0) cell.classList.add('day-sun');
    if (dayOfWeek === 6) cell.classList.add('day-sat');
    if (dateStr === todayStr) cell.classList.add('today');
    if (dateStr === selectedDate) cell.classList.add('selected');

    const numDiv = document.createElement('div');
    numDiv.className = 'day-num';
    numDiv.textContent = d;
    cell.appendChild(numDiv);

    // その日の投稿ドット
    const dayPosts = posts.filter(p => p.date === dateStr);
    if (dayPosts.length > 0) {
      const dots = document.createElement('div');
      dots.className = 'day-dots';
      dayPosts.slice(0, 4).forEach(p => {
        const dot = document.createElement('div');
        dot.className = `dot ${p.sns}`;
        dots.appendChild(dot);
      });
      cell.appendChild(dots);
    }

    cell.addEventListener('click', () => {
      selectedDate = dateStr;
      renderCalendar();
      renderPostList();
    });

    grid.appendChild(cell);
  }

  cal.appendChild(grid);
}

function renderPostList() {
  const titleEl = document.getElementById('listTitle');
  const postsEl = document.getElementById('posts');

  if (!selectedDate) {
    titleEl.innerHTML = '日付を選択してください';
    postsEl.innerHTML = '<p class="empty-msg">カレンダーの日付をタップしてください</p>';
    return;
  }

  const [y, m, d] = selectedDate.split('-');
  titleEl.innerHTML = `${y}年${parseInt(m)}月${parseInt(d)}日の投稿予定
    <button class="add-btn" id="addBtnList">＋追加</button>`;

  document.getElementById('addBtnList').addEventListener('click', () => openModal(selectedDate));

  const dayPosts = posts.filter(p => p.date === selectedDate);

  if (dayPosts.length === 0) {
    postsEl.innerHTML = '<p class="empty-msg">この日の投稿予定はありません</p>';
    return;
  }

  postsEl.innerHTML = '';
  dayPosts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'post-item';
    item.innerHTML = `
      <span class="post-badge ${p.sns}">${p.sns}</span>
      <div style="flex:1">
        <div class="post-content">${escapeHtml(p.content)}</div>
      </div>
      <button class="post-delete" data-id="${p.id}" title="削除">✕</button>
    `;
    item.querySelector('.post-delete').addEventListener('click', () => deletePost(p.id));
    postsEl.appendChild(item);
  });
}

function deletePost(id) {
  posts = posts.filter(p => p.id !== id);
  savePosts();
  renderCalendar();
  renderPostList();
}

function openModal(dateStr) {
  document.getElementById('inputDate').value = dateStr || '';
  document.getElementById('inputSNS').value = 'Twitter/X';
  document.getElementById('inputContent').value = '';
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function savePost() {
  const date = document.getElementById('inputDate').value;
  const sns = document.getElementById('inputSNS').value;
  const content = document.getElementById('inputContent').value.trim();

  if (!date) { alert('日付を選択してください'); return; }
  if (!content) { alert('投稿内容を入力してください'); return; }

  posts.push({
    id: Date.now().toString(),
    date,
    sns,
    content
  });

  savePosts();
  selectedDate = date;
  closeModal();
  renderCalendar();
  renderPostList();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// イベント
document.getElementById('prevMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  renderPostList();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  renderPostList();
});

document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', savePost);

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// 初期化
loadPosts();
selectedDate = (() => {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
})();
renderCalendar();
renderPostList();
