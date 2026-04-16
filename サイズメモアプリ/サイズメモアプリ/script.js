// データ構造: { members: [{id, name}], sizes: [{id, memberId, category, size}] }
const STORAGE_KEY = 'sizeMemoPApp_data';

let data = { members: [], sizes: [] };
let selectedMemberId = null;

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) data = JSON.parse(saved);
  } catch (e) {
    data = { members: [], sizes: [] };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// --- メンバー ---
function renderMembers() {
  const list = document.getElementById('memberList');
  list.innerHTML = '';

  if (data.members.length === 0) {
    list.innerHTML = '<span class="empty-msg">メンバーを追加してください</span>';
    hideSizeSection();
    return;
  }

  data.members.forEach(m => {
    const tab = document.createElement('div');
    tab.className = 'member-tab' + (m.id === selectedMemberId ? ' active' : '');
    tab.innerHTML = `
      <span>${escHtml(m.name)}</span>
      <button class="del-member" title="削除" data-id="${m.id}">✕</button>
    `;
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('del-member')) return;
      selectMember(m.id);
    });
    tab.querySelector('.del-member').addEventListener('click', () => deleteMember(m.id));
    list.appendChild(tab);
  });

  if (selectedMemberId) showSizeSection();
  else hideSizeSection();
}

function selectMember(id) {
  selectedMemberId = id;
  renderMembers();
  renderSizes();
}

function addMember() {
  const input = document.getElementById('memberNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (data.members.some(m => m.name === name)) {
    alert('同じ名前のメンバーが既に存在します');
    return;
  }
  const newMember = { id: genId(), name };
  data.members.push(newMember);
  save();
  input.value = '';
  if (!selectedMemberId) selectedMemberId = newMember.id;
  renderMembers();
  renderSizes();
}

function deleteMember(id) {
  if (!confirm('このメンバーとそのサイズ情報をすべて削除しますか？')) return;
  data.members = data.members.filter(m => m.id !== id);
  data.sizes = data.sizes.filter(s => s.memberId !== id);
  if (selectedMemberId === id) {
    selectedMemberId = data.members.length > 0 ? data.members[0].id : null;
  }
  save();
  renderMembers();
  renderSizes();
}

// --- サイズ表示切替 ---
function showSizeSection() {
  const section = document.getElementById('sizeSection');
  section.style.display = '';
  const member = data.members.find(m => m.id === selectedMemberId);
  document.getElementById('sizeTitle').textContent = member ? `${member.name} のサイズ` : 'サイズ入力';
}

function hideSizeSection() {
  document.getElementById('sizeSection').style.display = 'none';
}

// --- サイズ ---
function renderSizes() {
  const list = document.getElementById('sizeList');
  list.innerHTML = '';

  if (!selectedMemberId) return;

  const memberSizes = data.sizes.filter(s => s.memberId === selectedMemberId);

  if (memberSizes.length === 0) {
    list.innerHTML = '<div class="empty-msg">サイズが登録されていません</div>';
    return;
  }

  memberSizes.forEach(s => {
    const item = document.createElement('div');
    item.className = 'size-item';
    item.innerHTML = `
      <span class="category-label">${escHtml(s.category)}</span>
      <span class="size-value">${escHtml(s.size)}</span>
      <button class="del-size" title="削除" data-id="${s.id}">🗑</button>
    `;
    item.querySelector('.del-size').addEventListener('click', () => deleteSize(s.id));
    list.appendChild(item);
  });
}

function addSize() {
  if (!selectedMemberId) return;
  const category = document.getElementById('categorySelect').value;
  const size = document.getElementById('sizeInput').value.trim();
  if (!category) { alert('カテゴリを選択してください'); return; }
  if (!size) { alert('サイズを入力してください'); return; }

  // 同じカテゴリが既にある場合は上書き確認
  const existing = data.sizes.find(s => s.memberId === selectedMemberId && s.category === category);
  if (existing) {
    if (confirm(`${category} のサイズが既に登録されています。上書きしますか？`)) {
      existing.size = size;
    } else {
      return;
    }
  } else {
    data.sizes.push({ id: genId(), memberId: selectedMemberId, category, size });
  }

  save();
  document.getElementById('categorySelect').value = '';
  document.getElementById('sizeInput').value = '';
  renderSizes();
}

function deleteSize(id) {
  data.sizes = data.sizes.filter(s => s.id !== id);
  save();
  renderSizes();
}

// --- ユーティリティ ---
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 初期化 ---
document.getElementById('addMemberBtn').addEventListener('click', addMember);
document.getElementById('memberNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });
document.getElementById('addSizeBtn').addEventListener('click', addSize);
document.getElementById('sizeInput').addEventListener('keydown', e => { if (e.key === 'Enter') addSize(); });

load();
// 最初のメンバーを選択状態にする
if (data.members.length > 0) selectedMemberId = data.members[0].id;
renderMembers();
renderSizes();
