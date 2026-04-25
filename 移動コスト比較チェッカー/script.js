const STORAGE_KEY = 'ido_cost_checker';

const fields = ['gas', 'highway', 'parking', 'fare', 'ic-discount', 'other-train'];

// 入力値を取得（空なら0）
function val(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) || v < 0 ? 0 : v;
}

// 小計更新
function updateSubtotals() {
  const carTotal = val('gas') + val('highway') + val('parking');
  const trainTotal = val('fare') - val('ic-discount') + val('other-train');
  const trainFinal = Math.max(0, trainTotal);

  document.getElementById('car-subtotal').textContent =
    `合計：${carTotal.toLocaleString()} 円`;
  document.getElementById('train-subtotal').textContent =
    `合計：${trainFinal.toLocaleString()} 円`;
}

// 比較実行
function compare() {
  const carTotal = val('gas') + val('highway') + val('parking');
  const trainTotal = Math.max(0, val('fare') - val('ic-discount') + val('other-train'));

  const resultArea = document.getElementById('result-area');
  const resultBox = document.getElementById('result-box');
  const winner = document.getElementById('winner-label');
  const diff = document.getElementById('diff-label');
  const detail = document.getElementById('detail-label');

  resultArea.style.display = 'block';
  resultBox.className = 'result-box';

  if (carTotal === 0 && trainTotal === 0) {
    resultBox.classList.add('tie');
    winner.textContent = '金額を入力してください';
    diff.textContent = '';
    detail.textContent = '車・電車それぞれのコストを入力してから比較してください。';
    return;
  }

  const diffAmt = Math.abs(carTotal - trainTotal);

  if (carTotal < trainTotal) {
    resultBox.classList.add('car-wins');
    winner.textContent = '🚗 車の方が安い！';
    diff.textContent = `電車より ${diffAmt.toLocaleString()} 円安い`;
    detail.textContent = `車 ${carTotal.toLocaleString()} 円 ／ 電車 ${trainTotal.toLocaleString()} 円`;
  } else if (trainTotal < carTotal) {
    resultBox.classList.add('train-wins');
    winner.textContent = '🚃 電車の方が安い！';
    diff.textContent = `車より ${diffAmt.toLocaleString()} 円安い`;
    detail.textContent = `車 ${carTotal.toLocaleString()} 円 ／ 電車 ${trainTotal.toLocaleString()} 円`;
  } else {
    resultBox.classList.add('tie');
    winner.textContent = '🤝 同じ金額！';
    diff.textContent = '差額なし';
    detail.textContent = `車・電車どちらも ${carTotal.toLocaleString()} 円`;
  }

  saveData();
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// リセット
function resetAll() {
  fields.forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('result-area').style.display = 'none';
  document.getElementById('car-subtotal').textContent = '合計：― 円';
  document.getElementById('train-subtotal').textContent = '合計：― 円';
  localStorage.removeItem(STORAGE_KEY);
}

// localStorage 保存
function saveData() {
  const data = {};
  fields.forEach(id => { data[id] = document.getElementById(id).value; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// localStorage 読み込み
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    fields.forEach(id => {
      if (data[id] !== undefined) {
        document.getElementById(id).value = data[id];
      }
    });
    updateSubtotals();
  } catch (e) {
    // ignore
  }
}

// 入力イベントで小計をリアルタイム更新・保存
fields.forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    updateSubtotals();
    saveData();
  });
});

// 初期化
loadData();
