const DRINKS = {
  coffee:        { name: 'コーヒー',         mg: 90 },
  green_tea:     { name: '緑茶',             mg: 30 },
  black_tea:     { name: '紅茶',             mg: 50 },
  energy_drink:  { name: 'エナジードリンク', mg: 80 },
  cola:          { name: 'コーラ',           mg: 35 },
};

const LIMIT_MG = 400;
const STORAGE_KEY = 'caffeine_log';
const DATE_KEY    = 'caffeine_date';

let log = [];

// ---- 初期化 ----
function todayStr() {
  return new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function loadLog() {
  const savedDate = localStorage.getItem(DATE_KEY);
  const today = todayStr();
  if (savedDate === today) {
    try { log = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { log = []; }
  } else {
    log = [];
    localStorage.setItem(DATE_KEY, today);
    saveLog();
  }
}

function saveLog() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

// ---- 表示 ----
function render() {
  const totalMg = log.reduce((s, item) => s + item.mg * item.cups, 0);

  // 合計
  const totalEl = document.getElementById('totalMg');
  totalEl.textContent = totalMg + ' mg';
  totalEl.classList.toggle('over', totalMg > LIMIT_MG);

  // バー
  const pct = Math.min((totalMg / LIMIT_MG) * 100, 100);
  const fill = document.getElementById('limitFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('over', totalMg > LIMIT_MG);

  // テキスト
  const limitText = document.getElementById('limitText');
  if (totalMg >= LIMIT_MG) {
    limitText.textContent = `上限400mgを ${totalMg - LIMIT_MG}mg 超過しています`;
    limitText.style.color = '#e53935';
  } else {
    limitText.textContent = `上限400mgまで残り ${LIMIT_MG - totalMg}mg`;
    limitText.style.color = '#888';
  }

  // ログリスト
  const list = document.getElementById('logList');
  if (log.length === 0) {
    list.innerHTML = '<li><span class="empty-msg">まだ記録がありません</span></li>';
    return;
  }
  list.innerHTML = log.map((item, i) => `
    <li>
      <div class="log-info">
        <span class="log-name">${item.name}</span>
        <span class="log-detail">${item.cups}杯 × ${item.mg}mg</span>
      </div>
      <span class="log-mg">${item.mg * item.cups} mg</span>
      <button class="delete-btn" data-index="${i}" title="削除">✕</button>
    </li>
  `).join('');

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      log.splice(Number(btn.dataset.index), 1);
      saveLog();
      render();
    });
  });
}

// ---- イベント ----
const drinkSelect = document.getElementById('drinkSelect');
const customRow   = document.getElementById('customRow');

drinkSelect.addEventListener('change', () => {
  customRow.classList.toggle('hidden', drinkSelect.value !== 'custom');
});

document.getElementById('addBtn').addEventListener('click', () => {
  const cups = parseInt(document.getElementById('cupsInput').value, 10);
  if (!cups || cups < 1) return;

  let name, mg;
  if (drinkSelect.value === 'custom') {
    name = document.getElementById('customName').value.trim() || 'カスタム';
    mg   = parseInt(document.getElementById('customMg').value, 10);
    if (!mg || mg < 1) {
      document.getElementById('addError').textContent = '1杯のカフェイン量（mg）を入力してください';
      return;
    }
    document.getElementById('addError').textContent = '';
  } else {
    const d = DRINKS[drinkSelect.value];
    name = d.name;
    mg   = d.mg;
  }

  log.push({ name, mg, cups });
  saveLog();
  render();

  // 入力リセット
  document.getElementById('cupsInput').value = 1;
  if (drinkSelect.value === 'custom') {
    document.getElementById('customName').value = '';
    document.getElementById('customMg').value = '';
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('今日のログをすべてリセットしますか？')) return;
  log = [];
  saveLog();
  render();
});

// ---- 起動 ----
document.getElementById('dateLabel').textContent = todayStr() + ' の摂取記録';
loadLog();
render();
