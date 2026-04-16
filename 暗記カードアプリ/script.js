'use strict';

// ── データ管理 ──
const STORAGE_KEY = 'anki_cards';
const STATS_KEY   = 'anki_stats';

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; }
  catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

let cards = loadCards();
let stats = loadStats(); // { [id]: { correct: number, total: number } }

// ── 出題 ──
let quizOrder = [];
let quizIndex = 0;
let isFlipped = false;

function buildQuizOrder() {
  quizOrder = cards.map((_, i) => i);
  shuffle(quizOrder);
  quizIndex = 0;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showCurrentCard() {
  const card = document.getElementById('card');
  const frontText = document.getElementById('front-text');
  const backText  = document.getElementById('back-text');
  const judgeBtns = document.getElementById('judge-btns');

  if (quizOrder.length === 0) return;

  const idx = quizOrder[quizIndex % quizOrder.length];
  const c = cards[idx];

  frontText.textContent = c.front;
  backText.textContent  = c.back;

  // reset flip
  card.classList.remove('flipped');
  isFlipped = false;
  judgeBtns.classList.add('hidden');
}

function flipCard() {
  if (cards.length === 0) return;
  const card = document.getElementById('card');
  isFlipped = !isFlipped;
  card.classList.toggle('flipped', isFlipped);
  document.getElementById('judge-btns').classList.toggle('hidden', !isFlipped);
}

function judgeCard(isCorrect) {
  const idx = quizOrder[quizIndex % quizOrder.length];
  const id  = cards[idx].id;

  if (!stats[id]) stats[id] = { correct: 0, total: 0 };
  stats[id].total++;
  if (isCorrect) stats[id].correct++;
  saveStats(stats);

  updateStatsBar();
  nextCard();
}

function nextCard() {
  if (quizOrder.length === 0) return;
  quizIndex++;
  if (quizIndex >= quizOrder.length) {
    shuffle(quizOrder);
    quizIndex = 0;
  }
  showCurrentCard();
}

function updateStatsBar() {
  let totalCorrect = 0, totalAttempts = 0;
  for (const s of Object.values(stats)) {
    totalCorrect  += s.correct;
    totalAttempts += s.total;
  }
  const rate = totalAttempts === 0 ? 0 : Math.round(totalCorrect / totalAttempts * 100);
  document.getElementById('rate-text').textContent    = rate + '%';
  document.getElementById('correct-count').textContent = totalCorrect;
  document.getElementById('total-count').textContent   = totalAttempts;
}

function renderQuizTab() {
  const quizEmpty = document.getElementById('quiz-empty');
  const quizArea  = document.getElementById('quiz-area');

  if (cards.length === 0) {
    quizEmpty.classList.remove('hidden');
    quizArea.classList.add('hidden');
  } else {
    quizEmpty.classList.add('hidden');
    quizArea.classList.remove('hidden');
    buildQuizOrder();
    showCurrentCard();
    updateStatsBar();
  }
}

// ── カード一覧 ──
function renderList() {
  const listEl    = document.getElementById('card-list');
  const listEmpty = document.getElementById('list-empty');

  listEl.innerHTML = '';

  if (cards.length === 0) {
    listEmpty.classList.remove('hidden');
    return;
  }
  listEmpty.classList.add('hidden');

  cards.forEach((c, i) => {
    const s = stats[c.id] || { correct: 0, total: 0 };
    const rate = s.total === 0 ? '未挑戦' : Math.round(s.correct / s.total * 100) + '%';

    const li = document.createElement('li');
    li.className = 'card-list-item';
    li.innerHTML = `
      <div class="card-list-texts">
        <div class="card-list-front">${escHtml(c.front)}</div>
        <div class="card-list-back">${escHtml(c.back)}</div>
        <div class="card-list-stats">正解率 ${rate}（正解 ${s.correct} / 挑戦 ${s.total}）</div>
      </div>
      <button class="delete-btn" title="削除" data-index="${i}">✕</button>
    `;
    listEl.appendChild(li);
  });

  listEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const id  = cards[idx].id;
      cards.splice(idx, 1);
      delete stats[id];
      saveCards(cards);
      saveStats(stats);
      renderList();
      renderQuizTab();
    });
  });
}

// ── カード追加 ──
document.getElementById('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const front = document.getElementById('input-front').value.trim();
  const back  = document.getElementById('input-back').value.trim();
  if (!front || !back) return;

  const newCard = { id: Date.now().toString(), front, back };
  cards.push(newCard);
  saveCards(cards);

  document.getElementById('input-front').value = '';
  document.getElementById('input-back').value  = '';

  const msg = document.getElementById('add-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 1800);

  renderQuizTab();
  renderList();
});

// ── 統計リセット ──
document.getElementById('reset-stats-btn').addEventListener('click', () => {
  if (!confirm('正解率のデータをリセットしますか？')) return;
  stats = {};
  saveStats(stats);
  updateStatsBar();
});

// ── タブ切り替え ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.add('hidden');
      c.classList.remove('active');
    });
    btn.classList.add('active');
    const target = document.getElementById('tab-' + btn.dataset.tab);
    target.classList.remove('hidden');
    target.classList.add('active');

    if (btn.dataset.tab === 'list')  renderList();
    if (btn.dataset.tab === 'quiz')  renderQuizTab();
  });
});

// ── ユーティリティ ──
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── 初期表示 ──
renderQuizTab();
