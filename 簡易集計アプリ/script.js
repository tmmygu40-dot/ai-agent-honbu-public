'use strict';

const STORAGE_KEY = 'survey_data';

const COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a'
];

let choices = [];

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      choices = data.choices || [];
      const titleEl = document.getElementById('survey-title');
      if (data.title) titleEl.value = data.title;
    }
  } catch (e) {
    choices = [];
  }
  render();
}

function save() {
  const title = document.getElementById('survey-title').value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, choices }));
}

function addChoice() {
  const nameEl = document.getElementById('choice-name');
  const countEl = document.getElementById('choice-count');
  const name = nameEl.value.trim();
  const count = parseInt(countEl.value, 10);

  if (!name) { nameEl.focus(); return; }
  if (isNaN(count) || count < 0) { countEl.focus(); return; }

  choices.push({ name, count });
  nameEl.value = '';
  countEl.value = '';
  nameEl.focus();
  save();
  render();
}

function deleteChoice(index) {
  choices.splice(index, 1);
  save();
  render();
}

function clearAll() {
  if (!confirm('全データをクリアしますか？')) return;
  choices = [];
  document.getElementById('survey-title').value = '';
  save();
  render();
}

function render() {
  const section = document.getElementById('results-section');
  const tbody = document.getElementById('results-body');
  const totalEl = document.getElementById('total-count');

  if (choices.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const total = choices.reduce((sum, c) => sum + c.count, 0);
  totalEl.textContent = total;

  tbody.innerHTML = '';
  choices.forEach((c, i) => {
    const pct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0.0';
    const color = COLORS[i % COLORS.length];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(c.name)}</td>
      <td>${c.count}</td>
      <td>
        <span class="pct-bar" style="width:${pct}%;max-width:80px;background:${color};"></span>
        ${pct}%
      </td>
      <td><button class="delete-btn" data-index="${i}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteChoice(parseInt(btn.dataset.index, 10)));
  });

  drawChart(total);
}

function drawChart(total) {
  const canvas = document.getElementById('bar-chart');
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = canvas.parentElement.clientWidth || 600;
  const W = containerWidth;
  const BAR_HEIGHT = 36;
  const PADDING = { top: 20, right: 60, bottom: 20, left: 130 };
  const H = PADDING.top + choices.length * (BAR_HEIGHT + 8) + PADDING.bottom;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const chartW = W - PADDING.left - PADDING.right;
  const maxVal = Math.max(...choices.map(c => c.count), 1);

  choices.forEach((c, i) => {
    const y = PADDING.top + i * (BAR_HEIGHT + 8);
    const barW = (c.count / maxVal) * chartW;
    const color = COLORS[i % COLORS.length];
    const pct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0.0';

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(PADDING.left, y, chartW, BAR_HEIGHT);

    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, PADDING.left, y, Math.max(barW, 4), BAR_HEIGHT, 4);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const label = c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name;
    ctx.fillText(label, PADDING.left - 8, y + BAR_HEIGHT / 2);

    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(`${c.count}件 (${pct}%)`, PADDING.left + barW + 6, y + BAR_HEIGHT / 2);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('add-btn').addEventListener('click', addChoice);
document.getElementById('choice-count').addEventListener('keydown', e => {
  if (e.key === 'Enter') addChoice();
});
document.getElementById('choice-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('choice-count').focus();
});
document.getElementById('clear-btn').addEventListener('click', clearAll);
document.getElementById('survey-title').addEventListener('input', save);

window.addEventListener('resize', () => {
  if (choices.length > 0) {
    const total = choices.reduce((s, c) => s + c.count, 0);
    drawChart(total);
  }
});

load();
