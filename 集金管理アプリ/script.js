// ---- State ----
let state = {
  month: '',
  members: [], // { id, name, paid }
};

let currentFilter = 'all';

// ---- LocalStorage ----
function saveState() {
  localStorage.setItem('shukin_state', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('shukin_state');
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch (e) {
      state = { month: '', members: [] };
    }
  }
}

// ---- Render ----
function render() {
  // 対象月
  const monthEl = document.getElementById('currentMonth');
  monthEl.textContent = state.month ? `対象月：${state.month}` : '';

  // フィルタリング
  let visible = state.members;
  if (currentFilter === 'paid') visible = state.members.filter(m => m.paid);
  if (currentFilter === 'unpaid') visible = state.members.filter(m => !m.paid);

  // 集計
  const total = state.members.length;
  const paid = state.members.filter(m => m.paid).length;
  const unpaid = total - paid;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('paidCount').textContent = paid;
  document.getElementById('unpaidCount').textContent = unpaid;

  // 会員リスト
  const list = document.getElementById('memberList');
  list.innerHTML = '';

  if (visible.length === 0) {
    list.innerHTML = `<p class="empty-msg">${
      currentFilter === 'all' ? '会員が登録されていません' :
      currentFilter === 'paid' ? '済みの会員はいません' : '未回収の会員はいません'
    }</p>`;
  } else {
    visible.forEach(member => {
      const item = document.createElement('div');
      item.className = `member-item ${member.paid ? 'paid' : 'unpaid'}`;
      item.dataset.id = member.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'member-name';
      nameSpan.textContent = member.name;

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-btn';
      toggleBtn.textContent = member.paid ? '済み' : '未回収';
      toggleBtn.addEventListener('click', () => togglePaid(member.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '✕';
      delBtn.title = '削除';
      delBtn.addEventListener('click', () => deleteMember(member.id));

      item.appendChild(nameSpan);
      item.appendChild(toggleBtn);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  // 未回収一覧セクション
  const unpaidMembers = state.members.filter(m => !m.paid);
  const unpaidSection = document.getElementById('unpaidSection');
  const unpaidList = document.getElementById('unpaidList');

  if (unpaidMembers.length > 0) {
    unpaidSection.style.display = '';
    unpaidList.innerHTML = '';
    unpaidMembers.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m.name;
      unpaidList.appendChild(li);
    });
  } else {
    unpaidSection.style.display = 'none';
  }
}

// ---- Actions ----
function setMonth() {
  const val = document.getElementById('monthInput').value.trim();
  if (!val) return;
  state.month = val;
  saveState();
  render();
}

function addMember() {
  const input = document.getElementById('memberName');
  const name = input.value.trim();
  if (!name) return;

  // 重複チェック
  if (state.members.some(m => m.name === name)) {
    alert(`「${name}」はすでに登録されています`);
    return;
  }

  state.members.push({
    id: Date.now(),
    name,
    paid: false,
  });
  input.value = '';
  saveState();
  render();
}

function togglePaid(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  member.paid = !member.paid;
  saveState();
  render();
}

function deleteMember(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  if (!confirm(`「${member.name}」を削除しますか？`)) return;
  state.members = state.members.filter(m => m.id !== id);
  saveState();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

// ---- Event Listeners ----
document.getElementById('setMonthBtn').addEventListener('click', setMonth);
document.getElementById('monthInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') setMonth();
});

document.getElementById('addMemberBtn').addEventListener('click', addMember);
document.getElementById('memberName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// ---- Init ----
loadState();
render();

// 月入力フィールドに現在の月をセット
if (!state.month) {
  const now = new Date();
  document.getElementById('monthInput').value = `${now.getFullYear()}年${now.getMonth() + 1}月`;
}
