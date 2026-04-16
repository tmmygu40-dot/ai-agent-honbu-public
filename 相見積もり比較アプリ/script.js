// State
let state = {
  vendors: [],   // ["業者A", "業者B", ...]
  items: {}      // { "項目名": { "業者A": 1000, "業者B": 800 }, ... }
};

const STORAGE_KEY = 'mitsumori_data';

// Load from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved);
  } catch (e) {
    state = { vendors: [], items: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// DOM refs
const vendorInput = document.getElementById('vendorInput');
const addVendorBtn = document.getElementById('addVendorBtn');
const vendorSelect = document.getElementById('vendorSelect');
const itemInput = document.getElementById('itemInput');
const priceInput = document.getElementById('priceInput');
const addPriceBtn = document.getElementById('addPriceBtn');
const clearBtn = document.getElementById('clearBtn');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const tableFoot = document.getElementById('tableFoot');
const emptyMsg = document.getElementById('emptyMsg');

// Add vendor
addVendorBtn.addEventListener('click', () => {
  const name = vendorInput.value.trim();
  if (!name) return;
  if (state.vendors.includes(name)) {
    alert('同じ業者名が既に存在します');
    return;
  }
  state.vendors.push(name);
  saveState();
  vendorInput.value = '';
  render();
});

vendorInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addVendorBtn.click();
});

// Add price entry
addPriceBtn.addEventListener('click', () => {
  const item = itemInput.value.trim();
  const vendor = vendorSelect.value;
  const price = parseFloat(priceInput.value);

  if (!item) { alert('項目名を入力してください'); return; }
  if (!vendor) { alert('業者を選択してください'); return; }
  if (isNaN(price) || price < 0) { alert('金額を正しく入力してください'); return; }

  if (!state.items[item]) state.items[item] = {};
  state.items[item][vendor] = price;

  saveState();
  itemInput.value = '';
  priceInput.value = '';
  render();
});

priceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addPriceBtn.click();
});

// Clear all
clearBtn.addEventListener('click', () => {
  if (!confirm('全てのデータを削除しますか？')) return;
  state = { vendors: [], items: {} };
  saveState();
  render();
});

// Remove vendor
function removeVendor(name) {
  state.vendors = state.vendors.filter(v => v !== name);
  // Remove vendor data from items
  for (const item in state.items) {
    delete state.items[item][name];
  }
  saveState();
  render();
}

// Remove item row
function removeItem(itemName) {
  delete state.items[itemName];
  saveState();
  render();
}

// Format price
function fmt(val) {
  if (val === undefined || val === null || val === '') return '—';
  return '¥' + Number(val).toLocaleString();
}

// Render
function render() {
  renderVendorSelect();
  renderTable();
}

function renderVendorSelect() {
  const current = vendorSelect.value;
  vendorSelect.innerHTML = '<option value="">業者を選択</option>';
  state.vendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (v === current) opt.selected = true;
    vendorSelect.appendChild(opt);
  });
}

function renderTable() {
  const vendors = state.vendors;
  const items = Object.keys(state.items);
  const hasData = vendors.length > 0 && items.length > 0;

  emptyMsg.style.display = hasData ? 'none' : 'block';
  document.getElementById('compareTable').style.display = hasData ? 'table' : 'none';

  if (!hasData) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    tableFoot.innerHTML = '';
    return;
  }

  // Header row
  let headHtml = '<tr><th>項目</th>';
  vendors.forEach(v => {
    headHtml += `<th>${escHtml(v)}<button class="delete-row-btn" onclick="removeVendor('${escJs(v)}')" title="削除">×</button></th>`;
  });
  headHtml += '</tr>';
  tableHead.innerHTML = headHtml;

  // Body rows
  let bodyHtml = '';
  items.forEach(item => {
    const prices = vendors.map(v => state.items[item][v]);
    const definedPrices = prices.filter(p => p !== undefined && p !== null);
    const minPrice = definedPrices.length > 0 ? Math.min(...definedPrices) : null;

    bodyHtml += `<tr>
      <td>${escHtml(item)}<button class="delete-row-btn" onclick="removeItem('${escJs(item)}')" title="削除">×</button></td>`;
    vendors.forEach(v => {
      const price = state.items[item][v];
      const isBest = (price !== undefined && price !== null && minPrice !== null && price === minPrice && definedPrices.length > 1);
      bodyHtml += `<td class="${isBest ? 'best-price' : ''}">${fmt(price)}</td>`;
    });
    bodyHtml += '</tr>';
  });
  tableBody.innerHTML = bodyHtml;

  // Footer: totals
  const totals = vendors.map(v => {
    let sum = 0;
    let hasAny = false;
    items.forEach(item => {
      const p = state.items[item][v];
      if (p !== undefined && p !== null) { sum += p; hasAny = true; }
    });
    return hasAny ? sum : null;
  });

  const definedTotals = totals.filter(t => t !== null);
  const minTotal = definedTotals.length > 0 ? Math.min(...definedTotals) : null;

  let footHtml = '<tr><td>合計</td>';
  totals.forEach(total => {
    const isBest = (total !== null && minTotal !== null && total === minTotal && definedTotals.length > 1);
    footHtml += `<td class="${isBest ? 'best-price' : ''}">${total !== null ? fmt(total) : '—'}</td>`;
  });
  footHtml += '</tr>';
  tableFoot.innerHTML = footHtml;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escJs(str) {
  return String(str).replace(/'/g, "\\'");
}

// Init
loadState();
render();
