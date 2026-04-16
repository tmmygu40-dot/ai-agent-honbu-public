const STORAGE_KEY = 'returns_v2';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord() {
  const productName = document.getElementById('productName').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value, 10);
  const reason = document.getElementById('reason').value;
  const memo = document.getElementById('memo').value.trim();

  if (!productName) {
    alert('商品名を入力してください');
    return;
  }
  if (!reason) {
    alert('返品理由を選択してください');
    return;
  }
  if (!quantity || quantity < 1) {
    alert('数量は1以上で入力してください');
    return;
  }

  const records = loadRecords();
  records.unshift({
    id: Date.now(),
    productName,
    quantity,
    reason,
    memo,
    date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  });
  saveRecords(records);

  // フォームリセット
  document.getElementById('productName').value = '';
  document.getElementById('quantity').value = '1';
  document.getElementById('reason').value = '';
  document.getElementById('memo').value = '';

  render();
}

function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  render();
}

function clearAll() {
  if (!confirm('全ての記録を削除しますか？')) return;
  saveRecords([]);
  render();
}

function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}

function buildProductRanking(records) {
  const map = {};
  records.forEach(r => {
    if (!map[r.productName]) map[r.productName] = 0;
    map[r.productName] += r.quantity;
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1]);
}

function buildReasonSummary(records) {
  const map = {};
  records.forEach(r => {
    if (!map[r.reason]) map[r.reason] = 0;
    map[r.reason] += r.quantity;
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1]);
}

function renderRanking(entries, containerId) {
  const el = document.getElementById(containerId);
  if (entries.length === 0) {
    el.innerHTML = '<div class="empty-msg">データがありません</div>';
    return;
  }

  const max = entries[0][1];
  const rankClasses = ['gold', 'silver', 'bronze'];

  el.innerHTML = entries.map(([name, count], i) => {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    const rankClass = rankClasses[i] || '';
    return `
      <div class="ranking-item">
        <span class="rank-num ${rankClass}">${i + 1}位</span>
        <span class="rank-name">${escHtml(name)}</span>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="rank-count">${count}点</span>
      </div>`;
  }).join('');
}

function renderRecords(records) {
  const el = document.getElementById('recordList');
  document.getElementById('totalCount').textContent = records.length + '件';

  if (records.length === 0) {
    el.innerHTML = '<div class="empty-msg">記録がありません</div>';
    return;
  }

  el.innerHTML = records.map(r => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-product">${escHtml(r.productName)}</div>
        <div class="record-detail">数量：${r.quantity}点${r.memo ? ' ／ ' + escHtml(r.memo) : ''}</div>
        <span class="record-reason">${escHtml(r.reason)}</span>
        <div class="record-date">${r.date}</div>
      </div>
      <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
    </div>`).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  const records = loadRecords();
  renderRecords(records);
  renderRanking(buildProductRanking(records), 'productRanking');
  renderRanking(buildReasonSummary(records), 'reasonSummary');
}

render();
