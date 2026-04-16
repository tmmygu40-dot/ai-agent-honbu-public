const STORAGE_KEY = 'training_records';
const WARNING_DAYS = 30;

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getStatus(expiryDate) {
  if (!expiryDate) return 'no-expiry';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= WARNING_DAYS) return 'warning';
  return 'ok';
}

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function statusLabel(status) {
  const labels = {
    'expired': '期限切れ',
    'warning': '期限間近',
    'ok': '正常',
    'no-expiry': '無期限'
  };
  return labels[status] || '';
}

function render() {
  const records = loadRecords();
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  const filterStatus = document.getElementById('filterStatus').value;

  let counts = { expired: 0, warning: 0, ok: 0, 'no-expiry': 0 };
  records.forEach(r => {
    const s = getStatus(r.expiryDate);
    counts[s] = (counts[s] || 0) + 1;
  });

  document.getElementById('expiredCount').textContent = counts.expired || 0;
  document.getElementById('warningCount').textContent = counts.warning || 0;
  document.getElementById('okCount').textContent = counts.ok || 0;
  document.getElementById('noExpiryCount').textContent = counts['no-expiry'] || 0;

  const filtered = records.filter(r => {
    const matchSearch = !searchVal ||
      r.staffName.toLowerCase().includes(searchVal) ||
      r.trainingName.toLowerCase().includes(searchVal);

    const status = getStatus(r.expiryDate);
    const matchFilter = filterStatus === 'all' ||
      (filterStatus === 'expired' && status === 'expired') ||
      (filterStatus === 'warning' && status === 'warning') ||
      (filterStatus === 'ok' && status === 'ok') ||
      (filterStatus === 'no_expiry' && status === 'no-expiry');

    return matchSearch && matchFilter;
  });

  const listEl = document.getElementById('trainingList');

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">該当するデータがありません</p>';
    return;
  }

  // Sort: expired first, then warning, then ok, then no-expiry
  const order = { expired: 0, warning: 1, ok: 2, 'no-expiry': 3 };
  filtered.sort((a, b) => {
    const sa = getStatus(a.expiryDate);
    const sb = getStatus(b.expiryDate);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate) - new Date(b.expiryDate);
    return 0;
  });

  listEl.innerHTML = filtered.map(r => {
    const status = getStatus(r.expiryDate);
    const daysLeft = getDaysLeft(r.expiryDate);
    let daysHtml = '';
    if (daysLeft !== null) {
      if (daysLeft < 0) {
        daysHtml = `<span class="days-left">${Math.abs(daysLeft)}日経過</span>`;
      } else if (daysLeft <= WARNING_DAYS) {
        daysHtml = `<span class="days-left days-warning">残り${daysLeft}日</span>`;
      }
    }

    return `
      <div class="training-card status-${status}" data-id="${r.id}">
        <div class="card-info">
          <div class="card-names">
            <span class="card-staff">${escHtml(r.staffName)}</span>
            <span style="color:#bbb;margin:0 6px;">／</span>
            <span class="card-training">${escHtml(r.trainingName)}</span>
          </div>
          <div class="card-dates">
            受講日：${formatDate(r.trainingDate)}
            有効期限：${r.expiryDate ? formatDate(r.expiryDate) : '無期限'}
            ${daysHtml ? '　' + daysHtml : ''}
          </div>
        </div>
        <span class="card-status-badge badge-${status}">${statusLabel(status)}</span>
        <div class="card-actions">
          <button class="btn-delete" onclick="deleteRecord('${r.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addRecord() {
  const staffName = document.getElementById('staffName').value.trim();
  const trainingName = document.getElementById('trainingName').value.trim();
  const trainingDate = document.getElementById('trainingDate').value;
  const expiryDate = document.getElementById('expiryDate').value;

  if (!staffName || !trainingName || !trainingDate) {
    alert('スタッフ名・研修名・受講日は必須です');
    return;
  }

  const records = loadRecords();
  records.push({
    id: Date.now().toString(),
    staffName,
    trainingName,
    trainingDate,
    expiryDate: expiryDate || ''
  });
  saveRecords(records);

  document.getElementById('staffName').value = '';
  document.getElementById('trainingName').value = '';
  document.getElementById('trainingDate').value = '';
  document.getElementById('expiryDate').value = '';

  render();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  render();
}

document.getElementById('addBtn').addEventListener('click', addRecord);
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('filterStatus').addEventListener('change', render);

render();
