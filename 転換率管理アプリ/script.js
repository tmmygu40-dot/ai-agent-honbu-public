const STORAGE_KEY = 'tenkan_data';

let records = [];

function loadData() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function calcRate(visitors, buyers) {
  if (!visitors || visitors === 0) return 0;
  return (buyers / visitors) * 100;
}

function formatRate(rate) {
  return rate.toFixed(1) + '%';
}

function formatSales(sales) {
  return '¥' + sales.toLocaleString();
}

function getRateClass(rate) {
  if (rate >= 30) return 'rate-high';
  if (rate >= 15) return 'rate-mid';
  return 'rate-low';
}

// フォームのリアルタイムプレビュー
function updatePreview() {
  const visitors = parseInt(document.getElementById('visitors').value) || 0;
  const buyers = parseInt(document.getElementById('buyers').value) || 0;
  const unitPrice = parseInt(document.getElementById('unitPrice').value) || 0;
  const preview = document.getElementById('preview');

  if (visitors > 0 || buyers > 0 || unitPrice > 0) {
    const rate = calcRate(visitors, buyers);
    const sales = buyers * unitPrice;
    document.getElementById('previewRate').textContent = formatRate(rate);
    document.getElementById('previewSales').textContent = formatSales(sales);
    preview.style.display = 'flex';
  } else {
    preview.style.display = 'none';
  }
}

['visitors', 'buyers', 'unitPrice'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});

// 追加ボタン
document.getElementById('addBtn').addEventListener('click', () => {
  const date = document.getElementById('date').value;
  const visitors = parseInt(document.getElementById('visitors').value);
  const buyers = parseInt(document.getElementById('buyers').value);
  const unitPrice = parseInt(document.getElementById('unitPrice').value);

  if (!date) { alert('日付を入力してください'); return; }
  if (isNaN(visitors) || visitors < 0) { alert('来客数を正しく入力してください'); return; }
  if (isNaN(buyers) || buyers < 0) { alert('購入人数を正しく入力してください'); return; }
  if (isNaN(unitPrice) || unitPrice < 0) { alert('客単価を正しく入力してください'); return; }
  if (buyers > visitors) { alert('購入人数が来客数を超えています'); return; }

  const rate = calcRate(visitors, buyers);
  const sales = buyers * unitPrice;

  records.push({ id: Date.now(), date, visitors, buyers, unitPrice, rate, sales });
  records.sort((a, b) => a.date.localeCompare(b.date));
  saveData();
  render();

  // フォームリセット
  document.getElementById('visitors').value = '';
  document.getElementById('buyers').value = '';
  document.getElementById('unitPrice').value = '';
  document.getElementById('preview').style.display = 'none';
});

// 削除
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveData();
  render();
}

// レンダリング
function render() {
  renderTable();
  renderSummary();
  renderChart();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const table = document.getElementById('dataTable');
  const emptyMsg = document.getElementById('emptyMsg');

  if (records.length === 0) {
    table.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyMsg.style.display = 'none';

  tbody.innerHTML = records.slice().reverse().map(r => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.visitors.toLocaleString()}</td>
      <td>${r.buyers.toLocaleString()}</td>
      <td>${formatSales(r.unitPrice)}</td>
      <td class="rate-cell ${getRateClass(r.rate)}">${formatRate(r.rate)}</td>
      <td>${formatSales(r.sales)}</td>
      <td><button class="btn-delete" onclick="deleteRecord(${r.id})">削除</button></td>
    </tr>
  `).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderSummary() {
  const section = document.getElementById('summarySection');
  if (records.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const avgRate = records.reduce((s, r) => s + r.rate, 0) / records.length;
  const totalSales = records.reduce((s, r) => s + r.sales, 0);

  document.getElementById('avgRate').textContent = formatRate(avgRate);
  document.getElementById('totalSales').textContent = formatSales(totalSales);
  document.getElementById('recordCount').textContent = records.length + '日';
}

// グラフ（Canvas）
function renderChart() {
  const section = document.getElementById('chartSection');
  if (records.length < 2) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const canvas = document.getElementById('rateChart');
  const ctx = canvas.getContext('2d');
  const wrapper = canvas.parentElement;

  const dpr = window.devicePixelRatio || 1;
  const W = wrapper.clientWidth;
  const H = wrapper.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 16, bottom: 36, left: 48 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  const rates = records.map(r => r.rate);
  const maxRate = Math.max(...rates, 10);
  const minRate = 0;

  // グリッドと軸ラベル
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#999';
  ctx.font = '11px sans-serif';

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxRate / steps) * i;
    const y = pad.top + ch - (val / maxRate) * ch;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0) + '%', pad.left - 6, y + 4);
  }

  // X軸ラベル
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(records.length / 6));
  records.forEach((r, i) => {
    if (i % step === 0 || i === records.length - 1) {
      const x = pad.left + (i / (records.length - 1)) * cw;
      const y = pad.top + ch + 18;
      ctx.fillText(formatDate(r.date), x, y);
    }
  });

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#2196f3';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  records.forEach((r, i) => {
    const x = pad.left + (i / (records.length - 1)) * cw;
    const y = pad.top + ch - ((r.rate - minRate) / (maxRate - minRate)) * ch;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 点
  records.forEach((r, i) => {
    const x = pad.left + (i / (records.length - 1)) * cw;
    const y = pad.top + ch - ((r.rate - minRate) / (maxRate - minRate)) * ch;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2196f3';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

// 今日の日付をデフォルト設定
function setTodayDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${y}-${m}-${d}`;
}

// リサイズ時グラフ再描画
window.addEventListener('resize', () => {
  if (records.length >= 2) renderChart();
});

// 初期化
loadData();
setTodayDate();
render();
