// --- データ管理 ---
const STORAGE_STAFF = 'kairan_staff';
const STORAGE_NOTICES = 'kairan_notices';

function loadStaff() {
  return JSON.parse(localStorage.getItem(STORAGE_STAFF) || '[]');
}

function saveStaff(list) {
  localStorage.setItem(STORAGE_STAFF, JSON.stringify(list));
}

function loadNotices() {
  return JSON.parse(localStorage.getItem(STORAGE_NOTICES) || '[]');
}

function saveNotices(list) {
  localStorage.setItem(STORAGE_NOTICES, JSON.stringify(list));
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

// --- スタッフ管理 ---
function renderStaffList() {
  const staff = loadStaff();
  const container = document.getElementById('staff-list');
  if (staff.length === 0) {
    container.innerHTML = '<p class="empty-msg">スタッフが登録されていません</p>';
    return;
  }
  container.innerHTML = staff.map((s, i) => `
    <div class="staff-item">
      <span class="staff-item-name">${escHtml(s.name)}</span>
      <button class="btn btn-danger" onclick="deleteStaff(${i})">削除</button>
    </div>
  `).join('');
}

function addStaff() {
  const input = document.getElementById('staff-name');
  const name = input.value.trim();
  if (!name) { alert('スタッフ名を入力してください'); return; }

  const staff = loadStaff();
  if (staff.some(s => s.name === name)) { alert('同じ名前のスタッフが既に登録されています'); return; }

  // 既存の連絡事項にこのスタッフの確認欄を追加
  const notices = loadNotices();
  notices.forEach(n => {
    if (!n.checks[name]) {
      n.checks[name] = { checked: false, checkedAt: null };
    }
  });
  saveNotices(notices);

  staff.push({ name, addedAt: new Date().toISOString() });
  saveStaff(staff);
  input.value = '';
  renderStaffList();
  renderNoticesList();
}

function deleteStaff(idx) {
  const staff = loadStaff();
  const name = staff[idx].name;
  if (!confirm(`「${name}」を削除しますか？\n関連する確認データも削除されます。`)) return;

  // 連絡事項の確認データからも削除
  const notices = loadNotices();
  notices.forEach(n => { delete n.checks[name]; });
  saveNotices(notices);

  staff.splice(idx, 1);
  saveStaff(staff);
  renderStaffList();
  renderNoticesList();
}

// --- 連絡事項 ---
function renderNoticesList() {
  const notices = loadNotices();
  const staff = loadStaff();
  const container = document.getElementById('notices-list');

  if (notices.length === 0) {
    container.innerHTML = '<p class="empty-msg">連絡事項がありません</p>';
    return;
  }

  container.innerHTML = notices.map((n, i) => {
    const staffNames = staff.map(s => s.name);
    const checkedCount = staffNames.filter(name => n.checks[name] && n.checks[name].checked).length;
    const totalCount = staffNames.length;
    const allChecked = totalCount > 0 && checkedCount === totalCount;

    const badgeClass = allChecked ? 'badge-green' : 'badge-red';
    const badgeText = allChecked ? '全員確認済み' : `未確認 ${totalCount - checkedCount}名`;

    const checkRows = staffNames.length > 0
      ? staffNames.map(name => {
          const check = n.checks[name] || { checked: false, checkedAt: null };
          const checkedAtText = check.checked && check.checkedAt
            ? `<span class="checked-stamp">✓ ${formatDate(check.checkedAt)}</span>`
            : '';
          return `
            <div class="staff-check-row">
              <label class="check-label">
                <input type="checkbox" ${check.checked ? 'checked' : ''}
                  onchange="toggleCheck(${i}, '${escAttr(name)}', this.checked)">
                <span class="staff-name-text">${escHtml(name)}</span>
              </label>
              ${checkedAtText}
            </div>
          `;
        }).join('')
      : '<p style="font-size:0.85rem;color:#aaa;">スタッフが未登録です</p>';

    return `
      <div class="notice-card">
        <div class="notice-header">
          <span class="notice-title">${escHtml(n.title)}</span>
          <span class="notice-date">${formatDate(n.createdAt)}</span>
        </div>
        <div class="notice-body">${escHtml(n.body)}</div>
        <div class="notice-footer">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <button class="btn btn-danger" onclick="deleteNotice(${i})">削除</button>
        </div>
        <div class="staff-checks">
          ${checkRows}
        </div>
      </div>
    `;
  }).join('');
}

function addNotice() {
  const titleEl = document.getElementById('notice-title');
  const bodyEl = document.getElementById('notice-body');
  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();
  if (!title) { alert('タイトルを入力してください'); return; }

  const staff = loadStaff();
  const checks = {};
  staff.forEach(s => { checks[s.name] = { checked: false, checkedAt: null }; });

  const notices = loadNotices();
  notices.unshift({ title, body, createdAt: new Date().toISOString(), checks });
  saveNotices(notices);

  titleEl.value = '';
  bodyEl.value = '';
  renderNoticesList();
}

function deleteNotice(idx) {
  const notices = loadNotices();
  if (!confirm(`「${notices[idx].title}」を削除しますか？`)) return;
  notices.splice(idx, 1);
  saveNotices(notices);
  renderNoticesList();
}

function toggleCheck(noticeIdx, staffName, checked) {
  const notices = loadNotices();
  if (!notices[noticeIdx].checks[staffName]) {
    notices[noticeIdx].checks[staffName] = { checked: false, checkedAt: null };
  }
  notices[noticeIdx].checks[staffName].checked = checked;
  notices[noticeIdx].checks[staffName].checkedAt = checked ? new Date().toISOString() : null;
  saveNotices(notices);
  renderNoticesList();
}

// --- ユーティリティ ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}

// --- タブ切り替え ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// --- イベント ---
document.getElementById('add-staff-btn').addEventListener('click', addStaff);
document.getElementById('staff-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addStaff();
});

document.getElementById('add-notice-btn').addEventListener('click', addNotice);
document.getElementById('notice-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('notice-body').focus();
  }
});

// --- 初期描画 ---
renderStaffList();
renderNoticesList();
