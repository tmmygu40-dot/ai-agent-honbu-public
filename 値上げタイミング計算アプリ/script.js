const STORAGE_KEY = 'neage_timing_inputs';

const ids = ['currentCost', 'currentPrice', 'monthlyRise', 'targetMargin'];

function saveInputs() {
  const data = {};
  ids.forEach(id => { data[id] = document.getElementById(id).value; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadInputs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    ids.forEach(id => {
      if (data[id] !== undefined) document.getElementById(id).value = data[id];
    });
  } catch (e) {}
}

function calcMargin(cost, price) {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

function calculate() {
  const cost = parseFloat(document.getElementById('currentCost').value);
  const price = parseFloat(document.getElementById('currentPrice').value);
  const rise = parseFloat(document.getElementById('monthlyRise').value);
  const target = parseFloat(document.getElementById('targetMargin').value);

  if ([cost, price, rise, target].some(v => isNaN(v) || v < 0)) {
    alert('すべての項目に正しい数値を入力してください');
    return;
  }
  if (price <= 0) {
    alert('売価は0より大きい値を入力してください');
    return;
  }

  saveInputs();

  const currentMargin = calcMargin(cost, price);
  document.getElementById('currentMarginVal').textContent = currentMargin.toFixed(1) + '%';

  const resultSection = document.getElementById('resultSection');
  const tableSection = document.getElementById('tableSection');
  resultSection.style.display = '';
  tableSection.style.display = '';

  const marginEl = document.getElementById('currentMarginVal');
  if (currentMargin < target) {
    marginEl.className = 'result-value warn';
  } else {
    marginEl.className = 'result-value ok';
  }

  if (rise === 0) {
    // No cost rise
    document.getElementById('timingVal').textContent = '−';
    document.getElementById('newPriceVal').textContent = '−';
    document.getElementById('priceRiseVal').textContent = '−';
    const msg = document.getElementById('judgmentMsg');
    msg.className = 'judgment norise';
    if (currentMargin < target) {
      msg.innerHTML = '原価上昇はありませんが、<strong>現在の粗利率が目標を下回っています。</strong><br>今すぐ値上げを検討してください。';
      msg.className = 'judgment now';
    } else {
      msg.textContent = '原価上昇率が0%のため、値上げは不要です。';
    }
    buildTable(cost, price, rise, target, -1);
    return;
  }

  // Find the month when current price no longer meets target margin
  // currentMarginWithSamePrice(n) = (price - cost*(1+rise/100)^n) / price
  // Becomes < target when: price - cost*(1+r)^n < price * (target/100)
  // cost*(1+r)^n > price * (1 - target/100)
  // n > log(price*(1-target/100)/cost) / log(1+r/100)

  const r = rise / 100;
  const breakEvenRatio = (price * (1 - target / 100)) / cost;

  let timingMonth = -1;
  let newPrice = price;

  if (currentMargin < target) {
    // Already below target
    timingMonth = 0;
  } else if (breakEvenRatio <= 1) {
    // Impossible to stay above target even now (shouldn't happen if currentMargin >= target)
    timingMonth = 0;
  } else {
    timingMonth = Math.ceil(Math.log(breakEvenRatio) / Math.log(1 + r));
  }

  // At timingMonth, cost is:
  const costAtTiming = timingMonth <= 0 ? cost : cost * Math.pow(1 + r, timingMonth);
  // Recommended price to restore target margin
  newPrice = costAtTiming / (1 - target / 100);

  const priceRiseAbs = newPrice - price;
  const priceRisePct = (priceRiseAbs / price) * 100;

  const timingEl = document.getElementById('timingVal');
  const newPriceEl = document.getElementById('newPriceVal');
  const priceRiseEl = document.getElementById('priceRiseVal');

  if (timingMonth <= 0) {
    timingEl.textContent = '今すぐ';
    timingEl.className = 'result-value warn';
  } else {
    timingEl.textContent = timingMonth + 'ヶ月後';
    timingEl.className = timingMonth <= 3 ? 'result-value warn' : 'result-value';
  }

  newPriceEl.textContent = Math.ceil(newPrice).toLocaleString() + '円';
  priceRiseEl.textContent = '+' + Math.ceil(priceRiseAbs).toLocaleString() + '円 (+' + priceRisePct.toFixed(1) + '%)';

  const msg = document.getElementById('judgmentMsg');
  if (timingMonth <= 0) {
    msg.className = 'judgment now';
    msg.innerHTML = '現在の粗利率が目標を下回っています。<strong>今すぐ値上げが必要です。</strong><br>推奨売価：' + Math.ceil(newPrice).toLocaleString() + '円';
  } else if (timingMonth <= 3) {
    msg.className = 'judgment soon';
    msg.innerHTML = '<strong>' + timingMonth + 'ヶ月後</strong>に値上げが必要になります。早めに準備してください。<br>推奨売価：' + Math.ceil(newPrice).toLocaleString() + '円';
  } else {
    msg.className = 'judgment safe';
    msg.innerHTML = 'あと<strong>' + timingMonth + 'ヶ月</strong>は現行価格で対応できます。<br>推奨値上げ時期：' + timingMonth + 'ヶ月後、推奨売価：' + Math.ceil(newPrice).toLocaleString() + '円';
  }

  buildTable(cost, price, rise, target, timingMonth);
}

function buildTable(cost, price, rise, target, timingMonth) {
  const tbody = document.getElementById('trendBody');
  tbody.innerHTML = '';
  const r = rise / 100;

  for (let n = 0; n <= 24; n++) {
    const c = cost * Math.pow(1 + r, n);
    const m = calcMargin(c, price);
    const isOk = m >= target;
    const isTiming = n === timingMonth;

    const tr = document.createElement('tr');
    if (isTiming) tr.className = 'timing-row';

    tr.innerHTML = `
      <td>${n === 0 ? '現在' : n + 'ヶ月後'}</td>
      <td>${Math.round(c).toLocaleString()}</td>
      <td>${m.toFixed(1)}</td>
      <td><span class="badge ${isOk ? 'badge-ok' : 'badge-warn'}">${isOk ? '余裕あり' : '要値上げ'}${isTiming ? ' ←目安' : ''}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('calcBtn').addEventListener('click', calculate);

ids.forEach(id => {
  document.getElementById(id).addEventListener('keydown', function(e) {
    if (e.key === 'Enter') calculate();
  });
});

loadInputs();
