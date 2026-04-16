// ---- データ管理 ----
const STORAGE_KEY = 'kpi_data_v1';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let records = loadData();

// ---- ユーティリティ ----
function calcRate(target, actual) {
  if (!target || target === 0) return null;
  return Math.round((actual / target) * 100);
}

function rateBadge(rate) {
  if (rate === null) return '<span class="rate-badge rate-none">-</span>';
  const cls = rate >= 100 ? 'rate-high' : rate >= 70 ? 'rate-mid' : 'rate-low';
  return `<span class="rate-badge ${cls}">${rate}%</span>`;
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function momDisplay(records, name, month, actual) {
  const prev = prevMonth(month);
  const prevRec = records.find(r => r.name === name && r.month === prev);
  if (!prevRec) return '<span class="mom-none">-</span>';
  const diff = actual - prevRec.actual;
  const sign = diff > 0 ? '+' : '';
  const cls = diff > 0 ? 'mom-up' : diff < 0 ? 'mom-down' : 'mom-none';
  return `<span class="${cls}">${sign}${diff}</span>`;
}

// ---- 一意KPI名リスト ----
function uniqueNames() {
  return [...new Set(records.map(r => r.name))].sort();
}

function updateFilter() {
  const sel = document.getElementById('filterName');
  const current = sel.value;
  sel.innerHTML = '<option value="">すべて</option>';
  uniqueNames().forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    if (n === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ---- テーブル描画 ----
function renderTable() {
  const filterName = document.getElementById('filterName').value;
  const tbody = document.getElementById('kpiBody');
  tbody.innerHTML = '';

  let filtered = records.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return a.month < b.month ? 1 : -1;
  });

  if (filterName) filtered = filtered.filter(r => r.name === filterName);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">データがありません</td></tr>`;
    document.getElementById('chartArea').style.display = 'none';
    return;
  }

  filtered.forEach(r => {
    const rate = calcRate(r.target, r.actual);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(r.name)}</td>
      <td>${r.month}</td>
      <td>${r.target.toLocaleString()}</td>
      <td>${r.actual.toLocaleString()}</td>
      <td>${rateBadge(rate)}</td>
      <td>${momDisplay(records, r.name, r.month, r.actual)}</td>
      <td><button class="btn-del" data-id="${r.id}" title="削除">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  // 削除ボタン
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      records = records.filter(r => r.id !== id);
      saveData(records);
      updateFilter();
      renderTable();
      renderChart();
    });
  });

  renderChart();
}

// ---- グラフ描画（Canvas API） ----
function renderChart() {
  const filterName = document.getElementById('filterName').value;
  const chartArea = document.getElementById('chartArea');

  if (!filterName) {
    chartArea.style.display = 'none';
    return;
  }

  const data = records
    .filter(r => r.name === filterName)
    .sort((a, b) => a.month < b.month ? -1 : 1);

  if (data.length === 0) {
    chartArea.style.display = 'none';
    return;
  }

  chartArea.style.display = 'block';
  document.getElementById('chartTitle').textContent = `${filterName} ― 月次推移`;

  const canvas = document.getElementById('kpiChart');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 600;
  const H = 220;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const allVals = data.flatMap(d => [d.target, d.actual]).filter(v => v !== undefined);
  const maxVal = Math.max(...allVals, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const n = data.length;
  const barW = Math.min(40, chartW / (n * 2.5));
  const gap = chartW / n;

  // 軸
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  // Y軸目盛
  ctx.fillStyle = '#888';
  ctx.font = `11px sans-serif`;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = minVal + (range * i / 4);
    const y = pad.top + chartH - (chartH * i / 4);
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 6, y + 4);
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  // 棒グラフ（目標・実績）
  data.forEach((d, i) => {
    const cx = pad.left + gap * i + gap / 2;

    // 目標バー
    const targetH = chartH * (d.target - minVal) / range;
    ctx.fillStyle = 'rgba(74,144,217,0.35)';
    ctx.fillRect(cx - barW, pad.top + chartH - targetH, barW, targetH);
    ctx.strokeStyle = '#4a90d9';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - barW, pad.top + chartH - targetH, barW, targetH);

    // 実績バー
    const actualH = chartH * (d.actual - minVal) / range;
    ctx.fillStyle = 'rgba(46,125,50,0.5)';
    ctx.fillRect(cx + 2, pad.top + chartH - actualH, barW, actualH);
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 2, pad.top + chartH - actualH, barW, actualH);

    // X軸ラベル
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.month.slice(5) + '月', cx, pad.top + chartH + 16);
    ctx.fillText(d.month.slice(0, 4), cx, pad.top + chartH + 28);
  });

  // 達成率 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#e53935';
  ctx.lineWidth = 2;
  data.forEach((d, i) => {
    const cx = pad.left + gap * i + gap / 2;
    const rate = d.target > 0 ? (d.actual / d.target) : 0;
    const rateY = pad.top + chartH - (chartH * Math.min(rate, 2) / 2); // 200%上限で描画
    if (i === 0) ctx.moveTo(cx, rateY);
    else ctx.lineTo(cx, rateY);
  });
  ctx.stroke();

  // 凡例
  const lx = pad.left + chartW - 10;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  [
    { color: 'rgba(74,144,217,0.6)', label: '目標' },
    { color: 'rgba(46,125,50,0.6)', label: '実績' },
    { color: '#e53935', label: '達成率(右Y軸200%=上端)' },
  ].forEach((item, i) => {
    ctx.fillStyle = item.color;
    ctx.fillRect(lx - 60, pad.top + i * 16, 12, 10);
    ctx.fillStyle = '#555';
    ctx.fillText(item.label, lx, pad.top + i * 16 + 9);
  });
}

// ---- 登録処理 ----
document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('kpiName').value.trim();
  const month = document.getElementById('kpiMonth').value;
  const target = parseFloat(document.getElementById('kpiTarget').value);
  const actual = parseFloat(document.getElementById('kpiActual').value);

  if (!name) { alert('KPI名を入力してください'); return; }
  if (!month) { alert('年月を選択してください'); return; }
  if (isNaN(target) || target < 0) { alert('目標値を入力してください'); return; }
  if (isNaN(actual) || actual < 0) { alert('実績値を入力してください'); return; }

  // 同一KPI名・同月は上書き
  const existing = records.findIndex(r => r.name === name && r.month === month);
  if (existing >= 0) {
    if (!confirm(`「${name} / ${month}」は既に登録されています。上書きしますか？`)) return;
    records[existing] = { ...records[existing], target, actual };
  } else {
    records.push({ id: Date.now(), name, month, target, actual });
  }

  saveData(records);
  updateFilter();
  renderTable();

  // 入力クリア（名前・月は保持）
  document.getElementById('kpiTarget').value = '';
  document.getElementById('kpiActual').value = '';
});

// ---- フィルター変更 ----
document.getElementById('filterName').addEventListener('change', () => {
  renderTable();
});

// ---- XSS対策 ----
function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---- 初期化 ----
(function init() {
  // 今月をデフォルト選択
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('kpiMonth').value = ym;

  updateFilter();
  renderTable();
})();
