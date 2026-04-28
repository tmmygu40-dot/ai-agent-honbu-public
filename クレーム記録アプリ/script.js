const STORAGE_KEY = 'claims_data';

let claims = [];

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  claims = raw ? JSON.parse(raw) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function renderList() {
  const filter = document.getElementById('filterStatus').value;
  const list = document.getElementById('claimList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countBadge = document.getElementById('countBadge');

  const filtered = filter === '全て' ? claims : claims.filter(c => c.status === filter);

  countBadge.textContent = `${filtered.length}件`;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    list.innerHTML = filtered.map(c => `
      <li class="claim-item status-${c.status}" data-id="${c.id}">
        <div class="claim-header">
          <span class="claim-content">${escapeHtml(c.content)}</span>
        </div>
        <div class="claim-meta">
          ${c.cause ? `<span class="cause-tag">${escapeHtml(c.cause)}</span>` : ''}
          <span class="status-badge badge-${c.status}">${c.status}</span>
          <span class="claim-date">${formatDate(c.date)}</span>
        </div>
        <div class="claim-actions">
          ${c.status !== '未対応' ? '' : `<button class="btn-status" onclick="changeStatus('${c.id}', '対応中')">対応中にする</button>`}
          ${c.status === '完了' ? '' : `<button class="btn-status" onclick="changeStatus('${c.id}', '完了')">完了にする</button>`}
          ${c.status !== '完了' ? '' : `<button class="btn-status" onclick="changeStatus('${c.id}', '未対応')">未対応に戻す</button>`}
          <button class="btn-delete" onclick="deleteClaim('${c.id}')">削除</button>
        </div>
      </li>
    `).join('');
  }

  renderRanking();
}

function renderRanking() {
  const rankingList = document.getElementById('rankingList');
  const causeCount = {};

  claims.forEach(c => {
    const key = c.cause.trim() || '（原因不明）';
    causeCount[key] = (causeCount[key] || 0) + 1;
  });

  const sorted = Object.entries(causeCount).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    rankingList.innerHTML = '<li class="empty-msg">データがありません</li>';
    return;
  }

  rankingList.innerHTML = sorted.slice(0, 10).map(([cause, count]) => `
    <li>${escapeHtml(cause)}<span class="rank-count">${count}件</span></li>
  `).join('');
}

function showMsg(type, text) {
  const err = document.getElementById('errorMsg');
  const suc = document.getElementById('successMsg');
  if (type === 'error') {
    err.textContent = text;
    err.style.display = 'block';
    suc.style.display = 'none';
  } else {
    suc.textContent = text;
    suc.style.display = 'block';
    err.style.display = 'none';
  }
}

function addClaim() {
  const content = document.getElementById('content').value.trim();
  const cause = document.getElementById('cause').value.trim();
  const status = document.getElementById('status').value;

  if (!content) {
    showMsg('error', 'クレーム内容を入力してください');
    return;
  }

  const claim = {
    id: Date.now().toString(),
    content,
    cause,
    status,
    date: new Date().toISOString()
  };

  claims.unshift(claim);
  save();
  clearForm();
  showMsg('success', 'クレームを登録しました');
  renderList();
}

function clearForm() {
  document.getElementById('content').value = '';
  document.getElementById('cause').value = '';
  document.getElementById('status').value = '未対応';
}

function changeStatus(id, newStatus) {
  const claim = claims.find(c => c.id === id);
  if (claim) {
    claim.status = newStatus;
    save();
    renderList();
  }
}

function deleteClaim(id) {
  if (!confirm('このクレームを削除しますか？')) return;
  claims = claims.filter(c => c.id !== id);
  save();
  renderList();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// イベント
document.getElementById('filterStatus').addEventListener('change', renderList);

// 初期化
load();
renderList();
