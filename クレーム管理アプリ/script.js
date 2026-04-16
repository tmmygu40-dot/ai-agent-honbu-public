const STORAGE_KEY = 'claims_data';

let claims = [];
let currentFilter = 'all';

// ページ読み込み時
document.addEventListener('DOMContentLoaded', () => {
  loadClaims();
  setDefaultDate();
  renderAll();

  document.getElementById('claimForm').addEventListener('submit', handleAdd);
  document.getElementById('filterStatus').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderList();
  });
  document.getElementById('editForm').addEventListener('submit', handleEditSave);
  document.getElementById('cancelEdit').addEventListener('click', closeModal);
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) closeModal();
  });
});

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
}

function loadClaims() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    claims = saved ? JSON.parse(saved) : [];
  } catch {
    claims = [];
  }
}

function saveClaims() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function handleAdd(e) {
  e.preventDefault();
  const claim = {
    id: generateId(),
    date: document.getElementById('date').value,
    customer: document.getElementById('customer').value.trim(),
    content: document.getElementById('content').value.trim(),
    status: document.getElementById('status').value,
    assignee: document.getElementById('assignee').value.trim(),
    memo: document.getElementById('memo').value.trim(),
    createdAt: new Date().toISOString()
  };
  claims.unshift(claim);
  saveClaims();
  renderAll();
  e.target.reset();
  setDefaultDate();
}

function deleteClam(id) {
  if (!confirm('このクレームを削除しますか？')) return;
  claims = claims.filter(c => c.id !== id);
  saveClaims();
  renderAll();
}

function changeStatus(id, newStatus) {
  const claim = claims.find(c => c.id === id);
  if (claim) {
    claim.status = newStatus;
    saveClaims();
    renderAll();
  }
}

function openEdit(id) {
  const claim = claims.find(c => c.id === id);
  if (!claim) return;
  document.getElementById('editId').value = claim.id;
  document.getElementById('editDate').value = claim.date;
  document.getElementById('editCustomer').value = claim.customer;
  document.getElementById('editContent').value = claim.content;
  document.getElementById('editStatus').value = claim.status;
  document.getElementById('editAssignee').value = claim.assignee;
  document.getElementById('editMemo').value = claim.memo;
  document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
}

function handleEditSave(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const claim = claims.find(c => c.id === id);
  if (!claim) return;
  claim.date = document.getElementById('editDate').value;
  claim.customer = document.getElementById('editCustomer').value.trim();
  claim.content = document.getElementById('editContent').value.trim();
  claim.status = document.getElementById('editStatus').value;
  claim.assignee = document.getElementById('editAssignee').value.trim();
  claim.memo = document.getElementById('editMemo').value.trim();
  saveClaims();
  renderAll();
  closeModal();
}

function renderAll() {
  renderStats();
  renderList();
}

function renderStats() {
  const total = claims.length;
  const unhandled = claims.filter(c => c.status === '未対応').length;
  const inprogress = claims.filter(c => c.status === '対応中').length;
  const done = claims.filter(c => c.status === '完了').length;

  document.getElementById('stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${total}</div>
      <div class="stat-label">合計</div>
    </div>
    <div class="stat-card unhandled">
      <div class="stat-num">${unhandled}</div>
      <div class="stat-label">未対応</div>
    </div>
    <div class="stat-card inprogress">
      <div class="stat-num">${inprogress}</div>
      <div class="stat-label">対応中</div>
    </div>
    <div class="stat-card done">
      <div class="stat-num">${done}</div>
      <div class="stat-label">完了</div>
    </div>
  `;
}

function renderList() {
  const filtered = currentFilter === 'all'
    ? claims
    : claims.filter(c => c.status === currentFilter);

  const listEl = document.getElementById('claimList');
  const countEl = document.getElementById('claimCount');
  countEl.textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">クレームはありません</p>';
    return;
  }

  listEl.innerHTML = filtered.map(c => createCardHTML(c)).join('');
}

function createCardHTML(c) {
  const statusButtons = ['未対応', '対応中', '完了']
    .filter(s => s !== c.status)
    .map(s => `<button class="btn-status" onclick="changeStatus('${c.id}', '${s}')">${s}に変更</button>`)
    .join('');

  const memoHtml = c.memo
    ? `<div class="claim-memo">📝 ${escapeHtml(c.memo)}</div>`
    : '';

  const customerHtml = c.customer
    ? `<span class="claim-customer">${escapeHtml(c.customer)}</span>`
    : '';

  return `
    <div class="claim-card status-${c.status}">
      <div class="claim-top">
        <div>
          <span class="claim-date">${c.date}</span>
          ${customerHtml ? ' ' + customerHtml : ''}
        </div>
        <span class="status-badge badge-${c.status}">${c.status}</span>
      </div>
      <div class="claim-content">${escapeHtml(c.content)}</div>
      <div class="claim-meta">
        <span>👤 担当：${escapeHtml(c.assignee)}</span>
        <span>🕐 登録：${formatDate(c.createdAt)}</span>
      </div>
      ${memoHtml}
      <div class="claim-actions">
        ${statusButtons}
        <button class="btn-edit" onclick="openEdit('${c.id}')">編集</button>
        <button class="btn-delete" onclick="deleteClam('${c.id}')">削除</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch {
    return '';
  }
}
