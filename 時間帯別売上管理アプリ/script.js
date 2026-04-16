// ---- データ管理 ----
// data 構造: { "2026-04-14": { "9": 15000, "10": 8000, ... }, ... }

const STORAGE_KEY = 'jikan_uriage_data';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---- 初期化 ----
const dateInput = document.getElementById('dateInput');
const hourInput = document.getElementById('hourInput');
const amountInput = document.getElementById('amountInput');
const addBtn = document.getElementById('addBtn');
const viewDate = document.getElementById('viewDate');
const viewBtn = document.getElementById('viewBtn');

// 今日の日付をデフォルト
const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;
viewDate.value = today;

// 時間帯セレクト生成（0〜23時）
for (let h = 0; h < 24; h++) {
  const opt = document.createElement('option');
  opt.value = h;
  opt.textContent = `${String(h).padStart(2, '0')}:00`;
  hourInput.appendChild(opt);
}
// デフォルトを現在の時間に
hourInput.value = new Date().getHours();

// ---- 売上追加 ----
addBtn.addEventListener('click', () => {
  const date = dateInput.value;
  const hour = hourInput.value;
  const amount = parseInt(amountInput.value, 10);

  if (!date) { alert('日付を入力してください'); return; }
  if (isNaN(amount) || amount < 0) { alert('売上金額を正しく入力してください'); return; }

  const data = loadData();
  if (!data[date]) data[date] = {};
  data[date][hour] = (data[date][hour] || 0) + amount;
  saveData(data);

  amountInput.value = '';
  renderDateList();

  // 追加後、その日付で表示更新
  viewDate.value = date;
  renderDayView(date);
  alert(`${date} ${String(hour).padStart(2,'0')}:00 の売上 ${amount.toLocaleString()}円 を追加しました`);
});

// ---- 日付表示 ----
viewBtn.addEventListener('click', () => {
  const date = viewDate.value;
  if (!date) { alert('日付を選択してください'); return; }
  renderDayView(date);
});

function renderDayView(date) {
  const data = loadData();
  const dayData = data[date] || {};

  const peakSection = document.getElementById('peakSection');
  const chartSection = document.getElementById('chartSection');
  const listSection = document.getElementById('listSection');
  const peakInfo = document.getElementById('peakInfo');
  const salesList = document.getElementById('salesList');

  // 合計・ピーク計算
  let total = 0;
  let peakHour = null;
  let peakAmount = 0;

  Object.entries(dayData).forEach(([h, amt]) => {
    total += amt;
    if (amt > peakAmount) {
      peakAmount = amt;
      peakHour = h;
    }
  });

  if (Object.keys(dayData).length === 0) {
    peakSection.style.display = 'none';
    chartSection.style.display = 'none';
    listSection.style.display = 'none';
    return;
  }

  // ピーク表示
  peakSection.style.display = 'block';
  peakInfo.innerHTML = `
    <div>📅 ${date} の売上合計：<strong>${total.toLocaleString()}円</strong></div>
    <div>🔥 ピーク時間帯：<span class="peak-label">${String(peakHour).padStart(2,'0')}:00</span>（${peakAmount.toLocaleString()}円）</div>
  `;

  // グラフ描画
  chartSection.style.display = 'block';
  drawChart(dayData);

  // 一覧表示
  listSection.style.display = 'block';
  salesList.innerHTML = '';

  const sortedHours = Object.keys(dayData).map(Number).sort((a, b) => a - b);
  sortedHours.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${String(h).padStart(2,'0')}:00</td>
      <td>${dayData[h].toLocaleString()}円</td>
      <td><button class="del-btn" data-date="${date}" data-hour="${h}">✕</button></td>
    `;
    salesList.appendChild(tr);
  });

  // 削除ボタン
  salesList.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.date;
      const h = btn.dataset.hour;
      if (!confirm(`${String(h).padStart(2,'0')}:00 の売上を削除しますか？`)) return;
      const data = loadData();
      if (data[d]) {
        delete data[d][h];
        if (Object.keys(data[d]).length === 0) delete data[d];
        saveData(data);
      }
      renderDateList();
      renderDayView(d);
    });
  });
}

// ---- 棒グラフ描画 ----
function drawChart(dayData) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');

  // 実際の描画サイズ設定
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth - 32;
  canvas.height = 220;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const hours = Object.keys(dayData).map(Number).sort((a, b) => a - b);
  if (hours.length === 0) return;

  const maxAmount = Math.max(...hours.map(h => dayData[h]));
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const chartW = canvas.width - padLeft - padRight;
  const chartH = canvas.height - padTop - padBottom;
  const barW = Math.max(8, Math.min(40, chartW / hours.length - 4));
  const gap = chartW / hours.length;

  // Y軸ライン
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();
    // Y軸ラベル
    const val = Math.round(maxAmount * (1 - i / 4));
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val >= 10000 ? (val / 10000).toFixed(1) + '万' : val, padLeft - 4, y + 4);
  }

  // バー描画
  hours.forEach((h, i) => {
    const amt = dayData[h];
    const barH = (amt / maxAmount) * chartH;
    const x = padLeft + gap * i + gap / 2 - barW / 2;
    const y = padTop + chartH - barH;

    // ピークのみ赤
    const isPeak = amt === maxAmount;
    ctx.fillStyle = isPeak ? '#e74c3c' : '#3498db';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // X軸ラベル
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${String(h).padStart(2,'0')}`, padLeft + gap * i + gap / 2, padTop + chartH + 14);
  });

  // X軸
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop + chartH);
  ctx.lineTo(padLeft + chartW, padTop + chartH);
  ctx.stroke();
}

// ---- 全日付一覧 ----
function renderDateList() {
  const data = loadData();
  const dateList = document.getElementById('dateList');
  const dates = Object.keys(data).sort().reverse();

  if (dates.length === 0) {
    dateList.innerHTML = '<div class="empty-msg">まだデータがありません</div>';
    return;
  }

  dateList.innerHTML = '';
  dates.forEach(d => {
    const dayData = data[d];
    const total = Object.values(dayData).reduce((s, v) => s + v, 0);
    const div = document.createElement('div');
    div.className = 'date-item';
    div.innerHTML = `<span>${d}</span><span>${total.toLocaleString()}円</span>`;
    div.addEventListener('click', () => {
      viewDate.value = d;
      renderDayView(d);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    dateList.appendChild(div);
  });
}

// ---- 起動時 ----
renderDateList();
renderDayView(today);
