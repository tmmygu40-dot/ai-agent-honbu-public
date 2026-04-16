const STORAGE_KEY = 'certifications_v2';

let certs = [];

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  certs = saved ? JSON.parse(saved) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

function getDaysLeft(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

function getStatus(days) {
  if (days < 0) return 'expired';
  if (days <= 30) return 'warning';
  return 'ok';
}

function formatDate(dateStr) {
  if (!dateStr) return '―';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function render() {
  const tbody = document.getElementById('certBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const tableWrapper = document.getElementById('tableWrapper');
  const totalCount = document.getElementById('totalCount');

  // 有効期限の昇順でソート（期限切れが上）
  const sorted = [...certs].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  totalCount.textContent = `${certs.length}件`;

  if (sorted.length === 0) {
    tableWrapper.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  tableWrapper.style.display = 'block';
  emptyMsg.style.display = 'none';

  tbody.innerHTML = '';
  sorted.forEach(cert => {
    const days = getDaysLeft(cert.expiryDate);
    const status = getStatus(days);

    let daysLabel;
    if (days < 0) {
      daysLabel = `${Math.abs(days)}日超過`;
    } else if (days === 0) {
      daysLabel = '本日期限';
    } else {
      daysLabel = `残${days}日`;
    }

    const chipClass = status === 'expired' ? 'chip-expired' : status === 'warning' ? 'chip-warning' : 'chip-ok';
    const rowClass = status === 'expired' ? 'status-expired' : status === 'warning' ? 'status-warning' : 'status-ok';

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.innerHTML = `
      <td>${escapeHtml(cert.staffName)}</td>
      <td>${escapeHtml(cert.certName)}</td>
      <td>${formatDate(cert.acquiredDate)}</td>
      <td>${formatDate(cert.expiryDate)}</td>
      <td><span class="days-chip ${chipClass}">${daysLabel}</span></td>
      <td><button class="btn-delete" data-id="${cert.id}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addCert() {
  const staffName = document.getElementById('staffName').value.trim();
  const certName = document.getElementById('certName').value.trim();
  const acquiredDate = document.getElementById('acquiredDate').value;
  const expiryDate = document.getElementById('expiryDate').value;

  if (!staffName || !certName || !expiryDate) {
    alert('スタッフ名・資格名・有効期限は必須です');
    return;
  }

  certs.push({
    id: Date.now(),
    staffName,
    certName,
    acquiredDate,
    expiryDate
  });

  save();
  render();

  // フォームリセット
  document.getElementById('staffName').value = '';
  document.getElementById('certName').value = '';
  document.getElementById('acquiredDate').value = '';
  document.getElementById('expiryDate').value = '';
  document.getElementById('staffName').focus();
}

function deleteCert(id) {
  certs = certs.filter(c => c.id !== id);
  save();
  render();
}

// イベント
document.getElementById('addBtn').addEventListener('click', addCert);

document.getElementById('certBody').addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (btn) {
    const id = Number(btn.dataset.id);
    if (confirm('この資格を削除しますか？')) {
      deleteCert(id);
    }
  }
});

// Enter キーで登録
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
    addCert();
  }
});

// 初期化
load();
render();
