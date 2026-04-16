const STORAGE_KEY = 'rehab_records';

let records = [];

// --- DOM要素 ---
const dateInput = document.getElementById('date');
const exerciseInput = document.getElementById('exercise');
const countInput = document.getElementById('count');
const painInput = document.getElementById('pain');
const painValue = document.getElementById('painValue');
const memoInput = document.getElementById('memo');
const addBtn = document.getElementById('addBtn');
const recordList = document.getElementById('recordList');
const recordCount = document.getElementById('recordCount');
const painChart = document.getElementById('painChart');
const chartEmpty = document.getElementById('chartEmpty');

// --- 初期化 ---
function init() {
  // デフォルト日付を今日に
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;

  // ストレージから読み込み
  const stored = localStorage.getItem(STORAGE_KEY);
  records = stored ? JSON.parse(stored) : [];

  render();
}

// --- 痛みスライダー表示更新 ---
painInput.addEventListener('input', () => {
  painValue.textContent = painInput.value;
});

// --- 追加ボタン ---
addBtn.addEventListener('click', () => {
  const date = dateInput.value;
  const exercise = exerciseInput.value.trim();
  const count = countInput.value.trim();
  const pain = parseInt(painInput.value);
  const memo = memoInput.value.trim();

  if (!date || !exercise) {
    alert('日付と訓練内容は必須です。');
    return;
  }

  const newRecord = {
    id: Date.now(),
    date,
    exercise,
    count,
    pain,
    memo,
  };

  records.push(newRecord);
  save();
  render();

  // フォームリセット（日付・痛みは維持）
  exerciseInput.value = '';
  countInput.value = '';
  memoInput.value = '';
});

// --- 保存 ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- 描画 ---
function render() {
  renderList();
  renderChart();
  recordCount.textContent = `${records.length} 件`;
}

// 一覧描画
function renderList() {
  if (records.length === 0) {
    recordList.innerHTML = '<p class="empty-text">まだ記録がありません</p>';
    return;
  }

  // 新しい順にソート
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  recordList.innerHTML = sorted.map(r => {
    const painClass = r.pain <= 3 ? 'pain-low' : r.pain <= 6 ? 'pain-mid' : 'pain-high';
    const painEmoji = r.pain <= 3 ? '😊' : r.pain <= 6 ? '😐' : '😣';
    const memoHTML = r.memo ? `<span class="record-memo">📝 ${escapeHtml(r.memo)}</span>` : '';
    const countHTML = r.count ? `<span class="record-count">🔁 ${escapeHtml(r.count)}</span>` : '';

    return `
      <div class="record-item">
        <div class="record-top">
          <div>
            <div class="record-date">${formatDate(r.date)}</div>
            <div class="record-exercise">${escapeHtml(r.exercise)}</div>
          </div>
          <button class="delete-btn" onclick="deleteRecord(${r.id})" title="削除">✕</button>
        </div>
        <div class="record-bottom">
          ${countHTML}
          <span class="pain-badge ${painClass}">${painEmoji} 痛み ${r.pain}</span>
          ${memoHTML}
        </div>
      </div>
    `;
  }).join('');
}

// グラフ描画（Canvas API による折れ線グラフ）
function renderChart() {
  if (records.length < 2) {
    painChart.style.display = 'none';
    chartEmpty.style.display = 'block';
    return;
  }

  painChart.style.display = 'block';
  chartEmpty.style.display = 'none';

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const canvas = painChart;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth || 600;
  const cssHeight = 160;

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = cssWidth;
  const H = cssHeight;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  ctx.clearRect(0, 0, W, H);

  // 背景グリッド
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 2) {
    const y = padTop + chartH - (i / 10) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(i, padLeft - 4, y + 4);
  }

  // X軸
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop + chartH);
  ctx.lineTo(padLeft + chartW, padTop + chartH);
  ctx.stroke();

  const n = sorted.length;
  const step = chartW / Math.max(n - 1, 1);

  // 塗りつぶしエリア
  ctx.beginPath();
  sorted.forEach((r, i) => {
    const x = padLeft + i * step;
    const y = padTop + chartH - (r.pain / 10) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  const lastX = padLeft + (n - 1) * step;
  ctx.lineTo(lastX, padTop + chartH);
  ctx.lineTo(padLeft, padTop + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(59,130,246,0.1)';
  ctx.fill();

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  sorted.forEach((r, i) => {
    const x = padLeft + i * step;
    const y = padTop + chartH - (r.pain / 10) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // データ点
  sorted.forEach((r, i) => {
    const x = padLeft + i * step;
    const y = padTop + chartH - (r.pain / 10) * chartH;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // X軸ラベル（最初・最後・中間を適度に表示）
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const labelStep = n <= 7 ? 1 : Math.ceil(n / 7);
  sorted.forEach((r, i) => {
    if (i % labelStep === 0 || i === n - 1) {
      const x = padLeft + i * step;
      const label = r.date.slice(5); // MM-DD
      ctx.fillText(label, x, padTop + chartH + 14);
    }
  });
}

// --- 削除 ---
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  save();
  render();
}

// --- ユーティリティ ---
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dow = days[new Date(dateStr).getDay()];
  return `${y}/${m}/${d}（${dow}）`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 起動 ---
init();
