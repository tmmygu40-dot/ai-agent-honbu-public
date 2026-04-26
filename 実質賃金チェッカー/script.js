'use strict';

const STORAGE_KEY = 'jisshitsu_chingin_history';

const salaryInput = document.getElementById('salary');
const inflationInput = document.getElementById('inflation');
const calcBtn = document.getElementById('calcBtn');
const resultSection = document.getElementById('resultSection');
const historySection = document.getElementById('historySection');

const nominalEl = document.getElementById('nominalSalary');
const realEl = document.getElementById('realSalary');
const lossEl = document.getElementById('salaryLoss');
const annualLossEl = document.getElementById('annualLoss');
const powerBar = document.getElementById('powerBar');
const powerBarLabel = document.getElementById('powerBarLabel');
const powerDesc = document.getElementById('powerDesc');
const examplesEl = document.getElementById('examples');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

// 具体例（物価上昇でいくら変わるか）
const EXAMPLES = [
  { name: '月の食費（5万円の場合）', base: 50000 },
  { name: '光熱費（2万円の場合）', base: 20000 },
  { name: 'ガソリン代（1万円の場合）', base: 10000 },
  { name: '日用品（1万円の場合）', base: 10000 },
];

function formatYen(n) {
  return n.toLocaleString('ja-JP') + '円';
}

function calculate() {
  const salary = parseFloat(salaryInput.value);
  const inflation = parseFloat(inflationInput.value);

  if (!salary || salary <= 0 || isNaN(inflation) || inflation < 0) {
    alert('月給と物価上昇率を正しく入力してください');
    return;
  }

  // 計算
  const realSalary = salary / (1 + inflation / 100);
  const loss = salary - realSalary;
  const annualLoss = loss * 12;
  const powerRate = (realSalary / salary) * 100;

  // 表示
  nominalEl.textContent = formatYen(Math.round(salary));
  realEl.textContent = formatYen(Math.round(realSalary));
  lossEl.textContent = '▼ ' + formatYen(Math.round(loss));
  annualLossEl.textContent = '▼ ' + formatYen(Math.round(annualLoss));

  powerBar.style.width = powerRate.toFixed(1) + '%';
  powerBarLabel.textContent = powerRate.toFixed(1) + '%';
  powerDesc.textContent = `物価が${inflation}%上がると、同じお金で買えるものが${(100 - powerRate).toFixed(1)}%減ります。`;

  // 具体例
  examplesEl.innerHTML = '';
  EXAMPLES.forEach(ex => {
    const increase = ex.base * (inflation / 100);
    const div = document.createElement('div');
    div.className = 'example-item';
    div.innerHTML = `
      <span class="item-name">${ex.name}</span>
      <span class="item-change">▼ ${formatYen(Math.round(increase))} 分減少</span>
    `;
    examplesEl.appendChild(div);
  });

  resultSection.style.display = 'block';

  // 履歴保存
  saveHistory(salary, inflation, Math.round(realSalary), Math.round(loss), Math.round(annualLoss));
  renderHistory();
}

function saveHistory(salary, inflation, realSalary, loss, annualLoss) {
  const history = loadHistory();
  const entry = {
    date: new Date().toLocaleDateString('ja-JP'),
    salary,
    inflation,
    realSalary,
    loss,
    annualLoss,
  };
  history.unshift(entry);
  if (history.length > 20) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }
  historySection.style.display = 'block';
  historyList.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    li.textContent = `${h.date}｜月給 ${h.salary.toLocaleString()}円 / 物価上昇 ${h.inflation}% → 実質 ${h.realSalary.toLocaleString()}円（月▼${h.loss.toLocaleString()}円・年▼${h.annualLoss.toLocaleString()}円）`;
    historyList.appendChild(li);
  });
}

calcBtn.addEventListener('click', calculate);

[salaryInput, inflationInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  historySection.style.display = 'none';
});

// 初期化
renderHistory();
