const STORAGE_KEY = 'inquiries_v2';
let inquiries = [];
let currentFilter = 'all';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  inquiries = saved ? JSON.parse(saved) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderSummary() {
  const counts = { 未対応: 0, 対応中: 0, 完了: 0 };
  inquiries.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });
  document.getElementById('summary').innerHTML =
    Object.entries(counts).map(([s, c]) =>
      `<span class="summary-badge badge-${s}">${s} ${c}件</span>`
    ).join('');
}

function renderList() {
  const list = document.getElementById('inquiry-list');
  const filtered = currentFilter === 'all'
    ? inquiries
    : inquiries.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">該当する問い合わせはありません</p>';
    return;
  }

  list.innerHTML = filtered.map(item => `
    <div class="inquiry-card" data-id="${item.id}">
      <div class="card-top">
        <div class="card-content">${escapeHtml(item.content)}</div>
        <span class="status-badge status-${item.status}">${item.status}</span>
      </div>
      <div class="card-meta">
        ${item.contact ? `<span>📞 ${escapeHtml(item.contact)}</span>` : ''}
        ${item.assignee ? `<span>👤 ${escapeHtml(item.assignee)}</span>` : ''}
      </div>
      <div class="card-actions">
        <select class="status-select" data-id="${item.id}">
          <option value="未対応" ${item.status === '未対応' ? 'selected' : ''}>未対応</option>
          <option value="対応中" ${item.status === '対応中' ? 'selected' : ''}>対応中</option>
          <option value="完了" ${item.status === '完了' ? 'selected' : ''}>完了</option>
        </select>
        <button class="btn-delete" data-id="${item.id}">削除</button>
      </div>
      <div class="card-date">登録日時：${formatDate(item.createdAt)}</div>
    </div>
  `).join('');

  // ステータス変更
  list.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const id = e.target.dataset.id;
      const item = inquiries.find(i => i.id === id);
      if (item) {
        item.status = e.target.value;
        saveData();
        render();
      }
    });
  });

  // 削除
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      if (!confirm('この問い合わせを削除しますか？')) return;
      const id = e.target.dataset.id;
      inquiries = inquiries.filter(i => i.id !== id);
      saveData();
      render();
    });
  });
}

function render() {
  renderSummary();
  renderList();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// フォーム送信
document.getElementById('inquiry-form').addEventListener('submit', e => {
  e.preventDefault();
  const content = document.getElementById('content').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const assignee = document.getElementById('assignee').value.trim();
  if (!content) return;

  inquiries.unshift({
    id: genId(),
    content,
    contact,
    assignee,
    status: '未対応',
    createdAt: new Date().toISOString()
  });

  saveData();
  render();
  e.target.reset();
  document.getElementById('content').focus();
});

// フィルター
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    render();
  });
});

// 初期化
loadData();
render();
