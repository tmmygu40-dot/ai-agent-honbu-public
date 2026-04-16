const DENOMINATIONS = [
  { name: '10,000円', value: 10000 },
  { name: '5,000円',  value: 5000  },
  { name: '2,000円',  value: 2000  },
  { name: '1,000円',  value: 1000  },
  { name: '500円',    value: 500   },
  { name: '100円',    value: 100   },
  { name: '50円',     value: 50    },
  { name: '10円',     value: 10    },
  { name: '5円',      value: 5     },
  { name: '1円',      value: 1     },
];

const tbody = document.getElementById('denominationBody');
const totalAmountEl = document.getElementById('totalAmount');
const diffAmountEl = document.getElementById('diffAmount');
const diffLabelEl = document.getElementById('diffLabel');
const baseAmountInput = document.getElementById('baseAmount');
const resetBtn = document.getElementById('resetBtn');

// 入力フィールドの参照を保持
const inputs = [];

function formatNum(n) {
  return n.toLocaleString('ja-JP');
}

function buildTable() {
  DENOMINATIONS.forEach((denom, i) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'denom-name';
    tdName.textContent = denom.name;

    const tdInput = document.createElement('td');
    tdInput.className = 'denom-input-cell';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = '0';
    input.className = 'denom-input';
    input.inputMode = 'numeric';
    input.dataset.index = i;
    input.addEventListener('input', onInputChange);
    input.addEventListener('focus', () => input.select());
    tdInput.appendChild(input);
    inputs.push(input);

    const tdSubtotal = document.createElement('td');
    tdSubtotal.className = 'denom-subtotal';
    tdSubtotal.id = `subtotal-${i}`;
    tdSubtotal.textContent = '0 円';

    tr.appendChild(tdName);
    tr.appendChild(tdInput);
    tr.appendChild(tdSubtotal);
    tbody.appendChild(tr);
  });
}

function getCount(input) {
  const v = parseInt(input.value, 10);
  return isNaN(v) || v < 0 ? 0 : v;
}

function calcTotal() {
  let total = 0;
  inputs.forEach((input, i) => {
    const count = getCount(input);
    const subtotal = count * DENOMINATIONS[i].value;
    total += subtotal;
    document.getElementById(`subtotal-${i}`).textContent = formatNum(subtotal) + ' 円';
  });
  return total;
}

function updateResult(total) {
  totalAmountEl.textContent = formatNum(total) + ' 円';

  const base = parseInt(baseAmountInput.value, 10);
  if (isNaN(base) || baseAmountInput.value === '') {
    diffLabelEl.textContent = '基準金額を入力してください';
    diffAmountEl.textContent = '-';
    diffAmountEl.className = 'diff-amount';
    return;
  }

  const diff = total - base;
  diffAmountEl.className = 'diff-amount';

  if (diff === 0) {
    diffLabelEl.textContent = 'ぴったり！';
    diffAmountEl.textContent = '0 円';
    diffAmountEl.classList.add('exact');
  } else if (diff > 0) {
    diffLabelEl.textContent = '余剰（多い）';
    diffAmountEl.textContent = '+' + formatNum(diff) + ' 円';
    diffAmountEl.classList.add('surplus');
  } else {
    diffLabelEl.textContent = '不足（少ない）';
    diffAmountEl.textContent = '−' + formatNum(Math.abs(diff)) + ' 円';
    diffAmountEl.classList.add('shortage');
  }
}

function onInputChange() {
  const total = calcTotal();
  updateResult(total);
  saveState();
}

function saveState() {
  const counts = inputs.map(inp => getCount(inp));
  const base = baseAmountInput.value;
  localStorage.setItem('reji_counts', JSON.stringify(counts));
  localStorage.setItem('reji_base', base);
}

function loadState() {
  const savedBase = localStorage.getItem('reji_base');
  if (savedBase !== null) {
    baseAmountInput.value = savedBase;
  }

  const savedCounts = localStorage.getItem('reji_counts');
  if (savedCounts) {
    try {
      const counts = JSON.parse(savedCounts);
      counts.forEach((count, i) => {
        if (inputs[i]) inputs[i].value = count;
      });
    } catch (e) {
      // ignore
    }
  }
}

function reset() {
  inputs.forEach(inp => { inp.value = 0; });
  baseAmountInput.value = '';
  inputs.forEach((input, i) => {
    document.getElementById(`subtotal-${i}`).textContent = '0 円';
  });
  totalAmountEl.textContent = '0 円';
  diffLabelEl.textContent = '-';
  diffAmountEl.textContent = '0 円';
  diffAmountEl.className = 'diff-amount';
  localStorage.removeItem('reji_counts');
  localStorage.removeItem('reji_base');
}

buildTable();
loadState();
const initialTotal = calcTotal();
updateResult(initialTotal);

baseAmountInput.addEventListener('input', () => {
  const total = calcTotal();
  updateResult(total);
  saveState();
});

resetBtn.addEventListener('click', reset);
