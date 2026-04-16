const STORAGE_KEY = 'zaiseki_members';
const STATUSES = ['出社', '外出', '在宅', '不在'];

let members = [];

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    members = data ? JSON.parse(data) : [];
  } catch {
    members = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function setToday() {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const text = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
  document.getElementById('today').textContent = text;
}

function render() {
  renderBoard();
  renderSummary();
}

function renderSummary() {
  const summary = document.getElementById('summary');
  summary.innerHTML = '';
  if (members.length === 0) return;

  const counts = {};
  STATUSES.forEach(s => { counts[s] = 0; });
  members.forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1; });

  const colors = { '出社': '#2ecc71', '外出': '#e67e22', '在宅': '#3498db', '不在': '#95a5a6' };
  STATUSES.forEach(s => {
    if (counts[s] === 0) return;
    const div = document.createElement('div');
    div.className = 'summary-item';
    div.innerHTML = `<span class="summary-dot" style="background:${colors[s]}"></span>${s} ${counts[s]}人`;
    summary.appendChild(div);
  });
}

function renderBoard() {
  const board = document.getElementById('board');
  const empty = document.getElementById('emptyMsg');
  board.innerHTML = '';

  if (members.length === 0) {
    board.appendChild(createEmptyMsg());
    return;
  }

  members.forEach((m, idx) => {
    board.appendChild(createCard(m, idx));
  });
}

function createEmptyMsg() {
  const p = document.createElement('p');
  p.className = 'empty-msg';
  p.id = 'emptyMsg';
  p.textContent = 'メンバーを追加してください';
  return p;
}

function createCard(member, idx) {
  const card = document.createElement('div');
  card.className = `member-card status-${member.status}`;

  const top = document.createElement('div');
  top.className = 'card-top';

  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = member.name;

  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  delBtn.title = '削除';
  delBtn.addEventListener('click', () => deleteMember(idx));

  top.appendChild(name);
  top.appendChild(delBtn);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'status-buttons';

  STATUSES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'status-btn' + (member.status === s ? ` active-${s}` : '');
    btn.textContent = s;
    btn.addEventListener('click', () => changeStatus(idx, s));
    btnGroup.appendChild(btn);
  });

  const label = document.createElement('span');
  label.className = `status-label label-${member.status}`;
  label.textContent = member.status;

  card.appendChild(top);
  card.appendChild(btnGroup);
  card.appendChild(label);
  return card;
}

function addMember(name) {
  name = name.trim();
  if (!name) return;
  if (members.some(m => m.name === name)) {
    alert(`「${name}」はすでに登録されています`);
    return;
  }
  members.push({ name, status: '不在' });
  save();
  render();
}

function deleteMember(idx) {
  if (!confirm(`「${members[idx].name}」を削除しますか？`)) return;
  members.splice(idx, 1);
  save();
  render();
}

function changeStatus(idx, status) {
  members[idx].status = status;
  save();
  render();
}

document.getElementById('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('memberName');
  addMember(input.value);
  input.value = '';
  input.focus();
});

setToday();
load();
render();
