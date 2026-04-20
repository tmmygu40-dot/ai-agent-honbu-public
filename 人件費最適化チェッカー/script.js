const STORAGE_KEY = 'jinkenhiChecker';

const ids = {
  recruitCost: 'recruitCost',
  hrCost: 'hrCost',
  trainingCost: 'trainingCost',
  handoverCost: 'handoverCost',
  otherHireCost: 'otherHireCost',
  currentWage: 'currentWage',
  wageIncrease: 'wageIncrease',
  monthlyHours: 'monthlyHours',
  months: 'months',
};

function getVal(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function fmt(n) {
  return n.toLocaleString('ja-JP');
}

function calcHireTotal() {
  return (
    getVal('recruitCost') +
    getVal('hrCost') +
    getVal('trainingCost') +
    getVal('handoverCost') +
    getVal('otherHireCost')
  );
}

function calcWageTotal() {
  const increase = getVal('wageIncrease');
  const hours = getVal('monthlyHours');
  const months = getVal('months') || 12;
  return increase * hours * months;
}

function updateTotals() {
  document.getElementById('hireTotalDisplay').textContent = fmt(calcHireTotal());
  document.getElementById('wageTotalDisplay').textContent = fmt(calcWageTotal());
}

function calculate() {
  const hireTotal = calcHireTotal();
  const increase = getVal('wageIncrease');
  const hours = getVal('monthlyHours');
  const months = getVal('months') || 12;
  const wageMonthly = increase * hours;
  const wageTotal = wageMonthly * months;

  const diff = hireTotal - wageTotal;

  document.getElementById('hireResult').textContent = fmt(hireTotal) + ' 円';
  document.getElementById('wageResult').textContent = fmt(wageTotal) + ' 円';
  document.getElementById('resultMonths').textContent = months;

  document.getElementById('d_hire').textContent = fmt(hireTotal) + ' 円';
  document.getElementById('d_wageMonthly').textContent = fmt(wageMonthly) + ' 円/月';
  document.getElementById('d_wageTotal').textContent = fmt(wageTotal) + ' 円';
  document.getElementById('d_months').textContent = months;
  document.getElementById('d_diff').textContent = (diff >= 0 ? '+' : '') + fmt(diff) + ' 円';

  if (wageMonthly > 0) {
    const breakeven = Math.ceil(hireTotal / wageMonthly);
    document.getElementById('d_breakeven').textContent = breakeven + ' ヶ月';
  } else {
    document.getElementById('d_breakeven').textContent = '計算不可（時給アップ幅または労働時間が0）';
  }

  const judgement = document.getElementById('judgement');
  const hireBox = document.querySelector('.result-grid .result-box:first-child');
  const wageBox = document.querySelector('.result-grid .result-box:last-child');
  hireBox.classList.remove('winner');
  wageBox.classList.remove('winner');

  if (hireTotal === 0 && wageTotal === 0) {
    judgement.className = 'judgement equal';
    judgement.textContent = '数値を入力してください。';
  } else if (hireTotal > wageTotal) {
    judgement.className = 'judgement wage-better';
    judgement.innerHTML = `✅ <strong>時給アップの方がお得です</strong><br>採用・育成コスト（${fmt(hireTotal)}円）の方が時給アップ総額（${fmt(wageTotal)}円）より高いため、<br>時給を上げてスタッフを引き留める方がコストを抑えられます。`;
    wageBox.classList.add('winner');
  } else if (wageTotal > hireTotal) {
    judgement.className = 'judgement hire-better';
    judgement.innerHTML = `⚠️ <strong>新規採用・育成の方がコストが低い可能性があります</strong><br>時給アップ総額（${fmt(wageTotal)}円）が採用・育成コスト（${fmt(hireTotal)}円）を上回っています。<br>ただし、定着率・経験値も考慮して判断してください。`;
    hireBox.classList.add('winner');
  } else {
    judgement.className = 'judgement equal';
    judgement.innerHTML = `⚖️ <strong>ほぼ同コストです</strong><br>採用コストと時給アップコストがほぼ同じです。<br>定着率や従業員のモチベーションも含めて総合判断してください。`;
  }

  document.getElementById('resultSection').classList.remove('hidden');
  saveToStorage();
}

function saveToStorage() {
  const data = {};
  Object.values(ids).forEach(id => {
    data[id] = document.getElementById(id).value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.values(ids).forEach(id => {
      if (data[id] !== undefined && document.getElementById(id)) {
        document.getElementById(id).value = data[id];
      }
    });
    updateTotals();
  } catch (e) {
    // ignore
  }
}

function reset() {
  Object.values(ids).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('months').value = '12';
  document.getElementById('hireTotalDisplay').textContent = '0';
  document.getElementById('wageTotalDisplay').textContent = '0';
  document.getElementById('resultSection').classList.add('hidden');
  localStorage.removeItem(STORAGE_KEY);
}

// イベント設定
document.getElementById('calcBtn').addEventListener('click', calculate);
document.getElementById('resetBtn').addEventListener('click', reset);

Object.values(ids).forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      updateTotals();
      saveToStorage();
    });
  }
});

// 初期ロード
loadFromStorage();
