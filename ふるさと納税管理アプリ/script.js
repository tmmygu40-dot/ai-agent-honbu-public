// ふるさと納税 控除上限 簡易計算
// 参考：総務省「ふるさと納税の控除上限早見表」をベースにした近似式
// 実負担2,000円で済む上限額の目安 = 住民税所得割額の約20% + 所得税控除分

const FAMILY_ADJUSTMENTS = {
  single:        0,
  spouse:        33000,
  spouse_child1: 49000,
  spouse_child2: 68000,
  spouse_child3: 88000,
  single_child1: 30000,
  single_child2: 51000,
};

// 年収から課税所得を推計（給与所得控除後）
function estimateTaxableIncome(incomeMan) {
  const income = incomeMan * 10000;
  let salaryDeduction;
  if (income <= 1625000) {
    salaryDeduction = 550000;
  } else if (income <= 1800000) {
    salaryDeduction = income * 0.4 - 100000;
  } else if (income <= 3600000) {
    salaryDeduction = income * 0.3 + 80000;
  } else if (income <= 6600000) {
    salaryDeduction = income * 0.2 + 440000;
  } else if (income <= 8500000) {
    salaryDeduction = income * 0.1 + 1100000;
  } else {
    salaryDeduction = 1950000;
  }
  return income - salaryDeduction;
}

// 所得税率を求める
function getIncomeTaxRate(taxableIncome) {
  if (taxableIncome <= 1950000) return 0.05;
  if (taxableIncome <= 3300000) return 0.10;
  if (taxableIncome <= 6950000) return 0.20;
  if (taxableIncome <= 9000000) return 0.23;
  if (taxableIncome <= 18000000) return 0.33;
  if (taxableIncome <= 40000000) return 0.40;
  return 0.45;
}

// 控除上限を計算（実負担2000円で済む上限）
function calcLimit(incomeMan, familyType) {
  if (!incomeMan || incomeMan <= 0) return 0;

  const taxable = estimateTaxableIncome(incomeMan);
  const personalDeduction = 480000; // 基礎控除（令和2年以降）
  const netTaxable = Math.max(0, taxable - personalDeduction);
  const taxRate = getIncomeTaxRate(netTaxable);

  // 住民税所得割額の目安（税率10%）
  const municipalTax = netTaxable * 0.10;

  // 所得税での控除分：寄付額 × 所得税率 / (1 - 所得税率 - 0.021)
  // 住民税特例分：住民税所得割額の20%が上限
  // 簡易近似：上限 = 住民税所得割額 × 20% ÷ (1 - 所得税率 × 1.021 - 0.10) + 2000
  const denominator = 1 - (taxRate * 1.021) - 0.10;
  let limit;
  if (denominator <= 0) {
    limit = municipalTax * 0.20 + 2000;
  } else {
    limit = (municipalTax * 0.20) / denominator + 2000;
  }

  // 家族構成補正（住民税増減分を控除上限から差し引く目安）
  const adj = FAMILY_ADJUSTMENTS[familyType] || 0;
  limit = Math.max(0, limit - adj);

  // 100円単位で切り捨て
  return Math.floor(limit / 100) * 100;
}

// 表示用フォーマット
function fmt(num) {
  return num.toLocaleString('ja-JP') + ' 円';
}

// --- 計算ボタン ---
document.getElementById('calcBtn').addEventListener('click', () => {
  const incomeMan = parseFloat(document.getElementById('income').value);
  const familyType = document.getElementById('familyType').value;
  const donated = parseFloat(document.getElementById('donated').value) || 0;

  if (!incomeMan || incomeMan <= 0) {
    alert('年収を入力してください。');
    return;
  }

  const limit = calcLimit(incomeMan, familyType);
  const remain = Math.max(0, limit - donated);
  const recommend = remain > 2000 ? remain : 0;

  document.getElementById('limitValue').textContent = fmt(limit);
  document.getElementById('donatedValue').textContent = fmt(donated);
  document.getElementById('remainValue').textContent = remain > 0 ? fmt(remain) : '0 円（上限到達）';
  document.getElementById('recommendValue').textContent = recommend > 0 ? fmt(recommend) : '追加なし（上限に達しています）';

  let note = '';
  if (remain > 0) {
    note = `あと ${fmt(remain)} 寄付すると控除上限いっぱいまで活用できます（実質負担2,000円）。`;
  } else if (donated > 0) {
    note = '控除上限を超えています。超えた分は控除の対象外となります。';
  }
  document.getElementById('noteText').textContent = note;

  // 入力値をlocalStorageに保存
  localStorage.setItem('furusato_income', incomeMan);
  localStorage.setItem('furusato_family', familyType);
  localStorage.setItem('furusato_donated', donated);
});

// --- 履歴機能 ---
let historyItems = JSON.parse(localStorage.getItem('furusato_history') || '[]');

function renderHistory() {
  const list = document.getElementById('historyList');
  const footer = document.getElementById('historyFooter');
  list.innerHTML = '';

  if (historyItems.length === 0) {
    footer.textContent = '';
    return;
  }

  let total = 0;
  historyItems.forEach((item, index) => {
    total += item.amount;
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-item-info">
        <div class="history-item-name">${escapeHtml(item.name)}</div>
        <div class="history-item-amount">${item.amount.toLocaleString('ja-JP')} 円</div>
      </div>
      <button class="history-item-delete" data-index="${index}" title="削除">×</button>
    `;
    list.appendChild(li);
  });

  footer.textContent = `合計：${total.toLocaleString('ja-JP')} 円（${historyItems.length}件）`;

  // 寄付済み欄に合計を反映するボタン表示
  document.getElementById('donated').value = total;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('addHistoryBtn').addEventListener('click', () => {
  const name = document.getElementById('historyName').value.trim();
  const amount = parseFloat(document.getElementById('historyAmount').value);

  if (!name) { alert('返礼品名を入力してください。'); return; }
  if (!amount || amount <= 0) { alert('金額を入力してください。'); return; }

  historyItems.push({ name, amount });
  localStorage.setItem('furusato_history', JSON.stringify(historyItems));

  document.getElementById('historyName').value = '';
  document.getElementById('historyAmount').value = '';

  renderHistory();
});

document.getElementById('historyList').addEventListener('click', (e) => {
  const btn = e.target.closest('.history-item-delete');
  if (!btn) return;
  const index = parseInt(btn.dataset.index);
  historyItems.splice(index, 1);
  localStorage.setItem('furusato_history', JSON.stringify(historyItems));
  renderHistory();
});

// --- ページ読み込み時に復元 ---
window.addEventListener('load', () => {
  const income = localStorage.getItem('furusato_income');
  const family = localStorage.getItem('furusato_family');
  const donated = localStorage.getItem('furusato_donated');

  if (income) document.getElementById('income').value = income;
  if (family) document.getElementById('familyType').value = family;
  if (donated) document.getElementById('donated').value = donated;

  renderHistory();
});
