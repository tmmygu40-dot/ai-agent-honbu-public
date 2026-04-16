const STORAGE_KEY = 'shikaku_certs';
const SOON_DAYS = 30;

let certs = [];
let currentFilter = 'all';

function loadCerts() {
  const data = localStorage.getItem(STORAGE_KEY);
  certs = data ? JSON.parse(data) : [];
}

function saveCerts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

function getStatus(expDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDateStr);
  exp.setHours(0, 0, 0, 0);
  const diffMs = exp - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'expired', label: '期限切れ', days: diffDays };
  if (diffDays <= SOON_DAYS) return { status: 'soon', label: '期限間近', days: diffDays };
  return { status: 'ok', label: '有効', days: diffDays };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function getDaysText(days) {
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return '本日期限';
  return `残り${days}日`;
}

function renderSummary() {
  const expired = certs.filter(c => getStatus(c.expDate).status === 'expired').length;
  const soon = certs.filter(c => getStatus(c.expDate).status === 'soon').length;
  const ok = certs.filter(c => getStatus(c.expDate).status === 'ok').length;
  const total = certs.length;

  const summaryEl = document.getElementById('summary');
  if (total === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  summaryEl.innerHTML = `
    <div class="summary-badge badge-expired">
      <div class="count">${expired}</div>
      <div class="label">期限切れ</div>
    </div>
    <div class="summary-badge badge-soon">
      <div class="count">${soon}</div>
      <div class="label">期限間近</div>
    </div>
    <div class="summary-badge badge-ok">
      <div class="count">${ok}</div>
      <div class="label">正常</div>
    </div>
    <div class="summary-badge badge-total">
      <div class="count">${total}</div>
      <div class="label">合計</div>
    </div>
  `;
}

function renderList() {
  const listEl = document.getElementById('certList');
  const emptyMsg = document.getElementById('emptyMsg');

  let filtered = certs;
  if (currentFilter !== 'all') {
    filtered = certs.filter(c => getStatus(c.expDate).status === currentFilter);
  }

  // 期限が近い順にソート（期限切れを先に）
  filtered = [...filtered].sort((a, b) => new Date(a.expDate) - new Date(b.expDate));

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  listEl.innerHTML = filtered.map(cert => {
    const { status, label, days } = getStatus(cert.expDate);
    return `
      <div class="cert-card status-${status}">
        <div class="cert-info">
          <div class="cert-staff">${escapeHtml(cert.staffName)}</div>
          <div class="cert-name">${escapeHtml(cert.certName)}</div>
          <div class="cert-date-row">
            <span class="cert-date">有効期限：${formatDate(cert.expDate)}</span>
            <span class="cert-badge">${label}</span>
            <span class="cert-days">${getDaysText(days)}</span>
          </div>
        </div>
        <button class="delete-btn" data-id="${cert.id}" title="削除">✕</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCert(btn.dataset.id));
  });
}

function render() {
  renderSummary();
  renderList();
}

function addCert() {
  const staffName = document.getElementById('staffName').value.trim();
  const certName = document.getElementById('certName').value.trim();
  const expDate = document.getElementById('expDate').value;

  if (!staffName || !certName || !expDate) {
    alert('すべての項目を入力してください');
    return;
  }

  const cert = {
    id: Date.now().toString(),
    staffName,
    certName,
    expDate,
    createdAt: new Date().toISOString()
  };

  certs.push(cert);
  saveCerts();

  document.getElementById('staffName').value = '';
  document.getElementById('certName').value = '';
  document.getElementById('expDate').value = '';

  render();
}

function deleteCert(id) {
  if (!confirm('この資格を削除しますか？')) return;
  certs = certs.filter(c => c.id !== id);
  saveCerts();
  render();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addCert);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// Enter キーで登録
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.target.id === 'staffName' || e.target.id === 'certName' || e.target.id === 'expDate')) {
    addCert();
  }
});

// 初期化
loadCerts();
render();
