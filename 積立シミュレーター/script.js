const LS_KEY = 'tsumitate_inputs';

const monthlyInput = document.getElementById('monthly');
const rateInput    = document.getElementById('rate');
const yearsInput   = document.getElementById('years');
const calcBtn      = document.getElementById('calcBtn');
const resultSection = document.getElementById('resultSection');
const principalEl  = document.getElementById('principal');
const totalEl      = document.getElementById('total');
const gainEl       = document.getElementById('gain');
const tableBody    = document.getElementById('tableBody');
const chartCanvas  = document.getElementById('chart');

// 前回入力値を復元
(function restoreInputs() {
  const saved = localStorage.getItem(LS_KEY);
  if (!saved) return;
  try {
    const { monthly, rate, years } = JSON.parse(saved);
    if (monthly) monthlyInput.value = monthly;
    if (rate)    rateInput.value    = rate;
    if (years)   yearsInput.value   = years;
  } catch (e) { /* ignore */ }
})();

calcBtn.addEventListener('click', () => {
  const monthly = parseFloat(monthlyInput.value);
  const rate    = parseFloat(rateInput.value);
  const years   = parseInt(yearsInput.value, 10);

  if (!monthly || monthly <= 0 || isNaN(rate) || rate < 0 || !years || years <= 0) {
    alert('正しい値を入力してください。');
    return;
  }

  // 入力値を保存
  localStorage.setItem(LS_KEY, JSON.stringify({ monthly, rate, years }));

  const monthlyRate = rate / 100 / 12;
  const months = years * 12;

  // 年ごとのデータを計算
  const yearData = [];
  for (let y = 1; y <= years; y++) {
    const m = y * 12;
    const totalValue = monthlyRate === 0
      ? monthly * m
      : monthly * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate);
    const principalValue = monthly * m;
    yearData.push({
      year: y,
      principal: principalValue,
      total: totalValue,
      gain: totalValue - principalValue,
    });
  }

  const last = yearData[yearData.length - 1];

  // 結果カードを更新
  principalEl.textContent = fmt(last.principal);
  totalEl.textContent     = fmt(last.total);
  gainEl.textContent      = '+' + fmt(last.gain);

  // テーブル更新
  tableBody.innerHTML = yearData.map(d => `
    <tr>
      <td>${d.year}年</td>
      <td>${fmt(d.principal)}</td>
      <td>${fmt(d.total)}</td>
      <td style="color:#059669">+${fmt(d.gain)}</td>
    </tr>
  `).join('');

  // グラフ描画
  drawChart(yearData);

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fmt(n) {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '億円';
  if (n >= 1e4) return Math.round(n / 1e4) + '万円';
  return Math.round(n).toLocaleString() + '円';
}

function drawChart(data) {
  const dpr = window.devicePixelRatio || 1;
  const W   = chartCanvas.parentElement.clientWidth - 32;
  const H   = Math.min(220, Math.round(W * 0.5));

  chartCanvas.width  = W * dpr;
  chartCanvas.height = H * dpr;
  chartCanvas.style.width  = W + 'px';
  chartCanvas.style.height = H + 'px';

  const ctx = chartCanvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 16, bottom: 32, left: 56 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top  - pad.bottom;

  const maxVal = data[data.length - 1].total;

  ctx.clearRect(0, 0, W, H);

  // 目盛り線
  const gridLines = 4;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.fillStyle   = '#94a3b8';
  ctx.font        = `${10 * dpr / dpr}px sans-serif`;
  ctx.textAlign   = 'right';
  for (let i = 0; i <= gridLines; i++) {
    const yVal = (maxVal / gridLines) * i;
    const y    = pad.top + ch - (ch * i / gridLines);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillText(fmtShort(yVal), pad.left - 4, y + 4);
  }

  // X軸ラベル
  ctx.textAlign = 'center';
  const step = data.length <= 10 ? 1 : Math.ceil(data.length / 10);
  data.forEach((d, i) => {
    if (i === 0 || (d.year % step === 0) || i === data.length - 1) {
      const x = pad.left + cw * i / (data.length - 1 || 1);
      ctx.fillText(d.year + '年', x, H - pad.bottom + 14);
    }
  });

  // 元本エリア
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = pad.left + cw * i / (data.length - 1 || 1);
    const y = pad.top  + ch - ch * d.principal / maxVal;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = 'rgba(148,163,184,0.35)';
  ctx.fill();

  // 資産総額エリア
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = pad.left + cw * i / (data.length - 1 || 1);
    const y = pad.top  + ch - ch * d.total / maxVal;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.closePath();
  ctx.fillStyle = 'rgba(37,99,235,0.25)';
  ctx.fill();

  // 資産総額ライン
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = pad.left + cw * i / (data.length - 1 || 1);
    const y = pad.top  + ch - ch * d.total / maxVal;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // 凡例
  const lx = pad.left + 8;
  const ly = pad.top + 10;
  ctx.fillStyle = 'rgba(37,99,235,0.25)';
  ctx.fillRect(lx, ly - 8, 12, 10);
  ctx.fillStyle = '#2563eb';
  ctx.textAlign = 'left';
  ctx.fillText('資産総額', lx + 16, ly);

  ctx.fillStyle = 'rgba(148,163,184,0.55)';
  ctx.fillRect(lx + 70, ly - 8, 12, 10);
  ctx.fillStyle = '#64748b';
  ctx.fillText('元本', lx + 86, ly);
}

function fmtShort(n) {
  if (n === 0) return '0';
  if (n >= 1e8) return (n / 1e8).toFixed(0) + '億';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '万';
  return Math.round(n).toLocaleString();
}
