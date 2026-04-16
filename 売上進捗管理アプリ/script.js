'use strict';

const targetInput = document.getElementById('target');
const actualInput = document.getElementById('actual');
const calcBtn = document.getElementById('calc-btn');
const resetBtn = document.getElementById('reset-btn');

const rateEl = document.getElementById('rate');
const remainingEl = document.getElementById('remaining');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const dispTarget = document.getElementById('disp-target');
const dispActual = document.getElementById('disp-actual');
const dispDiff = document.getElementById('disp-diff');

function formatYen(num) {
  return '¥' + Math.abs(num).toLocaleString('ja-JP');
}

function calculate() {
  const target = parseFloat(targetInput.value);
  const actual = parseFloat(actualInput.value);

  if (isNaN(target) || isNaN(actual) || target <= 0) {
    alert('目標金額を正しく入力してください。');
    return;
  }

  const rate = (actual / target) * 100;
  const remaining = target - actual;
  const diff = actual - target;

  // 達成率
  rateEl.textContent = rate.toFixed(1) + '%';

  // 残り金額
  if (remaining <= 0) {
    remainingEl.textContent = '目標達成！';
    remainingEl.classList.add('achieved');
  } else {
    remainingEl.textContent = formatYen(remaining);
    remainingEl.classList.remove('achieved');
  }

  // プログレスバー
  const barWidth = Math.min(rate, 100);
  progressBar.style.width = barWidth + '%';
  progressLabel.textContent = rate.toFixed(1) + '%';
  if (rate >= 100) {
    progressBar.classList.add('over');
  } else {
    progressBar.classList.remove('over');
  }

  // サマリー
  dispTarget.textContent = formatYen(target);
  dispActual.textContent = formatYen(actual);

  if (diff >= 0) {
    dispDiff.textContent = '+' + formatYen(diff);
    dispDiff.className = 'summary-val positive';
  } else {
    dispDiff.textContent = '-' + formatYen(remaining);
    dispDiff.className = 'summary-val negative';
  }

  // localStorage に保存
  localStorage.setItem('sales_target', target);
  localStorage.setItem('sales_actual', actual);
}

function reset() {
  targetInput.value = '';
  actualInput.value = '';
  rateEl.textContent = '—';
  remainingEl.textContent = '—';
  remainingEl.classList.remove('achieved');
  progressBar.style.width = '0%';
  progressBar.classList.remove('over');
  progressLabel.textContent = '0%';
  dispTarget.textContent = '—';
  dispActual.textContent = '—';
  dispDiff.textContent = '—';
  dispDiff.className = 'summary-val';
  localStorage.removeItem('sales_target');
  localStorage.removeItem('sales_actual');
}

function loadSaved() {
  const savedTarget = localStorage.getItem('sales_target');
  const savedActual = localStorage.getItem('sales_actual');
  if (savedTarget !== null) {
    targetInput.value = savedTarget;
  }
  if (savedActual !== null) {
    actualInput.value = savedActual;
  }
  if (savedTarget !== null && savedActual !== null) {
    calculate();
  }
}

calcBtn.addEventListener('click', calculate);
resetBtn.addEventListener('click', reset);

// Enterキーでも計算
[targetInput, actualInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

// 入力値変更時にリアルタイム計算
[targetInput, actualInput].forEach(el => {
  el.addEventListener('input', () => {
    if (targetInput.value && actualInput.value) {
      calculate();
    }
  });
});

loadSaved();
