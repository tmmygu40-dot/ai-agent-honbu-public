const STORAGE_KEY = 'minimumWageSimulator';

const fields = ['currentWage', 'newWage', 'staffCount', 'monthlyHours', 'monthlySales'];

function fmt(n) {
  return n.toLocaleString('ja-JP') + ' 円';
}

function fmtPct(n) {
  return n.toFixed(2) + ' %';
}

document.getElementById('calcBtn').addEventListener('click', calculate);
document.getElementById('saveBtn').addEventListener('click', saveInputs);
document.getElementById('clearBtn').addEventListener('click', clearAll);

function calculate() {
  const currentWage = parseFloat(document.getElementById('currentWage').value);
  const newWage = parseFloat(document.getElementById('newWage').value);
  const staffCount = parseFloat(document.getElementById('staffCount').value);
  const monthlyHours = parseFloat(document.getElementById('monthlyHours').value);
  const monthlySales = parseFloat(document.getElementById('monthlySales').value);

  if ([currentWage, newWage, staffCount, monthlyHours, monthlySales].some(v => isNaN(v) || v < 0)) {
    alert('すべての項目に0以上の数値を入力してください。');
    return;
  }

  if (newWage < currentWage) {
    alert('改定後の時給が現在の時給より低くなっています。確認してください。');
    return;
  }

  const currentCost = currentWage * staffCount * monthlyHours;
  const newCost = newWage * staffCount * monthlyHours;
  const costIncrease = newCost - currentCost;

  let priceRaise = 0;
  let priceRaiseAmount = 0;
  let impactRate = 0;

  if (monthlySales > 0) {
    impactRate = (costIncrease / monthlySales) * 100;
    priceRaise = impactRate;
    priceRaiseAmount = costIncrease;
  }

  document.getElementById('currentCost').textContent = fmt(currentCost);
  document.getElementById('newCost').textContent = fmt(newCost);
  document.getElementById('costIncrease').textContent = fmt(costIncrease);
  document.getElementById('priceRaise').textContent = fmtPct(priceRaise);
  document.getElementById('priceRaiseAmount').textContent = fmt(priceRaiseAmount);
  document.getElementById('impactRate').textContent = fmtPct(impactRate);

  const judgment = document.getElementById('judgment');
  if (impactRate === 0) {
    judgment.textContent = '';
    judgment.className = 'judgment';
  } else if (impactRate < 1) {
    judgment.textContent = '影響は軽微です。値上げ対応は任意で検討してください。';
    judgment.className = 'judgment low';
  } else if (impactRate < 3) {
    judgment.textContent = '一定の影響があります。価格転嫁または業務効率化の検討を推奨します。';
    judgment.className = 'judgment mid';
  } else {
    judgment.textContent = '影響が大きいです。早急に値上げ対応または人件費削減策を検討してください。';
    judgment.className = 'judgment high';
  }

  document.getElementById('resultSection').style.display = 'block';
}

function saveInputs() {
  const data = {};
  fields.forEach(id => {
    data[id] = document.getElementById(id).value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const msg = document.getElementById('saveMsg');
  msg.textContent = '保存しました';
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

function clearAll() {
  fields.forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('saveMsg').textContent = '';
  localStorage.removeItem(STORAGE_KEY);
}

function loadInputs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    fields.forEach(id => {
      if (data[id] !== undefined) {
        document.getElementById(id).value = data[id];
      }
    });
  } catch (e) {
    // 無視
  }
}

loadInputs();
