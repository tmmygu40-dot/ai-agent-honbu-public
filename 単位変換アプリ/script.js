// 単位定義（基準単位への変換係数 / 変換関数）
const CATEGORIES = {
  length: {
    label: '長さ',
    units: {
      mm: { label: 'mm（ミリメートル）', toBase: v => v * 0.001, fromBase: v => v * 1000 },
      cm: { label: 'cm（センチメートル）', toBase: v => v * 0.01, fromBase: v => v * 100 },
      m: { label: 'm（メートル）', toBase: v => v, fromBase: v => v },
      km: { label: 'km（キロメートル）', toBase: v => v * 1000, fromBase: v => v * 0.001 },
      inch: { label: 'inch（インチ）', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      ft: { label: 'ft（フィート）', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      mile: { label: 'mile（マイル）', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    },
  },
  weight: {
    label: '重さ',
    units: {
      mg: { label: 'mg（ミリグラム）', toBase: v => v * 0.000001, fromBase: v => v * 1000000 },
      g: { label: 'g（グラム）', toBase: v => v * 0.001, fromBase: v => v * 1000 },
      kg: { label: 'kg（キログラム）', toBase: v => v, fromBase: v => v },
      t: { label: 't（トン）', toBase: v => v * 1000, fromBase: v => v * 0.001 },
      oz: { label: 'oz（オンス）', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
      lb: { label: 'lb（ポンド）', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
    },
  },
  temperature: {
    label: '温度',
    units: {
      c: { label: '°C（摂氏）', toBase: v => v, fromBase: v => v },
      f: { label: '°F（華氏）', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
      k: { label: 'K（ケルビン）', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    },
  },
  area: {
    label: '面積',
    units: {
      mm2: { label: 'mm²', toBase: v => v * 0.000001, fromBase: v => v * 1000000 },
      cm2: { label: 'cm²', toBase: v => v * 0.0001, fromBase: v => v * 10000 },
      m2: { label: 'm²', toBase: v => v, fromBase: v => v },
      km2: { label: 'km²', toBase: v => v * 1000000, fromBase: v => v * 0.000001 },
      ha: { label: 'ha（ヘクタール）', toBase: v => v * 10000, fromBase: v => v * 0.0001 },
      tsubo: { label: '坪', toBase: v => v * 3.30579, fromBase: v => v / 3.30579 },
    },
  },
  volume: {
    label: '体積',
    units: {
      ml: { label: 'mL（ミリリットル）', toBase: v => v * 0.001, fromBase: v => v * 1000 },
      l: { label: 'L（リットル）', toBase: v => v, fromBase: v => v },
      m3: { label: 'm³', toBase: v => v * 1000, fromBase: v => v * 0.001 },
      tsp: { label: 'tsp（小さじ）', toBase: v => v * 0.00492892, fromBase: v => v / 0.00492892 },
      tbsp: { label: 'tbsp（大さじ）', toBase: v => v * 0.0147868, fromBase: v => v / 0.0147868 },
      cup: { label: 'cup（カップ）', toBase: v => v * 0.2366882, fromBase: v => v / 0.2366882 },
      gal: { label: 'gal（ガロン）', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    },
  },
};

const MAX_HISTORY = 20;

let currentCategory = 'length';
let history = JSON.parse(localStorage.getItem('unitConverterHistory') || '[]');

const inputValue = document.getElementById('inputValue');
const outputValue = document.getElementById('outputValue');
const fromUnit = document.getElementById('fromUnit');
const toUnit = document.getElementById('toUnit');
const swapBtn = document.getElementById('swapBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function populateUnits(category) {
  const units = CATEGORIES[category].units;
  [fromUnit, toUnit].forEach((sel, idx) => {
    const prev = sel.value;
    sel.innerHTML = '';
    Object.entries(units).forEach(([key, u]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = u.label;
      sel.appendChild(opt);
    });
    // 初期値：from は先頭、to は2番目
    const keys = Object.keys(units);
    if (prev && units[prev]) {
      sel.value = prev;
    } else {
      sel.value = keys[idx === 0 ? 0 : 1] || keys[0];
    }
  });
}

function convert() {
  const raw = inputValue.value;
  if (raw === '' || isNaN(parseFloat(raw))) {
    outputValue.value = '';
    return;
  }
  const val = parseFloat(raw);
  const from = fromUnit.value;
  const to = toUnit.value;
  const cat = CATEGORIES[currentCategory];

  if (from === to) {
    outputValue.value = val;
    return;
  }

  const base = cat.units[from].toBase(val);
  const result = cat.units[to].fromBase(base);

  // 桁数調整
  const rounded = parseFloat(result.toPrecision(8));
  outputValue.value = rounded;
}

function addHistory() {
  const raw = inputValue.value;
  if (raw === '' || outputValue.value === '') return;
  const val = parseFloat(raw);
  const result = parseFloat(outputValue.value);
  const from = fromUnit.value;
  const to = toUnit.value;
  const cat = CATEGORIES[currentCategory];

  const entry = {
    category: cat.label,
    text: `${val} ${from} → ${result} ${to}`,
    time: Date.now(),
  };

  // 同じ変換が直前にあればスキップ
  if (history.length > 0 && history[0].text === entry.text) return;

  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem('unitConverterHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<li class="empty-history">履歴はまだありません</li>';
    return;
  }
  history.forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${entry.text}</span><span class="hist-category">${entry.category}</span>`;
    historyList.appendChild(li);
  });
}

// タブ切り替え
document.getElementById('categoryTabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentCategory = tab.dataset.category;
  populateUnits(currentCategory);
  convert();
});

// 入力変化で変換
inputValue.addEventListener('input', convert);
fromUnit.addEventListener('change', convert);
toUnit.addEventListener('change', convert);

// フォーカスが外れたら履歴追加
inputValue.addEventListener('blur', addHistory);

// 入れ替えボタン
swapBtn.addEventListener('click', () => {
  const tmp = fromUnit.value;
  fromUnit.value = toUnit.value;
  toUnit.value = tmp;
  convert();
});

// 履歴クリア
clearHistoryBtn.addEventListener('click', () => {
  history = [];
  localStorage.removeItem('unitConverterHistory');
  renderHistory();
});

// 初期化
populateUnits(currentCategory);
renderHistory();
