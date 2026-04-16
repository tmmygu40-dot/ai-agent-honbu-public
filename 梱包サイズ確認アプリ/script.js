// サイズ区分データ（ヤマト運輸・宅急便 料金目安）
// 3辺合計(cm) / 重量上限(kg) / 料金目安(同一都道府県〜遠距離)
const SIZE_TIERS = [
  { name: '60サイズ',  maxCm: 60,  maxKg: 2,  priceMin: 770,  priceMax: 1340 },
  { name: '80サイズ',  maxCm: 80,  maxKg: 5,  priceMin: 990,  priceMax: 1600 },
  { name: '100サイズ', maxCm: 100, maxKg: 10, priceMin: 1210, priceMax: 1930 },
  { name: '120サイズ', maxCm: 120, maxKg: 15, priceMin: 1430, priceMax: 2170 },
  { name: '140サイズ', maxCm: 140, maxKg: 20, priceMin: 1650, priceMax: 2420 },
  { name: '160サイズ', maxCm: 160, maxKg: 25, priceMin: 1870, priceMax: 2650 },
];

const MAX_CM = 160;
const MAX_KG = 25;

// 区分判定
function getSize(w, h, d, kg) {
  const total = w + h + d;
  if (total > MAX_CM || kg > MAX_KG) return null; // 規格外
  for (const tier of SIZE_TIERS) {
    if (total <= tier.maxCm && kg <= tier.maxKg) return tier;
  }
  return null;
}

// サイズ表を初期描画
function renderChart(highlighted) {
  const tbody = document.getElementById('chartBody');
  tbody.innerHTML = '';
  SIZE_TIERS.forEach(tier => {
    const tr = document.createElement('tr');
    if (highlighted && tier.name === highlighted) tr.classList.add('highlight');
    tr.innerHTML = `
      <td>${tier.name}</td>
      <td>${tier.maxCm}cm以内</td>
      <td>${tier.maxKg}kg以内</td>
      <td>${tier.priceMin.toLocaleString()}〜${tier.priceMax.toLocaleString()}円</td>
    `;
    tbody.appendChild(tr);
  });
}

// 結果表示
function showResult(tier, total, kg) {
  const section = document.getElementById('resultSection');
  const card = document.getElementById('resultCard');
  const badge = document.getElementById('sizeBadge');
  const detail = document.getElementById('sizeDetail');
  const priceTable = document.getElementById('priceTable');

  section.style.display = 'block';

  if (!tier) {
    card.classList.add('over');
    badge.textContent = '規格外';
    detail.textContent = `3辺合計 ${total.toFixed(1)}cm／重量 ${kg}kg — 最大160サイズ・25kgを超えています`;
    priceTable.innerHTML = '<div class="price-row"><span>個別見積もりが必要です</span></div>';
    renderChart(null);
    return;
  }

  card.classList.remove('over');
  badge.textContent = tier.name;
  detail.textContent = `3辺合計 ${total.toFixed(1)}cm（上限${tier.maxCm}cm）／重量 ${kg}kg（上限${tier.maxKg}kg）`;

  priceTable.innerHTML = `
    <div class="price-row">
      <span class="region">同一都道府県〜近隣</span>
      <span class="price">${tier.priceMin.toLocaleString()}円〜</span>
    </div>
    <div class="price-row current">
      <span class="region">関東〜関東（目安）</span>
      <span class="price">${Math.round((tier.priceMin + tier.priceMax) / 2).toLocaleString()}円前後</span>
    </div>
    <div class="price-row">
      <span class="region">遠距離（北海道・九州など）</span>
      <span class="price">〜${tier.priceMax.toLocaleString()}円</span>
    </div>
  `;

  renderChart(tier.name);
}

// localStorage 保存・復元
const STORAGE_KEY = 'koroPack_lastInput';

function saveInput(w, h, d, kg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ w, h, d, kg }));
}

function loadInput() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data) {
      document.getElementById('width').value = data.w;
      document.getElementById('height').value = data.h;
      document.getElementById('depth').value = data.d;
      document.getElementById('weight').value = data.kg;
    }
  } catch {}
}

// 計算ボタン
document.getElementById('calcBtn').addEventListener('click', () => {
  const w = parseFloat(document.getElementById('width').value);
  const h = parseFloat(document.getElementById('height').value);
  const d = parseFloat(document.getElementById('depth').value);
  const kg = parseFloat(document.getElementById('weight').value);

  if (isNaN(w) || isNaN(h) || isNaN(d) || isNaN(kg) || w <= 0 || h <= 0 || d <= 0 || kg <= 0) {
    alert('縦・横・高さ・重量をすべて入力してください。');
    return;
  }

  saveInput(w, h, d, kg);
  const total = w + h + d;
  const tier = getSize(w, h, d, kg);
  showResult(tier, total, kg);

  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// クリアボタン
document.getElementById('clearBtn').addEventListener('click', () => {
  ['width', 'height', 'depth', 'weight'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('resultSection').style.display = 'none';
  renderChart(null);
});

// Enter キーで計算
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('calcBtn').click();
});

// 初期化
renderChart(null);
loadInput();
