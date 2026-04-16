'use strict';

const STORAGE_KEY = 'flashcards_v2';

// --- State ---
let cards = [];          // 全カード [{id, front, back}]
let queue = [];          // 練習キュー（カードのコピー）
let currentIndex = 0;
let correctCount = 0;
let wrongCards = [];     // 不正解カード
let isFlipped = false;
let practiceStarted = false;

// --- DOM ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const noCardsMsg = document.getElementById('no-cards-msg');
const practiceArea = document.getElementById('practice-area');
const flashcard = document.getElementById('flashcard');
const cardFrontText = document.getElementById('card-front-text');
const cardBackText = document.getElementById('card-back-text');
const progressText = document.getElementById('progress-text');
const accuracyText = document.getElementById('accuracy-text');
const judgeButtons = document.getElementById('judge-buttons');
const btnCorrect = document.getElementById('btn-correct');
const btnWrong = document.getElementById('btn-wrong');
const btnRestart = document.getElementById('btn-restart');
const btnShuffle = document.getElementById('btn-shuffle');
const finishArea = document.getElementById('finish-area');
const finishStats = document.getElementById('finish-stats');
const btnRetryWrong = document.getElementById('btn-retry-wrong');
const btnRetryAll = document.getElementById('btn-retry-all');

const inputFront = document.getElementById('input-front');
const inputBack = document.getElementById('input-back');
const btnAddCard = document.getElementById('btn-add-card');
const cardList = document.getElementById('card-list');
const cardCount = document.getElementById('card-count');
const btnClearAll = document.getElementById('btn-clear-all');

// --- Storage ---
function loadCards() {
  try {
    cards = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    cards = [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// --- Tab ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle('active', b === btn));
    tabContents.forEach(c => {
      c.classList.toggle('active', c.id === 'tab-' + target);
    });
    if (target === 'practice') renderPractice();
    if (target === 'manage') renderCardList();
  });
});

// --- カード管理 ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

btnAddCard.addEventListener('click', () => {
  const front = inputFront.value.trim();
  const back = inputBack.value.trim();
  if (!front || !back) {
    alert('表と裏の両方を入力してください。');
    return;
  }
  cards.push({ id: generateId(), front, back });
  saveCards();
  inputFront.value = '';
  inputBack.value = '';
  inputFront.focus();
  renderCardList();
});

btnClearAll.addEventListener('click', () => {
  if (!cards.length) return;
  if (!confirm('全カードを削除しますか？')) return;
  cards = [];
  saveCards();
  renderCardList();
});

function deleteCard(id) {
  cards = cards.filter(c => c.id !== id);
  saveCards();
  renderCardList();
}

function renderCardList() {
  cardCount.textContent = `（${cards.length}枚）`;
  cardList.innerHTML = '';
  if (!cards.length) {
    cardList.innerHTML = '<li style="color:#9ca3af;font-size:0.9rem;padding:10px 0;">まだカードがありません</li>';
    return;
  }
  cards.forEach(card => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="card-list-texts">
        <div class="card-list-front">${escHtml(card.front)}</div>
        <div class="card-list-back">${escHtml(card.back)}</div>
      </div>
      <button class="btn-delete" aria-label="削除">✕</button>
    `;
    li.querySelector('.btn-delete').addEventListener('click', () => deleteCard(card.id));
    cardList.appendChild(li);
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- 練習 ---
function renderPractice() {
  if (!cards.length) {
    noCardsMsg.classList.remove('hidden');
    practiceArea.classList.add('hidden');
    return;
  }
  noCardsMsg.classList.add('hidden');
  practiceArea.classList.remove('hidden');

  if (!practiceStarted) {
    startSession([...cards]);
  }
}

function startSession(cardSet) {
  queue = cardSet.map(c => ({ ...c }));
  currentIndex = 0;
  correctCount = 0;
  wrongCards = [];
  practiceStarted = true;
  finishArea.classList.add('hidden');
  judgeButtons.classList.remove('hidden');
  showCurrentCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showCurrentCard() {
  if (currentIndex >= queue.length) {
    showFinish();
    return;
  }
  const card = queue[currentIndex];
  cardFrontText.textContent = card.front;
  cardBackText.textContent = card.back;
  flashcard.classList.remove('flipped');
  isFlipped = false;
  updateStats();
}

function updateStats() {
  progressText.textContent = `${currentIndex} / ${queue.length}`;
  const tried = currentIndex;
  const pct = tried === 0 ? 0 : Math.round((correctCount / tried) * 100);
  accuracyText.textContent = `正解率: ${pct}%`;
}

function showFinish() {
  judgeButtons.classList.add('hidden');
  finishArea.classList.remove('hidden');
  const total = queue.length;
  const pct = Math.round((correctCount / total) * 100);
  finishStats.textContent = `${total}枚中 ${correctCount}枚正解（正解率 ${pct}%）`;
  btnRetryWrong.disabled = wrongCards.length === 0;
  btnRetryWrong.style.opacity = wrongCards.length === 0 ? '0.5' : '1';
}

// カードめくり
flashcard.addEventListener('click', () => {
  flashcard.classList.toggle('flipped');
  isFlipped = !isFlipped;
});

// 正解
btnCorrect.addEventListener('click', () => {
  correctCount++;
  currentIndex++;
  showCurrentCard();
});

// 不正解
btnWrong.addEventListener('click', () => {
  wrongCards.push({ ...queue[currentIndex] });
  currentIndex++;
  showCurrentCard();
});

// 最初からやり直す
btnRestart.addEventListener('click', () => {
  startSession([...cards]);
});

// シャッフル
btnShuffle.addEventListener('click', () => {
  startSession(shuffle([...cards]));
});

// 不正解のみ再挑戦
btnRetryWrong.addEventListener('click', () => {
  if (!wrongCards.length) return;
  startSession([...wrongCards]);
});

// 全て最初から
btnRetryAll.addEventListener('click', () => {
  startSession([...cards]);
});

// --- 初期化 ---
loadCards();
renderCardList();
renderPractice();
