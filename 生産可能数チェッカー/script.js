const STORAGE_KEY = 'seisan_materials';

let materials = [];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    materials = saved ? JSON.parse(saved) : [];
  } catch (e) {
    materials = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
}

function addMaterial() {
  const nameEl = document.getElementById('materialName');
  const stockEl = document.getElementById('stockQty');
  const batchEl = document.getElementById('batchQty');
  const unitEl = document.getElementById('unit');
  const errorEl = document.getElementById('errorMsg');

  const name = nameEl.value.trim();
  const stock = parseFloat(stockEl.value);
  const batch = parseFloat(batchEl.value);
  const unit = unitEl.value.trim();

  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = '材料名を入力してください';
    nameEl.focus();
    return;
  }
  if (isNaN(stock) || stock < 0) {
    errorEl.textContent = '在庫数量を正しく入力してください（0以上）';
    stockEl.focus();
    return;
  }
  if (isNaN(batch) || batch <= 0) {
    errorEl.textContent = '1バッチ使用量を正しく入力してください（0より大きい値）';
    batchEl.focus();
    return;
  }

  materials.push({
    id: Date.now(),
    name,
    stock,
    batch,
    unit
  });

  saveData();
  render();

  nameEl.value = '';
  stockEl.value = '';
  batchEl.value = '';
  unitEl.value = '';
  nameEl.focus();
}

function deleteMaterial(id) {
  materials = materials.filter(m => m.id !== id);
  saveData();
  render();
}

function calcCount(stock, batch) {
  if (batch <= 0) return 0;
  return Math.floor(stock / batch);
}

function render() {
  const tbody = document.getElementById('materialBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const summaryEl = document.getElementById('summary');
  const batchSection = document.getElementById('batchSection');
  const batchResult = document.getElementById('batchResult');
  const table = document.getElementById('materialTable');

  tbody.innerHTML = '';

  if (materials.length === 0) {
    emptyMsg.style.display = 'block';
    table.style.display = 'none';
    summaryEl.textContent = '';
    batchSection.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  table.style.display = 'table';

  const counts = materials.map(m => calcCount(m.stock, m.batch));
  const minCount = Math.min(...counts);

  materials.forEach((m, i) => {
    const count = counts[i];
    const isBottleneck = count === minCount;
    const tr = document.createElement('tr');
    if (isBottleneck) tr.classList.add('bottleneck');

    const unitStr = m.unit ? m.unit : '';
    const countClass = count === 0 ? 'count-cell zero-count' : 'count-cell';

    tr.innerHTML = `
      <td>${escapeHtml(m.name)}${isBottleneck ? '<span class="bottleneck-badge">最小</span>' : ''}</td>
      <td>${m.stock}${unitStr}</td>
      <td>${m.batch}${unitStr}</td>
      <td class="${countClass}">${count} 回</td>
      <td><button class="delete-btn" onclick="deleteMaterial(${m.id})">削除</button></td>
    `;
    tbody.appendChild(tr);
  });

  summaryEl.textContent = `${materials.length} 種類登録中`;

  batchSection.style.display = 'block';
  const isZero = minCount === 0;
  batchResult.innerHTML = `
    <div class="big-number${isZero ? ' zero' : ''}">${minCount} 回</div>
    <div class="batch-label">製造可能回数（全材料中の最小値）</div>
    <div class="batch-note">赤ハイライトの材料がボトルネックです</div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  render();

  ['materialName', 'stockQty', 'batchQty', 'unit'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addMaterial();
    });
  });
});
