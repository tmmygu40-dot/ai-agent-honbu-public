const STORAGE_KEY = 'adEffectRecords';

let records = loadRecords();

// 今日の日付をデフォルト設定
document.getElementById('date').value = today();

document.getElementById('addBtn').addEventListener('click', addRecord);

function today() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord() {
  const date = document.getElementById('date').value;
  const area = document.getElementById('area').value.trim();
  const distributed = parseInt(document.getElementById('distributed').value);
  const response = parseInt(document.getElementById('response').value);

  if (!date || !area || isNaN(distributed) || distributed <= 0 || isNaN(response) || response < 0) {
    alert('日付・エリア名・配布部数（1以上）・反響数を入力してください');
    return;
  }

  const record = {
    id: Date.now(),
    date,
    area,
    distributed,
    response
  };

  records.unshift(record);
  saveRecords();
  renderAll();

  // フォームリセット（日付とエリアは残す）
  document.getElementById('distributed').value = '';
  document.getElementById('response').value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderAll();
}

function calcRate(distributed, response) {
  if (distributed === 0) return 0;
  return (response / distributed * 100);
}

function formatRate(rate) {
  return rate.toFixed(2) + '%';
}

function getRateClass(rate) {
  if (rate >= 3) return 'high';
  if (rate >= 1) return 'mid';
  return 'low';
}

function renderAll() {
  renderSummary();
  renderRecords();
}

function renderSummary() {
  const container = document.getElementById('summaryList');

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // エリアごとに集計
  const areaMap = {};
  records.forEach(r => {
    if (!areaMap[r.area]) {
      areaMap[r.area] = { distributed: 0, response: 0 };
    }
    areaMap[r.area].distributed += r.distributed;
    areaMap[r.area].response += r.response;
  });

  // 反響率順にソート
  const sorted = Object.entries(areaMap)
    .map(([area, stats]) => ({
      area,
      ...stats,
      rate: calcRate(stats.distributed, stats.response)
    }))
    .sort((a, b) => b.rate - a.rate);

  container.innerHTML = sorted.map(item => `
    <div class="summary-item">
      <div class="summary-area">${escapeHtml(item.area)}</div>
      <div class="summary-stat">
        <span>${item.distributed.toLocaleString()}</span>
        部数
      </div>
      <div class="summary-stat">
        <span>${item.response.toLocaleString()}</span>
        反響
      </div>
      <div class="summary-rate ${getRateClass(item.rate)}">${formatRate(item.rate)}</div>
    </div>
  `).join('');
}

function renderRecords() {
  const container = document.getElementById('recordList');
  const countEl = document.getElementById('totalCount');

  countEl.textContent = `${records.length}件`;

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  container.innerHTML = records.map(r => {
    const rate = calcRate(r.distributed, r.response);
    return `
      <div class="record-item">
        <div class="record-info">
          <div class="record-area">${escapeHtml(r.area)}</div>
          <div class="record-date">${r.date}</div>
        </div>
        <div class="record-stats">
          <div class="record-num">
            <span>${r.distributed.toLocaleString()}</span>
            部数
          </div>
          <div class="record-num">
            <span>${r.response.toLocaleString()}</span>
            反響
          </div>
          <div class="record-rate-badge">${formatRate(rate)}</div>
        </div>
        <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期描画
renderAll();
