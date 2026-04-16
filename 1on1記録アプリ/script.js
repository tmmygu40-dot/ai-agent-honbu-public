// --- データ ---
let members = JSON.parse(localStorage.getItem('1on1_members') || '[]');
let records = JSON.parse(localStorage.getItem('1on1_records') || '[]');

function saveData() {
  localStorage.setItem('1on1_members', JSON.stringify(members));
  localStorage.setItem('1on1_records', JSON.stringify(records));
}

// --- 部下リスト描画 ---
function renderMembers() {
  const ul = document.getElementById('member-list');
  ul.innerHTML = '';
  members.forEach((name, idx) => {
    const li = document.createElement('li');
    li.className = 'member-tag';
    li.innerHTML = `<span>${escHtml(name)}</span>
      <button class="del-btn" data-idx="${idx}" title="削除">×</button>`;
    ul.appendChild(li);
  });

  // セレクトを更新
  updateMemberSelects();
}

function updateMemberSelects() {
  ['record-member-select', 'filter-member'].forEach(id => {
    const sel = document.getElementById(id);
    const prev = sel.value;
    // 記録用
    if (id === 'record-member-select') {
      sel.innerHTML = '<option value="">-- 選んでください --</option>';
    } else {
      sel.innerHTML = '<option value="">全員</option>';
    }
    members.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    if (members.includes(prev)) sel.value = prev;
  });
}

// --- 部下追加 ---
document.getElementById('add-member-btn').addEventListener('click', () => {
  const input = document.getElementById('member-input');
  const name = input.value.trim();
  if (!name) return;
  if (members.includes(name)) {
    alert('同じ名前がすでに登録されています');
    return;
  }
  members.push(name);
  saveData();
  renderMembers();
  input.value = '';
});

document.getElementById('member-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-member-btn').click();
});

// 部下削除
document.getElementById('member-list').addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx);
  const name = members[idx];
  if (!confirm(`「${name}」を削除しますか？\n（面談記録は残ります）`)) return;
  members.splice(idx, 1);
  saveData();
  renderMembers();
  renderHistory();
});

// --- 今日の日付をセット ---
function setTodayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('record-date').value = `${yyyy}-${mm}-${dd}`;
}

// --- 面談記録追加 ---
document.getElementById('add-record-btn').addEventListener('click', () => {
  const member = document.getElementById('record-member-select').value;
  const date = document.getElementById('record-date').value;
  const content = document.getElementById('record-content').value.trim();
  const action = document.getElementById('record-action').value.trim();

  if (!member) { alert('部下を選んでください'); return; }
  if (!date) { alert('面談日を入力してください'); return; }
  if (!content) { alert('面談内容を入力してください'); return; }

  const record = {
    id: Date.now(),
    member,
    date,
    content,
    action,
    actionDone: false
  };
  records.unshift(record);
  saveData();
  renderHistory();

  document.getElementById('record-content').value = '';
  document.getElementById('record-action').value = '';
  setTodayDate();
  alert('記録しました');
});

// --- 履歴描画 ---
function renderHistory() {
  const filterMember = document.getElementById('filter-member').value;
  const container = document.getElementById('history-list');

  const filtered = filterMember
    ? records.filter(r => r.member === filterMember)
    : records;

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">面談記録はまだありません</p>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="record-card">
      <div class="record-header">
        <div class="record-meta">
          <span class="record-member">${escHtml(r.member)}</span>
          <span class="record-date">${formatDate(r.date)}</span>
        </div>
        <button class="del-record-btn" data-id="${r.id}" title="削除">🗑</button>
      </div>
      <div class="record-section-label">面談内容</div>
      <div class="record-text">${escHtml(r.content)}</div>
      ${r.action ? `
        <div class="record-section-label">次回アクション</div>
        <div class="action-box ${r.actionDone ? 'action-done' : ''}">
          <div class="action-row">
            <input type="checkbox" class="action-check" data-id="${r.id}" ${r.actionDone ? 'checked' : ''}>
            <span class="action-text ${r.actionDone ? 'done-text' : ''}">${escHtml(r.action)}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// 削除
document.getElementById('history-list').addEventListener('click', e => {
  const btn = e.target.closest('.del-record-btn');
  if (!btn) return;
  if (!confirm('この記録を削除しますか？')) return;
  const id = parseInt(btn.dataset.id);
  records = records.filter(r => r.id !== id);
  saveData();
  renderHistory();
});

// アクション完了チェック
document.getElementById('history-list').addEventListener('change', e => {
  const chk = e.target.closest('.action-check');
  if (!chk) return;
  const id = parseInt(chk.dataset.id);
  const rec = records.find(r => r.id === id);
  if (rec) {
    rec.actionDone = chk.checked;
    saveData();
    renderHistory();
  }
});

// 絞り込み
document.getElementById('filter-member').addEventListener('change', renderHistory);

// --- ユーティリティ ---
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// --- 初期化 ---
setTodayDate();
renderMembers();
renderHistory();
