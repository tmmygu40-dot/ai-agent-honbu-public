// ===== DATA =====
const STORAGE_KEY = 'customer_memo_app';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

let customers = loadData();
let currentCustomerId = null;
let editingCustomerId = null;

// ===== UTILS =====
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

// ===== VIEWS =====
const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');

function showListView() {
  listView.classList.add('active');
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');
  detailView.classList.remove('active');
  currentCustomerId = null;
  renderList();
}

function showDetailView(id) {
  currentCustomerId = id;
  listView.classList.remove('active');
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
  detailView.classList.add('active');
  renderDetail();
}

// ===== LIST =====
function renderList() {
  const list = document.getElementById('customer-list');
  const emptyMsg = document.getElementById('empty-msg');
  list.innerHTML = '';

  if (customers.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  customers.forEach(c => {
    const card = document.createElement('div');
    card.className = 'customer-card';
    card.dataset.id = c.id;

    const actionText = c.nextAction?.content
      ? `次回: ${c.nextAction.content}${c.nextAction.date ? '（' + formatDate(c.nextAction.date) + '）' : ''}`
      : '次回アクション未設定';
    const actionClass = c.nextAction?.content ? '' : 'done';

    card.innerHTML = `
      <h3>${escapeHtml(c.name)}</h3>
      ${c.company ? `<p class="card-sub">${escapeHtml(c.company)}</p>` : ''}
      ${c.contact ? `<p class="card-sub">${escapeHtml(c.contact)}</p>` : ''}
      <p class="card-action ${actionClass}">${escapeHtml(actionText)}</p>
    `;
    card.addEventListener('click', () => showDetailView(c.id));
    list.appendChild(card);
  });
}

// ===== DETAIL =====
function getCurrentCustomer() {
  return customers.find(c => c.id === currentCustomerId);
}

function renderDetail() {
  const c = getCurrentCustomer();
  if (!c) return showListView();

  document.getElementById('detail-name').textContent = c.name;
  document.getElementById('detail-company').textContent = c.company || '';
  document.getElementById('detail-contact').textContent = c.contact || '';

  // Next action
  const display = document.getElementById('next-action-display');
  if (c.nextAction?.content) {
    const dateStr = c.nextAction.date ? `（${formatDate(c.nextAction.date)}）` : '';
    display.textContent = c.nextAction.content + dateStr;
    display.classList.remove('empty');
  } else {
    display.textContent = '未設定';
    display.classList.add('empty');
  }
  document.getElementById('next-action-input').value = c.nextAction?.content || '';
  document.getElementById('next-action-date').value = c.nextAction?.date || '';

  // History
  renderHistory(c);
}

function renderHistory(c) {
  const list = document.getElementById('history-list');
  const emptyMsg = document.getElementById('history-empty');
  list.innerHTML = '';

  const sorted = [...(c.history || [])].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  sorted.forEach(h => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-text">
        <div class="history-date">${formatDate(h.date)}</div>
        ${escapeHtml(h.content)}
      </div>
      <button class="delete-history" data-hid="${h.id}" title="削除">✕</button>
    `;
    li.querySelector('.delete-history').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistory(h.id);
    });
    list.appendChild(li);
  });
}

function deleteHistory(hid) {
  const c = getCurrentCustomer();
  if (!c) return;
  c.history = c.history.filter(h => h.id !== hid);
  saveData(customers);
  renderHistory(c);
}

// ===== MODAL =====
const modal = document.getElementById('modal');

function openModal(customer = null) {
  editingCustomerId = customer ? customer.id : null;
  document.getElementById('modal-title').textContent = customer ? '顧客編集' : '顧客追加';
  document.getElementById('input-name').value = customer ? customer.name : '';
  document.getElementById('input-company').value = customer ? customer.company : '';
  document.getElementById('input-contact').value = customer ? customer.contact : '';
  modal.classList.remove('hidden');
  document.getElementById('input-name').focus();
}

function closeModal() {
  modal.classList.add('hidden');
  editingCustomerId = null;
}

function saveModal() {
  const name = document.getElementById('input-name').value.trim();
  if (!name) {
    alert('名前を入力してください');
    return;
  }
  const company = document.getElementById('input-company').value.trim();
  const contact = document.getElementById('input-contact').value.trim();

  if (editingCustomerId) {
    const c = customers.find(c => c.id === editingCustomerId);
    if (c) {
      c.name = name;
      c.company = company;
      c.contact = contact;
    }
  } else {
    customers.push({
      id: genId(),
      name,
      company,
      contact,
      nextAction: { content: '', date: '' },
      history: []
    });
  }

  saveData(customers);
  closeModal();

  if (editingCustomerId) {
    renderDetail();
  } else {
    renderList();
  }
}

// ===== NEXT ACTION =====
function saveNextAction() {
  const c = getCurrentCustomer();
  if (!c) return;
  c.nextAction = {
    content: document.getElementById('next-action-input').value.trim(),
    date: document.getElementById('next-action-date').value
  };
  saveData(customers);
  renderDetail();
}

// ===== ADD HISTORY =====
function addHistory() {
  const c = getCurrentCustomer();
  if (!c) return;
  const date = document.getElementById('history-date').value || todayStr();
  const content = document.getElementById('history-content').value.trim();
  if (!content) {
    alert('対応内容を入力してください');
    return;
  }
  if (!c.history) c.history = [];
  c.history.push({ id: genId(), date, content });
  saveData(customers);
  document.getElementById('history-content').value = '';
  renderHistory(c);
}

// ===== DELETE CUSTOMER =====
function deleteCustomer() {
  if (!confirm('この顧客を削除しますか？')) return;
  customers = customers.filter(c => c.id !== currentCustomerId);
  saveData(customers);
  showListView();
}

// ===== ESCAPE =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== EVENT LISTENERS =====
document.getElementById('add-customer-btn').addEventListener('click', () => openModal());
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveModal);
document.getElementById('back-btn').addEventListener('click', showListView);
document.getElementById('edit-customer-btn').addEventListener('click', () => {
  openModal(getCurrentCustomer());
});
document.getElementById('delete-customer-btn').addEventListener('click', deleteCustomer);
document.getElementById('save-action-btn').addEventListener('click', saveNextAction);
document.getElementById('add-history-btn').addEventListener('click', addHistory);

// Enter key support
document.getElementById('history-content').addEventListener('keydown', e => {
  if (e.key === 'Enter') addHistory();
});
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

// Set today's date as default for history
document.getElementById('history-date').value = todayStr();

// ===== INIT =====
showListView();
