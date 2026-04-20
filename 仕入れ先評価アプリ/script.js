const STORAGE_KEY = 'supplier_eval_data';

let suppliers = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    suppliers = raw ? JSON.parse(raw) : [];
  } catch {
    suppliers = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

function calcTotal(s) {
  return s.delivery + s.quality + s.price + s.stability;
}

function getSorted() {
  return [...suppliers].sort((a, b) => {
    const diff = calcTotal(b) - calcTotal(a);
    return diff !== 0 ? diff : a.registeredAt - b.registeredAt;
  });
}

function rankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}位`;
}

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return '';
}

function barWidth(score) {
  return Math.round((score / 5) * 100);
}

function render() {
  const list = document.getElementById('rankingList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countBadge = document.getElementById('countBadge');
  const sorted = getSorted();

  countBadge.textContent = `${suppliers.length} 件`;

  if (sorted.length === 0) {
    emptyMsg.style.display = '';
    list.innerHTML = '';
    return;
  }

  emptyMsg.style.display = 'none';

  list.innerHTML = sorted.map((s, idx) => {
    const rank = idx + 1;
    const total = calcTotal(s);
    const memo = s.memo ? `<div class="card-memo">📝 ${escHtml(s.memo)}</div>` : '';

    return `
      <div class="supplier-card ${rankClass(rank)}" data-id="${s.id}">
        <button class="delete-btn" onclick="deleteSupplier('${s.id}')" title="削除">✕</button>
        <div class="card-top">
          <span class="rank-badge">${rankEmoji(rank)}</span>
          <span class="supplier-name">${escHtml(s.name)}</span>
          <span class="total-score">${total}<span class="total-label">/20</span></span>
        </div>
        <div class="score-bars">
          ${scoreRow('納期', s.delivery)}
          ${scoreRow('品質', s.quality)}
          ${scoreRow('価格', s.price)}
          ${scoreRow('安定性', s.stability)}
        </div>
        ${memo}
      </div>
    `;
  }).join('');
}

function scoreRow(label, score) {
  return `
    <div class="score-row">
      <span class="score-label">${label}</span>
      <div class="bar-wrap"><div class="bar-fill" style="width:${barWidth(score)}%"></div></div>
      <span class="score-num">${score}</span>
    </div>
  `;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function deleteSupplier(id) {
  suppliers = suppliers.filter(s => s.id !== id);
  save();
  render();
}

document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  if (!name) {
    alert('仕入れ先名を入力してください');
    return;
  }

  const supplier = {
    id: Date.now().toString(),
    name,
    delivery: parseInt(document.getElementById('delivery').value),
    quality: parseInt(document.getElementById('quality').value),
    price: parseInt(document.getElementById('price').value),
    stability: parseInt(document.getElementById('stability').value),
    memo: document.getElementById('memo').value.trim(),
    registeredAt: Date.now()
  };

  suppliers.push(supplier);
  save();
  render();

  // フォームリセット
  document.getElementById('name').value = '';
  document.getElementById('delivery').value = '3';
  document.getElementById('quality').value = '3';
  document.getElementById('price').value = '3';
  document.getElementById('stability').value = '3';
  document.getElementById('memo').value = '';
  document.getElementById('name').focus();
});

// Enterキーで登録
document.getElementById('name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

load();
render();
