const STORAGE_KEY = 'pointCards';

let cards = loadCards();

const cardNameInput = document.getElementById('cardName');
const cardPointsInput = document.getElementById('cardPoints');
const cardExpiryInput = document.getElementById('cardExpiry');
const addBtn = document.getElementById('addBtn');
const cardList = document.getElementById('cardList');
const cardCountEl = document.getElementById('cardCount');

addBtn.addEventListener('click', addCard);
[cardNameInput, cardPointsInput, cardExpiryInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });
});

function addCard() {
  const name = cardNameInput.value.trim();
  const points = parseInt(cardPointsInput.value, 10);
  const expiry = cardExpiryInput.value;

  if (!name) { cardNameInput.focus(); return; }
  if (isNaN(points) || points < 0) { cardPointsInput.focus(); return; }
  if (!expiry) { cardExpiryInput.focus(); return; }

  cards.push({ id: Date.now(), name, points, expiry });
  saveCards();
  renderCards();

  cardNameInput.value = '';
  cardPointsInput.value = '';
  cardExpiryInput.value = '';
  cardNameInput.focus();
}

function deleteCard(id) {
  cards = cards.filter(c => c.id !== id);
  saveCards();
  renderCards();
}

function renderCards() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...cards].sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

  cardCountEl.textContent = sorted.length > 0 ? `${sorted.length}件` : '';

  if (sorted.length === 0) {
    cardList.innerHTML = '<p class="empty-msg">カードがまだありません</p>';
    return;
  }

  cardList.innerHTML = sorted.map(card => {
    const expiryDate = new Date(card.expiry);
    expiryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    let statusClass = '';
    let badge = '';

    if (diffDays < 0) {
      statusClass = 'expired';
      badge = '<span class="badge badge-expired">期限切れ</span>';
    } else if (diffDays <= 30) {
      statusClass = 'warning';
      badge = `<span class="badge badge-warning">残${diffDays}日</span>`;
    }

    const expiryFormatted = expiryDate.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
      <div class="card-item ${statusClass}">
        <div class="card-info">
          <div class="card-name">${escapeHtml(card.name)}</div>
          <div class="card-points">${card.points.toLocaleString()} pt</div>
          <div class="card-expiry">有効期限：${expiryFormatted}${badge}</div>
        </div>
        <button class="delete-btn" onclick="deleteCard(${card.id})" title="削除">×</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function loadCards() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

renderCards();
