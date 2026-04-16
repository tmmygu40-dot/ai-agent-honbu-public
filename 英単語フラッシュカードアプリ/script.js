// ─── データ管理 ───────────────────────────────────────
const STORAGE_KEY = 'flashcard_words';
const SCORE_KEY   = 'flashcard_score';

function loadWords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function loadScore() {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || { correct: 0, total: 0 }; }
  catch { return { correct: 0, total: 0 }; }
}

function saveScore(score) {
  localStorage.setItem(SCORE_KEY, JSON.stringify(score));
}

// ─── 状態 ─────────────────────────────────────────────
let words   = loadWords();
let score   = loadScore();
let current = null;   // 現在表示中の単語オブジェクト
let flipped = false;  // カードが裏返っているか

// ─── DOM参照 ──────────────────────────────────────────
const tabs        = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const cardInner   = document.getElementById('card-inner');
const cardWord    = document.getElementById('card-word');
const cardMeaning = document.getElementById('card-meaning');
const btnNext     = document.getElementById('btn-next');
const btnCorrect  = document.getElementById('btn-correct');
const btnWrong    = document.getElementById('btn-wrong');
const scoreRate   = document.getElementById('score-rate');
const scoreCorrect= document.getElementById('score-correct');
const scoreTotal  = document.getElementById('score-total');
const btnResetScore = document.getElementById('reset-score');
const quizEmpty   = document.getElementById('quiz-empty');
const quizArea    = document.getElementById('quiz-area');

const wordForm    = document.getElementById('word-form');
const inputWord   = document.getElementById('input-word');
const inputMeaning= document.getElementById('input-meaning');
const wordList    = document.getElementById('word-list');
const wordListEmpty = document.getElementById('word-list-empty');

// ─── タブ切り替え ─────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── スコア表示更新 ────────────────────────────────────
function updateScoreDisplay() {
  scoreCorrect.textContent = score.correct;
  scoreTotal.textContent   = score.total;
  scoreRate.textContent    = score.total === 0
    ? '-%'
    : Math.round(score.correct / score.total * 100) + '%';
}

btnResetScore.addEventListener('click', () => {
  score = { correct: 0, total: 0 };
  saveScore(score);
  updateScoreDisplay();
});

// ─── クイズ ───────────────────────────────────────────
function showNextCard() {
  if (words.length === 0) {
    quizArea.style.display = 'none';
    quizEmpty.style.display = 'block';
    return;
  }
  quizArea.style.display = 'block';
  quizEmpty.style.display = 'none';

  // ランダム選択（連続同じ単語を避ける）
  let pool = words.length > 1 ? words.filter(w => w !== current) : words;
  current = pool[Math.floor(Math.random() * pool.length)];

  cardWord.textContent    = current.word;
  cardMeaning.textContent = current.meaning;

  // カードを表面に戻す
  flipped = false;
  cardInner.classList.remove('flipped');

  btnCorrect.style.display = 'none';
  btnWrong.style.display   = 'none';
  btnNext.style.display    = 'inline-flex';
}

// カードをクリックでめくる
document.getElementById('flashcard').addEventListener('click', () => {
  if (!current) return;
  flipped = !flipped;
  cardInner.classList.toggle('flipped', flipped);
  if (flipped) {
    btnCorrect.style.display = 'inline-flex';
    btnWrong.style.display   = 'inline-flex';
    btnNext.style.display    = 'none';
  } else {
    btnCorrect.style.display = 'none';
    btnWrong.style.display   = 'none';
    btnNext.style.display    = 'inline-flex';
  }
});

btnNext.addEventListener('click', showNextCard);

btnCorrect.addEventListener('click', () => {
  score.correct++;
  score.total++;
  saveScore(score);
  updateScoreDisplay();
  showNextCard();
});

btnWrong.addEventListener('click', () => {
  score.total++;
  saveScore(score);
  updateScoreDisplay();
  showNextCard();
});

// ─── 単語管理 ─────────────────────────────────────────
function renderWordList() {
  wordList.innerHTML = '';
  if (words.length === 0) {
    wordListEmpty.style.display = 'block';
    return;
  }
  wordListEmpty.style.display = 'none';
  words.forEach((w, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="word-text">${escapeHtml(w.word)}</span>
      <span class="meaning-text">${escapeHtml(w.meaning)}</span>
      <button class="btn-delete" data-index="${i}" title="削除">✕</button>
    `;
    wordList.appendChild(li);
  });
}

wordList.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const idx = parseInt(btn.dataset.index, 10);
  words.splice(idx, 1);
  saveWords(words);
  renderWordList();
  if (current && !words.includes(current)) {
    current = null;
    showNextCard();
  }
});

wordForm.addEventListener('submit', e => {
  e.preventDefault();
  const word    = inputWord.value.trim();
  const meaning = inputMeaning.value.trim();
  if (!word || !meaning) return;
  words.push({ word, meaning });
  saveWords(words);
  renderWordList();
  inputWord.value    = '';
  inputMeaning.value = '';
  inputWord.focus();
});

// ─── ユーティリティ ────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── 初期化 ───────────────────────────────────────────
updateScoreDisplay();
renderWordList();
showNextCard();
