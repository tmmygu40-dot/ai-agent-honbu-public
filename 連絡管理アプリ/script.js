const STORAGE_KEY = 'contacts_v1';
let contacts = [];
let editingId = null;
let currentFilter = 'all';

function loadContacts() {
  const data = localStorage.getItem(STORAGE_KEY);
  contacts = data ? JSON.parse(data) : [];
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function getDaysAgo(dateStr) {
  const last = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  return Math.floor((today - last) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function submitForm() {
  const name = document.getElementById('name').value.trim();
  const relation = document.getElementById('relation').value;
  const lastContact = document.getElementById('last-contact').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) { alert('名前を入力してください'); return; }
  if (!lastContact) { alert('最終連絡日を入力してください'); return; }

  if (editingId !== null) {
    const idx = contacts.findIndex(c => c.id === editingId);
    if (idx !== -1) {
      contacts[idx] = { ...contacts[idx], name, relation, lastContact, memo };
    }
    editingId = null;
    document.getElementById('form-title').textContent = '新しい連絡先を追加';
    document.getElementById('submit-btn').textContent = '追加する';
    document.getElementById('cancel-btn').style.display = 'none';
  } else {
    contacts.push({
      id: Date.now(),
      name,
      relation,
      lastContact,
      memo
    });
  }

  saveContacts();
  clearForm();
  renderList();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('form-title').textContent = '新しい連絡先を追加';
  document.getElementById('submit-btn').textContent = '追加する';
  document.getElementById('cancel-btn').style.display = 'none';
  clearForm();
}

function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('relation').value = '友人';
  document.getElementById('last-contact').value = '';
  document.getElementById('memo').value = '';
}

function deleteContact(id) {
  if (!confirm('この連絡先を削除しますか？')) return;
  contacts = contacts.filter(c => c.id !== id);
  saveContacts();
  renderList();
}

function updateToday(id) {
  const idx = contacts.findIndex(c => c.id === id);
  if (idx !== -1) {
    contacts[idx].lastContact = todayStr();
    saveContacts();
    renderList();
  }
}

function startEdit(id) {
  const c = contacts.find(c => c.id === id);
  if (!c) return;
  editingId = id;
  document.getElementById('name').value = c.name;
  document.getElementById('relation').value = c.relation;
  document.getElementById('last-contact').value = c.lastContact;
  document.getElementById('memo').value = c.memo || '';
  document.getElementById('form-title').textContent = '連絡先を編集';
  document.getElementById('submit-btn').textContent = '更新する';
  document.getElementById('cancel-btn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderList() {
  const list = document.getElementById('contact-list');
  const emptyMsg = document.getElementById('empty-msg');

  let filtered = contacts.slice();
  if (currentFilter !== 'all') {
    filtered = filtered.filter(c => c.relation === currentFilter);
  }

  // 経過日数の多い順にソート
  filtered.sort((a, b) => getDaysAgo(b.lastContact) - getDaysAgo(a.lastContact));

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  list.innerHTML = filtered.map(c => {
    const days = getDaysAgo(c.lastContact);
    let cardClass = '';
    let daysClass = 'days-ok';
    let daysLabel = '';

    if (days >= 60) {
      cardClass = 'danger';
      daysClass = 'days-danger';
      daysLabel = '⚠️ ';
    } else if (days >= 30) {
      cardClass = 'warn';
      daysClass = 'days-warn';
      daysLabel = '！ ';
    }

    const daysText = days === 0 ? '今日連絡済み' : `${daysLabel}${days}日前`;
    const memoHtml = c.memo ? `<div class="contact-memo">📝 ${escHtml(c.memo)}</div>` : '';

    return `
      <div class="contact-card ${cardClass}">
        <div class="contact-header">
          <span class="contact-name">${escHtml(c.name)}</span>
          <span class="contact-relation">${escHtml(c.relation)}</span>
        </div>
        <div class="contact-days ${daysClass}">${daysText}</div>
        <div class="contact-date">最終連絡：${formatDate(c.lastContact)}</div>
        ${memoHtml}
        <div class="contact-actions">
          <button class="btn-today" onclick="updateToday(${c.id})">今日連絡した</button>
          <button class="btn-edit" onclick="startEdit(${c.id})">編集</button>
          <button class="btn-delete" onclick="deleteContact(${c.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 初期化
document.getElementById('last-contact').value = todayStr();
loadContacts();
renderList();
