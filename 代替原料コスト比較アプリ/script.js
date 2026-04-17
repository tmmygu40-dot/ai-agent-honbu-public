const STORAGE_KEY = 'daigaiGenryo_v1';

let state = {
  current: { name: '', price: 0, qty: 0, unit: '' },
  sellingPrice: 0,
  alternatives: [] // { id, name, price, qty, note }
};

// ---- Helpers ----
function calcCost(price, qty) {
  return price * qty;
}

function calcCostRate(cost, selling) {
  if (!selling || selling <= 0) return null;
  return (cost / selling) * 100;
}

function fmt(n) {
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

function fmtRate(r) {
  if (r === null) return '—';
  return r.toFixed(1) + '%';
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Save / Load ----
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state = saved;
    restoreInputs();
    render();
  } catch (e) {}
}

function restoreInputs() {
  const c = state.current;
  document.getElementById('currentName').value = c.name || '';
  document.getElementById('currentPrice').value = c.price || '';
  document.getElementById('currentQty').value = c.qty || '';
  document.getElementById('currentUnit').value = c.unit || '';
  document.getElementById('sellingPrice').value = state.sellingPrice || '';
}

// ---- Render ----
function renderCurrentResult() {
  const c = state.current;
  const sel = state.sellingPrice;
  const el = document.getElementById('currentResult');

  if (!c.name && !c.price && !c.qty) {
    el.classList.remove('active');
    return;
  }

  const cost = calcCost(c.price, c.qty);
  const rate = calcCostRate(cost, sel);
  el.classList.add('active');
  el.innerHTML =
    `現行原料「<span>${c.name || '—'}</span>」の原価：<span>${fmt(cost)} 円</span>` +
    (rate !== null ? `　コスト率：<span>${fmtRate(rate)}</span>` : '');
}

function render() {
  renderCurrentResult();

  const c = state.current;
  const sel = state.sellingPrice;
  const currentCost = calcCost(c.price, c.qty);
  const currentRate = calcCostRate(currentCost, sel);

  const tbody = document.getElementById('compareBody');
  const section = document.getElementById('compareSection');

  if (state.alternatives.length === 0 && !c.name && !c.price) {
    section.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  tbody.innerHTML = '';

  // Current row
  const curRow = document.createElement('tr');
  curRow.className = 'row-current';
  curRow.innerHTML = `
    <td>${c.name || '（現行）'}</td>
    <td>${c.price ? fmt(c.price) + '円' : '—'}</td>
    <td>${c.qty ? fmt(c.qty) + (c.unit ? ' ' + c.unit : '') : '—'}</td>
    <td>${fmt(currentCost)} 円</td>
    <td class="cost-same">—（基準）</td>
    <td>${fmtRate(currentRate)}</td>
    <td class="cost-same">—（基準）</td>
    <td>現行</td>
    <td></td>
  `;
  tbody.appendChild(curRow);

  // Alternative rows
  state.alternatives.forEach(alt => {
    const altCost = calcCost(alt.price, alt.qty);
    const altRate = calcCostRate(altCost, sel);
    const diff = altCost - currentCost;
    const rateDiff = (altRate !== null && currentRate !== null) ? altRate - currentRate : null;

    let diffClass = 'cost-same';
    let diffText = '±0 円';
    if (diff < 0) { diffClass = 'cost-down'; diffText = `▼ ${fmt(Math.abs(diff))} 円`; }
    else if (diff > 0) { diffClass = 'cost-up'; diffText = `▲ ${fmt(diff)} 円`; }

    let rateDiffClass = 'cost-same';
    let rateDiffText = '±0%';
    if (rateDiff !== null) {
      if (rateDiff < -0.005) { rateDiffClass = 'cost-down'; rateDiffText = `▼ ${Math.abs(rateDiff).toFixed(1)}%`; }
      else if (rateDiff > 0.005) { rateDiffClass = 'cost-up'; rateDiffText = `▲ ${rateDiff.toFixed(1)}%`; }
      else { rateDiffText = '±0%'; }
    } else {
      rateDiffText = '—';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${alt.name || '—'}</td>
      <td>${fmt(alt.price)} 円</td>
      <td>${fmt(alt.qty)}${alt.unit || (c.unit ? ' ' + c.unit : '')}</td>
      <td>${fmt(altCost)} 円</td>
      <td class="${diffClass}">${diffText}</td>
      <td>${fmtRate(altRate)}</td>
      <td class="${rateDiffClass}">${rateDiffText}</td>
      <td>${alt.note || ''}</td>
      <td><button class="btn-del" data-id="${alt.id}">削除</button></td>
    `;
    tbody.appendChild(row);
  });
}

// ---- Events ----
function getCurrentInputs() {
  return {
    name: document.getElementById('currentName').value.trim(),
    price: parseFloat(document.getElementById('currentPrice').value) || 0,
    qty: parseFloat(document.getElementById('currentQty').value) || 0,
    unit: document.getElementById('currentUnit').value.trim()
  };
}

function getSellingPrice() {
  return parseFloat(document.getElementById('sellingPrice').value) || 0;
}

// Auto-update on current inputs change
['currentName', 'currentPrice', 'currentQty', 'currentUnit', 'sellingPrice'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    state.current = getCurrentInputs();
    state.sellingPrice = getSellingPrice();
    save();
    render();
  });
});

// Add alternative
document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('altName').value.trim();
  const price = parseFloat(document.getElementById('altPrice').value);
  const qty = parseFloat(document.getElementById('altQty').value);
  const note = document.getElementById('altNote').value.trim();

  if (!name || isNaN(price) || isNaN(qty)) {
    alert('代替原料名・単価・使用量を入力してください');
    return;
  }

  // Read current state fresh before adding
  state.current = getCurrentInputs();
  state.sellingPrice = getSellingPrice();

  state.alternatives.push({ id: genId(), name, price, qty, note });
  save();
  render();

  // Clear alt inputs
  document.getElementById('altName').value = '';
  document.getElementById('altPrice').value = '';
  document.getElementById('altQty').value = '';
  document.getElementById('altNote').value = '';
});

// Delete alternative
document.getElementById('compareBody').addEventListener('click', e => {
  if (e.target.classList.contains('btn-del')) {
    const id = e.target.dataset.id;
    state.alternatives = state.alternatives.filter(a => a.id !== id);
    save();
    render();
  }
});

// ---- Init ----
load();
