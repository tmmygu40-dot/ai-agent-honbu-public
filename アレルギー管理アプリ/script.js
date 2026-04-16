const STORAGE_KEY = 'allergy_members';

function loadMembers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function parseAllergies(str) {
  return str
    .split(/[,、，\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function addMember() {
  const nameInput = document.getElementById('memberName');
  const allergyInput = document.getElementById('allergyInput');
  const name = nameInput.value.trim();
  const allergyStr = allergyInput.value.trim();

  if (!name) {
    alert('名前を入力してください');
    return;
  }

  const members = loadMembers();
  const allergies = allergyStr ? parseAllergies(allergyStr) : [];

  members.push({ id: Date.now(), name, allergies });
  saveMembers(members);

  nameInput.value = '';
  allergyInput.value = '';
  renderMemberList();
}

function deleteMember(id) {
  const members = loadMembers().filter(m => m.id !== id);
  saveMembers(members);
  renderMemberList();
}

function checkAllergy() {
  const input = document.getElementById('checkInput').value.trim();
  const resultEl = document.getElementById('checkResult');

  if (!input) {
    resultEl.className = 'check-result';
    resultEl.innerHTML = '';
    return;
  }

  const members = loadMembers();
  const matched = members.filter(m =>
    m.allergies.some(a => a.includes(input) || input.includes(a))
  );

  if (matched.length === 0) {
    resultEl.className = 'check-result safe';
    resultEl.innerHTML = `✓ 「${escapeHtml(input)}」に対するアレルギーは登録されていません`;
  } else {
    const tags = matched.map(m =>
      `<span class="danger-member">${escapeHtml(m.name)}</span>`
    ).join('');
    resultEl.className = 'check-result danger';
    resultEl.innerHTML = `
      <div class="danger-title">⚠ 「${escapeHtml(input)}」はアレルギー対象食材です</div>
      <div>${tags}</div>
    `;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMemberList() {
  const members = loadMembers();
  const listEl = document.getElementById('memberList');

  if (members.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">まだメンバーが登録されていません</p>';
    return;
  }

  listEl.innerHTML = members.map(m => {
    const tagsHtml = m.allergies.length > 0
      ? m.allergies.map(a => `<span class="allergy-tag">${escapeHtml(a)}</span>`).join('')
      : '<span class="allergy-none">アレルギーなし</span>';
    return `
      <div class="member-card">
        <div class="member-info">
          <div class="member-name">${escapeHtml(m.name)}</div>
          <div class="allergy-tags">${tagsHtml}</div>
        </div>
        <button class="delete-btn" onclick="deleteMember(${m.id})" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

// Enterキー対応
document.getElementById('checkInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAllergy();
});
document.getElementById('memberName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('allergyInput').focus();
});
document.getElementById('allergyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember();
});

// 初期表示
renderMemberList();
