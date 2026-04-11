const STORAGE_KEY = 'flashcards';

let cards = loadCards();

const frontInput = document.getElementById('front-input');
const backInput = document.getElementById('back-input');
const addBtn = document.getElementById('add-btn');
const cardsContainer = document.getElementById('cards-container');
const cardCount = document.getElementById('card-count');

addBtn.addEventListener('click', addCard);

function addCard() {
  const front = frontInput.value.trim();
  const back = backInput.value.trim();

  if (!front || !back) {
    alert('表面と裏面の両方を入力してください');
    return;
  }

  const card = {
    id: Date.now(),
    front,
    back
  };

  cards.push(card);
  saveCards();
  renderCards();

  frontInput.value = '';
  backInput.value = '';
  frontInput.focus();
}

function deleteCard(id) {
  cards = cards.filter(c => c.id !== id);
  saveCards();
  renderCards();
}

function renderCards() {
  cardsContainer.innerHTML = '';
  cardCount.textContent = cards.length;

  if (cards.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = 'カードがありません。上のフォームから追加してください。';
    cardsContainer.appendChild(msg);
    return;
  }

  cards.forEach(card => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    // 表面
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    front.innerHTML = `
      <div class="card-label">表</div>
      <div class="card-text">${escapeHtml(card.front)}</div>
      <div class="card-hint">タップしてめくる</div>
    `;

    // 裏面
    const back = document.createElement('div');
    back.className = 'card-face card-back';
    back.innerHTML = `
      <div class="card-label">裏</div>
      <div class="card-text">${escapeHtml(card.back)}</div>
      <div class="card-hint">タップして戻す</div>
    `;

    // 削除ボタン（表面側に配置）
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = '削除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('このカードを削除しますか？')) {
        deleteCard(card.id);
      }
    });

    cardEl.appendChild(front);
    cardEl.appendChild(back);
    cardEl.appendChild(deleteBtn);

    // フリップ処理
    cardEl.addEventListener('click', () => {
      cardEl.classList.toggle('flipped');
    });

    wrapper.appendChild(cardEl);
    cardsContainer.appendChild(wrapper);
  });
}

function loadCards() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 初期描画
renderCards();
