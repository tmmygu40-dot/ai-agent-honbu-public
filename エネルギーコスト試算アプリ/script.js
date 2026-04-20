const FIELDS = ['electric', 'gas', 'fuel', 'other', 'sales', 'margin'];

function fmt(num) {
  return num.toLocaleString('ja-JP') + ' 円';
}

function fmtRate(num) {
  return num.toFixed(2) + ' %';
}

function val(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) || v < 0 ? 0 : v;
}

function calculate() {
  const electric = val('electric');
  const gas = val('gas');
  const fuel = val('fuel');
  const other = val('other');
  const sales = val('sales');
  const margin = val('margin');

  const total = electric + gas + fuel + other;

  document.getElementById('totalIncrease').textContent = fmt(total);
  document.getElementById('r-electric').textContent = fmt(electric);
  document.getElementById('r-gas').textContent = fmt(gas);
  document.getElementById('r-fuel').textContent = fmt(fuel);
  document.getElementById('r-other').textContent = fmt(other);

  if (sales > 0) {
    const rate = (total / sales) * 100;
    document.getElementById('priceUpRate').textContent = fmtRate(rate);
    const upPer10000 = Math.ceil(10000 * rate / 100);
    document.getElementById('priceUpAmount').textContent = '約 ' + upPer10000.toLocaleString('ja-JP') + ' 円 → ' + (10000 + upPer10000).toLocaleString('ja-JP') + ' 円';
  } else {
    document.getElementById('priceUpRate').textContent = '売上を入力してください';
    document.getElementById('priceUpAmount').textContent = '―';
  }

  let note = '';
  if (margin > 0 && sales > 0) {
    const grossProfit = sales * (margin / 100);
    const impactRate = (total / grossProfit) * 100;
    note = `※ 粗利 ${fmt(Math.round(grossProfit))} に対するコスト増の影響率：${impactRate.toFixed(1)}%`;
  }
  document.getElementById('resultNote').textContent = note;

  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveData();
}

function resetAll() {
  FIELDS.forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('totalIncrease').textContent = '―';
  document.getElementById('r-electric').textContent = '―';
  document.getElementById('r-gas').textContent = '―';
  document.getElementById('r-fuel').textContent = '―';
  document.getElementById('r-other').textContent = '―';
  document.getElementById('priceUpRate').textContent = '―';
  document.getElementById('priceUpAmount').textContent = '―';
  document.getElementById('resultNote').textContent = '';
  localStorage.removeItem('energyCostData');
}

function saveData() {
  const data = {};
  FIELDS.forEach(id => { data[id] = document.getElementById(id).value; });
  localStorage.setItem('energyCostData', JSON.stringify(data));
}

function loadData() {
  const saved = localStorage.getItem('energyCostData');
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    FIELDS.forEach(id => {
      if (data[id] !== undefined) document.getElementById(id).value = data[id];
    });
    // 保存済みデータがあれば自動計算
    const hasAny = FIELDS.some(id => data[id] && data[id] !== '');
    if (hasAny) calculate();
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', loadData);
