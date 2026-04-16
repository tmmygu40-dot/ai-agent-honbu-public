const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const STORAGE_KEY = 'fuyou_checker_data';

let selectedLimit = 0;
let monthlyIncomes = new Array(12).fill(0);

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.limit) {
      selectedLimit = data.limit;
      const radio = document.querySelector(`input[name="limit"][value="${data.limit}"]`);
      if (radio) {
        radio.checked = true;
      } else {
        document.querySelector('input[name="limit"][value="custom"]').checked = true;
        document.getElementById('customLimit').value = data.limit;
        document.getElementById('customLimitArea').classList.remove('hidden');
      }
    }
    if (data.monthlyIncomes) {
      monthlyIncomes = data.monthlyIncomes;
      data.monthlyIncomes.forEach((val, i) => {
        const input = document.getElementById(`month_${i}`);
        if (input) input.value = val || '';
      });
    }
  } catch (e) {
    // ignore
  }
}

function saveData() {
  const data = { limit: selectedLimit, monthlyIncomes };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatYen(amount) {
  return amount.toLocaleString('ja-JP') + '円';
}

function getTotal() {
  return monthlyIncomes.reduce((sum, v) => sum + (Number(v) || 0), 0);
}

function updateDisplay() {
  const total = getTotal();
  const remaining = selectedLimit - total;
  const percent = selectedLimit > 0 ? Math.min((total / selectedLimit) * 100, 100) : 0;

  // 限度額表示
  document.getElementById('limitDisplay').textContent = selectedLimit > 0 ? formatYen(selectedLimit) : '-';

  // 収入合計
  document.getElementById('totalDisplay').textContent = formatYen(total);

  // 年間合計
  document.getElementById('yearTotal').textContent = formatYen(total);

  // 残り金額
  const remainingEl = document.getElementById('remainingDisplay');
  const progressEl = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  if (selectedLimit <= 0) {
    remainingEl.textContent = '-';
    remainingEl.className = 'remaining-amount';
    progressEl.style.width = '0%';
    progressEl.className = 'progress-bar';
    progressText.textContent = '限度額を選択してください';
    return;
  }

  if (remaining < 0) {
    remainingEl.textContent = '超過：' + formatYen(Math.abs(remaining));
    remainingEl.className = 'remaining-amount over';
    progressEl.style.width = '100%';
    progressEl.className = 'progress-bar danger';
    progressText.textContent = `限度額を ${formatYen(Math.abs(remaining))} 超過しています`;
  } else {
    remainingEl.textContent = formatYen(remaining);
    if (remaining <= 100000) {
      remainingEl.className = 'remaining-amount danger';
      progressEl.className = 'progress-bar danger';
    } else if (remaining <= 300000) {
      remainingEl.className = 'remaining-amount warning';
      progressEl.className = 'progress-bar warning';
    } else {
      remainingEl.className = 'remaining-amount';
      progressEl.className = 'progress-bar';
    }
    progressEl.style.width = percent.toFixed(1) + '%';
    progressText.textContent = `限度額の ${percent.toFixed(1)}% 使用（残り ${formatYen(remaining)}）`;
  }
}

function buildMonthGrid() {
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';
  MONTHS.forEach((label, i) => {
    const div = document.createElement('div');
    div.className = 'month-item';
    div.innerHTML = `
      <label for="month_${i}">${label}の収入（円）</label>
      <input type="number" id="month_${i}" placeholder="0" min="0" value="${monthlyIncomes[i] || ''}">
    `;
    grid.appendChild(div);
    div.querySelector('input').addEventListener('input', (e) => {
      monthlyIncomes[i] = Number(e.target.value) || 0;
      updateDisplay();
      saveData();
    });
  });
}

function init() {
  buildMonthGrid();

  // 限度額ラジオ
  document.querySelectorAll('input[name="limit"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        document.getElementById('customLimitArea').classList.remove('hidden');
        selectedLimit = Number(document.getElementById('customLimit').value) || 0;
      } else {
        document.getElementById('customLimitArea').classList.add('hidden');
        selectedLimit = Number(e.target.value);
      }
      updateDisplay();
      saveData();
    });
  });

  // カスタム入力
  document.getElementById('customLimit').addEventListener('input', (e) => {
    selectedLimit = Number(e.target.value) || 0;
    updateDisplay();
    saveData();
  });

  // リセット
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('すべてのデータをリセットしますか？')) return;
    localStorage.removeItem(STORAGE_KEY);
    selectedLimit = 0;
    monthlyIncomes = new Array(12).fill(0);
    document.querySelectorAll('input[name="limit"]').forEach(r => r.checked = false);
    document.getElementById('customLimitArea').classList.add('hidden');
    document.getElementById('customLimit').value = '';
    buildMonthGrid();
    updateDisplay();
  });

  // 保存データ読み込み
  loadData();
  updateDisplay();
}

document.addEventListener('DOMContentLoaded', init);
