const STORAGE_KEY = 'meishi_cards';

let cards = [];

function loadCards() {
  const raw = localStorage.getItem(STORAGE_KEY);
  cards = raw ? JSON.parse(raw) : [];
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function renderCards() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const list = document.getElementById('cardList');
  const countEl = document.getElementById('count');

  const filtered = cards.filter(c => {
    const text = [c.company, c.name, c.phone, c.memo].join(' ').toLowerCase();
    return !query || text.includes(query);
  });

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty">名刺が見つかりません</p>';
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="card" data-id="${c.id}">
      <div class="card-company">${escape(c.company)}</div>
      <div class="card-name">${escape(c.name)}</div>
      ${c.phone ? `<div class="card-phone"><a href="tel:${escape(c.phone)}">${escape(c.phone)}</a></div>` : ''}
      ${c.memo ? `<div class="card-memo">${escape(c.memo)}</div>` : ''}
      <button class="btn-delete" data-id="${c.id}">削除</button>
    </div>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(btn.dataset.id));
  });
}

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addCard(company, name, phone, memo) {
  const card = {
    id: Date.now().toString(),
    company,
    name,
    phone,
    memo,
    createdAt: new Date().toISOString()
  };
  cards.unshift(card);
  saveCards();
  renderCards();
}

function deleteCard(id) {
  if (!confirm('この名刺を削除しますか？')) return;
  cards = cards.filter(c => c.id !== id);
  saveCards();
  renderCards();
}

document.getElementById('cardForm').addEventListener('submit', e => {
  e.preventDefault();
  const company = document.getElementById('company').value.trim();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const memo = document.getElementById('memo').value.trim();

  if (!company || !name) return;

  addCard(company, name, phone, memo);
  e.target.reset();
  document.getElementById('company').focus();
});

document.getElementById('searchInput').addEventListener('input', renderCards);

loadCards();
renderCards();
