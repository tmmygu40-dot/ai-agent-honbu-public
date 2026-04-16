'use strict';

const STORAGE_KEY = 'meishi_v2_cards';

let cards = [];
let searchQuery = '';

function loadCards() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    cards = data ? JSON.parse(data) : [];
  } catch {
    cards = [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getFilteredCards() {
  if (!searchQuery) return cards;
  const q = searchQuery.toLowerCase();
  return cards.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.company || '').toLowerCase().includes(q) ||
    (c.position || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
}

function escape(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderCards() {
  const list = document.getElementById('cardList');
  const countEl = document.getElementById('count');
  const filtered = getFilteredCards();

  countEl.textContent = searchQuery
    ? `${filtered.length} 件ヒット（全 ${cards.length} 件）`
    : `全 ${cards.length} 件`;

  if (filtered.length === 0) {
    list.innerHTML = `<p class="empty-msg">${cards.length === 0 ? '名刺を登録してください' : '一致する名刺が見つかりません'}</p>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="card-item">
      <button class="btn-delete" data-id="${escape(c.id)}">削除</button>
      <div class="card-name">${escape(c.name)}</div>
      ${c.company ? `<div class="card-company">${escape(c.company)}</div>` : ''}
      ${c.position ? `<div class="card-position">${escape(c.position)}</div>` : ''}
      <div class="card-details">
        ${c.phone ? `<span><span class="label">電話</span>${escape(c.phone)}</span>` : ''}
        ${c.email ? `<span><span class="label">メール</span>${escape(c.email)}</span>` : ''}
      </div>
      ${c.memo ? `<div class="card-memo">${escape(c.memo)}</div>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(btn.dataset.id));
  });
}

function addCard(data) {
  cards.unshift({ id: generateId(), ...data });
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
  const name = document.getElementById('name').value.trim();
  if (!name) return;

  addCard({
    name,
    company: document.getElementById('company').value.trim(),
    position: document.getElementById('position').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    memo: document.getElementById('memo').value.trim(),
  });

  e.target.reset();
  document.getElementById('name').focus();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderCards();
});

loadCards();
renderCards();
