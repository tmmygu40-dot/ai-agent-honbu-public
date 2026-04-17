const STORAGE_KEY = 'deliveryCostCalc';

window.addEventListener('load', () => {
  loadFromStorage();
});

function calculate() {
  const fuelBefore = parseFloat(document.getElementById('fuelBefore').value);
  const fuelAfter = parseFloat(document.getElementById('fuelAfter').value);
  const baseDeliveryCost = parseFloat(document.getElementById('baseDeliveryCost').value);
  const deliveryCount = parseFloat(document.getElementById('deliveryCount').value);
  const currentPrice = parseFloat(document.getElementById('currentPrice').value);
  const targetMargin = parseFloat(document.getElementById('targetMargin').value);

  if (
    isNaN(fuelBefore) || fuelBefore <= 0 ||
    isNaN(fuelAfter) || fuelAfter <= 0 ||
    isNaN(baseDeliveryCost) || baseDeliveryCost <= 0 ||
    isNaN(deliveryCount) || deliveryCount <= 0 ||
    isNaN(currentPrice) || currentPrice <= 0 ||
    isNaN(targetMargin) || targetMargin < 0 || targetMargin >= 100
  ) {
    alert('すべての項目に正しい数値を入力してください。\n（目標粗利率は0〜99%）');
    return;
  }

  // 燃料費増加額
  const fuelIncrease = fuelAfter - fuelBefore;

  // 燃料費上昇率
  const fuelRate = (fuelAfter / fuelBefore - 1) * 100;

  // 配送コスト増加額 = 基本配送コスト × 燃料費上昇率
  const costIncrease = baseDeliveryCost * (fuelAfter / fuelBefore - 1);

  // 1件あたりコスト増加
  const costPerUnit = costIncrease / deliveryCount;

  // 値上げ必要額（粗利率を確保するために必要な転嫁額）
  // 値上げ必要額 = コスト増加 ÷ (1 - 目標粗利率/100)
  const priceIncrease = costPerUnit / (1 - targetMargin / 100);

  // 推奨新単価
  const newPrice = currentPrice + priceIncrease;

  // 値上げ率
  const priceRate = (priceIncrease / currentPrice) * 100;

  // 月間値上げ必要額
  const totalPriceIncrease = priceIncrease * deliveryCount;

  // 表示
  document.getElementById('fuelIncrease').textContent = formatYen(fuelIncrease);
  document.getElementById('fuelRate').textContent = fuelRate.toFixed(1) + '%';
  document.getElementById('costIncrease').textContent = formatYen(costIncrease);
  document.getElementById('costPerUnit').textContent = formatYen(costPerUnit);
  document.getElementById('priceIncrease').textContent = formatYen(priceIncrease);
  document.getElementById('newPrice').textContent = formatYen(newPrice);
  document.getElementById('priceRate').textContent = priceRate.toFixed(1) + '%';
  document.getElementById('totalPriceIncrease').textContent = formatYen(totalPriceIncrease);

  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveToStorage();
}

function formatYen(value) {
  return Math.round(value).toLocaleString('ja-JP') + '円';
}

function clearInputs() {
  ['fuelBefore', 'fuelAfter', 'baseDeliveryCost', 'deliveryCount', 'currentPrice', 'targetMargin'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('resultSection').style.display = 'none';
  localStorage.removeItem(STORAGE_KEY);
}

function saveToStorage() {
  const data = {
    fuelBefore: document.getElementById('fuelBefore').value,
    fuelAfter: document.getElementById('fuelAfter').value,
    baseDeliveryCost: document.getElementById('baseDeliveryCost').value,
    deliveryCount: document.getElementById('deliveryCount').value,
    currentPrice: document.getElementById('currentPrice').value,
    targetMargin: document.getElementById('targetMargin').value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    Object.entries(data).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  } catch (e) {
    // 無視
  }
}
