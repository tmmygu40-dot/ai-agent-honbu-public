const STORAGE_KEY = 'claims_v2';

let claims = [];
let filterValue = 'all';

function loadClaims() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    claims = data ? JSON.parse(data) : [];
  } catch (e) {
    claims = [];
  }
}

function saveClaims() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function getFilteredClaims() {
  if (filterValue === 'all') return claims;
  return claims.filter(c => c.status === filterValue);
}

function renderList() {
  const list = document.getElementById('claimList');
  const filtered = getFilteredClaims();
  const total = filtered.length;

  document.getElementById('totalCount').textContent = total;

  if (total === 0) {
    list.innerHTML = '<p class="empty-message">クレームが登録されていません</p>';
    return;
  }

  list.innerHTML = filtered
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(claim => `
      <div class="claim-card" onclick="openModal('${claim.id}')">
        <div class="claim-card-header">
          <span class="claim-customer">${escapeHtml(claim.customer)}</span>
          <span class="claim-date">${formatDate(claim.date)}</span>
        </div>
        <div class="claim-content">${escapeHtml(claim.content)}</div>
        <div class="claim-footer">
          <span class="status-badge status-${claim.status}">${claim.status}</span>
          <button class="btn-delete" onclick="deleteClaim(event, '${claim.id}')">削除</button>
        </div>
      </div>
    `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deleteClaim(event, id) {
  event.stopPropagation();
  if (!confirm('このクレームを削除しますか？')) return;
  claims = claims.filter(c => c.id !== id);
  saveClaims();
  renderList();
}

function openModal(id) {
  const claim = claims.find(c => c.id === id);
  if (!claim) return;

  const fields = [
    { label: '受付日', value: formatDate(claim.date) },
    { label: '顧客名', value: claim.customer },
    { label: 'クレーム内容', value: claim.content },
    { label: '原因', value: claim.cause || '（未記入）' },
    { label: '対策', value: claim.action || '（未記入）' },
    { label: 'ステータス', value: claim.status },
  ];

  document.getElementById('modalBody').innerHTML = fields
    .map(f => `
      <div class="modal-field">
        <div class="field-label">${f.label}</div>
        <div class="field-value">${escapeHtml(f.value)}</div>
      </div>
    `).join('');

  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.getElementById('claimForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const claim = {
    id: generateId(),
    date: document.getElementById('date').value,
    customer: document.getElementById('customer').value.trim(),
    content: document.getElementById('content').value.trim(),
    cause: document.getElementById('cause').value.trim(),
    action: document.getElementById('action').value.trim(),
    status: document.getElementById('status').value,
  };

  claims.push(claim);
  saveClaims();
  renderList();
  this.reset();

  // 今日の日付を再セット
  document.getElementById('date').value = getTodayStr();
});

document.getElementById('filterStatus').addEventListener('change', function() {
  filterValue = this.value;
  renderList();
});

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 初期化
loadClaims();
document.getElementById('date').value = getTodayStr();
renderList();
