const STORAGE_KEY = 'paid_leave_staff_v1';

let staffList = [];
let currentStaffId = null;

// --- 初期化 ---
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    staffList = JSON.parse(saved);
  }
  renderStaffList();

  // 今日の日付をデフォルトにセット
  const today = toDateString(new Date());
  document.getElementById('expireDate').value = '';
  document.getElementById('recordDate').value = today;
}

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
}

// --- スタッフ追加 ---
function addStaff() {
  const name = document.getElementById('staffName').value.trim();
  const grant = parseFloat(document.getElementById('grantDays').value);
  const expire = document.getElementById('expireDate').value;

  if (!name) { alert('スタッフ名を入力してください'); return; }
  if (isNaN(grant) || grant <= 0) { alert('付与日数を正しく入力してください'); return; }
  if (!expire) { alert('有効期限を入力してください'); return; }

  const staff = {
    id: Date.now(),
    name,
    grantDays: grant,
    expireDate: expire,
    records: []
  };
  staffList.push(staff);
  save();
  renderStaffList();

  // フォームリセット
  document.getElementById('staffName').value = '';
  document.getElementById('grantDays').value = '';
  document.getElementById('expireDate').value = '';
}

// --- スタッフ削除 ---
function deleteStaff(id) {
  const staff = staffList.find(s => s.id === id);
  if (!confirm(`「${staff.name}」を削除しますか？`)) return;
  staffList = staffList.filter(s => s.id !== id);
  save();
  renderStaffList();
}

// --- 有給記録モーダル ---
function openRecordModal(id) {
  currentStaffId = id;
  const staff = staffList.find(s => s.id === id);
  document.getElementById('modalStaffName').textContent = staff.name;
  document.getElementById('recordDate').value = toDateString(new Date());
  document.getElementById('recordDays').value = '1';
  document.getElementById('recordNote').value = '';
  document.getElementById('recordModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('recordModal').classList.add('hidden');
  currentStaffId = null;
}

function saveRecord() {
  const date = document.getElementById('recordDate').value;
  const days = parseFloat(document.getElementById('recordDays').value);
  const note = document.getElementById('recordNote').value.trim();

  if (!date) { alert('取得日を入力してください'); return; }
  if (isNaN(days) || days <= 0) { alert('日数を正しく入力してください'); return; }

  const staff = staffList.find(s => s.id === currentStaffId);
  const usedDays = calcUsed(staff);
  if (usedDays + days > staff.grantDays) {
    if (!confirm(`残日数（${(staff.grantDays - usedDays).toFixed(1)}日）を超えています。記録しますか？`)) return;
  }

  staff.records.push({ id: Date.now(), date, days, note });
  staff.records.sort((a, b) => a.date.localeCompare(b.date));
  save();
  renderStaffList();
  closeModal();
}

// --- 履歴モーダル ---
function openHistoryModal(id) {
  currentStaffId = id;
  const staff = staffList.find(s => s.id === id);
  document.getElementById('historyStaffName').textContent = staff.name;
  renderHistory(staff);
  document.getElementById('historyModal').classList.remove('hidden');
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
  currentStaffId = null;
}

function renderHistory(staff) {
  const el = document.getElementById('historyList');
  if (!staff.records.length) {
    el.innerHTML = '<p class="no-history">取得記録がありません</p>';
    return;
  }
  const html = [...staff.records].reverse().map(r => `
    <div class="history-item">
      <span class="history-date">${formatDate(r.date)}</span>
      <span class="history-days">${r.days}日</span>
      <span class="history-note">${r.note || '―'}</span>
      <button class="btn-del-record" onclick="deleteRecord(${staff.id}, ${r.id})">✕</button>
    </div>
  `).join('');
  el.innerHTML = html;
}

function deleteRecord(staffId, recordId) {
  const staff = staffList.find(s => s.id === staffId);
  staff.records = staff.records.filter(r => r.id !== recordId);
  save();
  renderHistory(staff);
  renderStaffList();
}

// --- 計算ヘルパー ---
function calcUsed(staff) {
  return staff.records.reduce((sum, r) => sum + r.days, 0);
}

function calcRemain(staff) {
  return Math.max(0, staff.grantDays - calcUsed(staff));
}

function calcRate(staff) {
  if (!staff.grantDays) return 0;
  return Math.min(100, (calcUsed(staff) / staff.grantDays) * 100);
}

function getDaysLeft(expireDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expireDate);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

// --- 一覧レンダリング ---
function renderStaffList() {
  const container = document.getElementById('staffList');

  if (!staffList.length) {
    container.innerHTML = '<p class="no-staff">スタッフが登録されていません</p>';
    return;
  }

  const html = staffList.map(staff => {
    const used = calcUsed(staff);
    const remain = calcRemain(staff);
    const rate = calcRate(staff);
    const daysLeft = getDaysLeft(staff.expireDate);

    const isExpired = daysLeft < 0;
    const isWarning = daysLeft >= 0 && daysLeft <= 30;

    let cardClass = 'staff-card';
    let badgeHtml = '';
    let expireClass = 'expire-info';

    if (isExpired) {
      cardClass += ' expired';
      badgeHtml = '<span class="badge badge-expired">期限切れ</span>';
      expireClass += ' expired';
    } else if (isWarning) {
      cardClass += ' warning';
      badgeHtml = '<span class="badge badge-warning">期限間近</span>';
      expireClass += ' warning';
    } else {
      badgeHtml = '<span class="badge badge-ok">有効</span>';
    }

    const remainClass = remain === 0 ? 'danger' : (remain <= 2 ? 'warn' : '');
    const rateClass = rate >= 80 ? 'danger' : (rate >= 50 ? 'warn' : '');
    const barClass = rate >= 80 ? 'danger' : (rate >= 50 ? 'warn' : '');

    let expireText = '';
    if (isExpired) {
      expireText = `有効期限：${formatDate(staff.expireDate)}（${Math.abs(daysLeft)}日超過）`;
    } else {
      expireText = `有効期限：${formatDate(staff.expireDate)}（残り${daysLeft}日）`;
    }

    return `
      <div class="${cardClass}">
        <div class="staff-header">
          <span class="staff-name">${staff.name}</span>
          ${badgeHtml}
        </div>
        <div class="staff-stats">
          <div class="stat-item">
            <span class="stat-label">付与日数</span>
            <span class="stat-value">${staff.grantDays}日</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">取得日数</span>
            <span class="stat-value ${rateClass}">${used.toFixed(1)}日</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">残日数</span>
            <span class="stat-value ${remainClass}">${remain.toFixed(1)}日</span>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${barClass}" style="width:${rate}%"></div>
        </div>
        <div class="${expireClass}">
          消化率：${rate.toFixed(1)}%　／　${expireText}
        </div>
        <div class="staff-actions">
          <button class="btn-sm btn-record" onclick="openRecordModal(${staff.id})">＋ 取得記録</button>
          <button class="btn-sm btn-history" onclick="openHistoryModal(${staff.id})">履歴</button>
          <button class="btn-sm btn-delete" onclick="deleteStaff(${staff.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// --- モーダル外クリックで閉じる ---
document.getElementById('recordModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.getElementById('historyModal').addEventListener('click', function(e) {
  if (e.target === this) closeHistoryModal();
});

// --- 起動 ---
init();
