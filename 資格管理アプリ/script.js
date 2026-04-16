const STORAGE_KEY = 'shikaku_kanri_licenses';

function loadLicenses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLicenses(licenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(licenses));
}

function getDaysUntilExpiry(expiryDateStr) {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

function getStatusInfo(expiryDateStr) {
  if (!expiryDateStr) {
    return { cls: 'status-permanent', label: '無期限' };
  }
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) {
    return { cls: 'status-expired', label: '期限切れ' };
  } else if (days <= 30) {
    return { cls: 'status-danger', label: `あと${days}日` };
  } else if (days <= 90) {
    return { cls: 'status-warn', label: `あと${days}日` };
  } else {
    return { cls: 'status-ok', label: `あと${days}日` };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '―';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function sortLicenses(licenses) {
  return [...licenses].sort((a, b) => {
    // 期限切れ・期限あり → 残り日数が少ない順 → 無期限
    const dA = getDaysUntilExpiry(a.expiryDate);
    const dB = getDaysUntilExpiry(b.expiryDate);
    if (dA === null && dB === null) return a.name.localeCompare(b.name, 'ja');
    if (dA === null) return 1;
    if (dB === null) return -1;
    return dA - dB;
  });
}

function render() {
  const licenses = loadLicenses();
  const list = document.getElementById('licenseList');
  const count = document.getElementById('count');
  count.textContent = `${licenses.length}件`;

  if (licenses.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ登録されていません</p>';
    return;
  }

  const sorted = sortLicenses(licenses);
  list.innerHTML = sorted.map(lic => {
    const { cls, label } = getStatusInfo(lic.expiryDate);
    return `
      <div class="license-card ${cls}">
        <div class="license-info">
          <div class="license-name">${escapeHtml(lic.name)}</div>
          <div class="license-dates">
            取得：${formatDate(lic.acquiredDate)}　有効期限：${lic.expiryDate ? formatDate(lic.expiryDate) : '無期限'}
          </div>
          <span class="license-status">${label}</span>
        </div>
        <button class="btn-delete" onclick="deleteLicense('${lic.id}')" title="削除">×</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addLicense() {
  const name = document.getElementById('name').value.trim();
  const acquiredDate = document.getElementById('acquiredDate').value;
  const expiryDate = document.getElementById('expiryDate').value;

  if (!name) {
    alert('資格・免許名を入力してください');
    document.getElementById('name').focus();
    return;
  }

  const licenses = loadLicenses();
  licenses.push({
    id: Date.now().toString(),
    name,
    acquiredDate,
    expiryDate
  });
  saveLicenses(licenses);

  document.getElementById('name').value = '';
  document.getElementById('acquiredDate').value = '';
  document.getElementById('expiryDate').value = '';
  document.getElementById('name').focus();

  render();
}

function deleteLicense(id) {
  if (!confirm('この資格・免許を削除しますか？')) return;
  const licenses = loadLicenses().filter(l => l.id !== id);
  saveLicenses(licenses);
  render();
}

// Enterキーで登録
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'name') {
    addLicense();
  }
});

render();
