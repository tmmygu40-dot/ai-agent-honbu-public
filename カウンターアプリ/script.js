'use strict';

const STORAGE_KEY = 'counter-value';

// ===== 要素取得 =====
const countEl     = document.getElementById('count');
const plusBtn     = document.getElementById('plusBtn');
const minusBtn    = document.getElementById('minusBtn');
const resetBtn    = document.getElementById('resetBtn');
const historyList = document.getElementById('historyList');

// ===== 状態 =====
let count = load();

// ===== 初期描画 =====
render();

// ===== イベント =====
plusBtn.addEventListener('click', () => {
  count++;
  addHistory('＋1', count);
  save();
  render();
  bump();
});

minusBtn.addEventListener('click', () => {
  count--;
  addHistory('－1', count);
  save();
  render();
  bump();
});

resetBtn.addEventListener('click', () => {
  if (count === 0) return;
  const prev = count;
  count = 0;
  addHistory('リセット', 0, prev);
  save();
  render();
});

// ===== 描画 =====
function render() {
  countEl.textContent = count;
  countEl.className = 'count ' + (count > 0 ? 'positive' : count < 0 ? 'negative' : 'zero');
}

// ===== アニメーション =====
function bump() {
  countEl.classList.remove('bump');
  void countEl.offsetWidth; // reflow
  countEl.classList.add('bump');
  countEl.addEventListener('transitionend', () => {
    countEl.classList.remove('bump');
  }, { once: true });
}

// ===== 履歴 =====
function addHistory(op, val, prev) {
  const li = document.createElement('li');
  li.className = 'history-item';

  const opClass = op === '＋1' ? 'h-plus' : op === '－1' ? 'h-minus' : 'h-reset';
  const detail  = (prev !== undefined)
    ? `${prev} → 0`
    : `→ ${val}`;

  li.innerHTML = `<span class="h-op ${opClass}">${op}</span><span class="h-val">${detail}</span>`;

  historyList.insertBefore(li, historyList.firstChild);

  // 最大20件まで
  while (historyList.children.length > 20) {
    historyList.removeChild(historyList.lastChild);
  }
}

// ===== localStorage =====
function save() {
  localStorage.setItem(STORAGE_KEY, count);
}

function load() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v !== null ? parseInt(v, 10) : 0;
}
