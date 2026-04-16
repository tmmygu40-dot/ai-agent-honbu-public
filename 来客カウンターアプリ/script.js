// ---- データ管理 ----

const STORAGE_KEY = 'raikyaku_data';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function getTodayRecords() {
  const data = loadData();
  const key = getTodayKey();
  return data[key] || [];
}

function saveTodayRecords(records) {
  const data = loadData();
  const key = getTodayKey();
  data[key] = records;
  saveData(data);
}

// ---- カウント操作 ----

function addCount() {
  const records = getTodayRecords();
  records.push(new Date().toISOString());
  saveTodayRecords(records);
  animateBtn();
  render();
}

function undoCount() {
  const records = getTodayRecords();
  if (records.length === 0) return;
  records.pop();
  saveTodayRecords(records);
  render();
}

function animateBtn() {
  const btn = document.getElementById('countBtn');
  btn.style.transform = 'scale(0.93)';
  setTimeout(() => { btn.style.transform = ''; }, 120);
}

// ---- リセット・履歴削除 ----

let pendingAction = null;

function confirmReset() {
  pendingAction = resetToday;
  document.getElementById('modalMessage').textContent = '本日の記録をリセットしますか？';
  document.getElementById('modalOkBtn').onclick = () => { pendingAction(); closeModal(); };
  document.getElementById('confirmModal').style.display = 'flex';
}

function confirmClearHistory() {
  pendingAction = clearHistory;
  document.getElementById('modalMessage').textContent = '過去の記録をすべて削除しますか？';
  document.getElementById('modalOkBtn').onclick = () => { pendingAction(); closeModal(); };
  document.getElementById('confirmModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

function resetToday() {
  saveTodayRecords([]);
  render();
}

function clearHistory() {
  const todayKey = getTodayKey();
  const data = loadData();
  const todayData = data[todayKey];
  const newData = {};
  if (todayData !== undefined) newData[todayKey] = todayData;
  saveData(newData);
  render();
}

// ---- 集計 ----

function getHourlyCounts(records) {
  const counts = new Array(24).fill(0);
  records.forEach(iso => {
    const h = new Date(iso).getHours();
    counts[h]++;
  });
  return counts;
}

// ---- 描画 ----

function renderHeader() {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  document.getElementById('dateDisplay').textContent =
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function renderCounter(records) {
  document.getElementById('totalCount').textContent = records.length;
}

function renderHourly(records) {
  const counts = getHourlyCounts(records);
  const max = Math.max(...counts, 1);
  const currentHour = new Date().getHours();
  const container = document.getElementById('hourlyTable');

  // 記録がある時間帯 + 現在時刻を表示対象にする
  const visibleHours = [];
  counts.forEach((c, h) => {
    if (c > 0 || h === currentHour) visibleHours.push(h);
  });

  if (visibleHours.length === 0) {
    container.innerHTML = '<div class="no-data">まだ記録がありません</div>';
    return;
  }

  container.innerHTML = visibleHours.map(h => {
    const c = counts[h];
    const barWidth = Math.round((c / max) * 100);
    const isActive = h === currentHour ? ' active' : '';
    const countClass = c === 0 ? ' zero' : '';
    return `
      <div class="hour-row${isActive}">
        <span class="hour-label">${String(h).padStart(2, '0')}:00〜${String(h + 1).padStart(2, '0')}:00</span>
        <div class="hour-bar-wrap">
          <div class="hour-bar" style="width:${barWidth}%"></div>
        </div>
        <span class="hour-count${countClass}">${c}</span>
      </div>`;
  }).join('');
}

function renderHistory() {
  const data = loadData();
  const todayKey = getTodayKey();
  const container = document.getElementById('historyList');

  const pastKeys = Object.keys(data)
    .filter(k => k !== todayKey)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 10);

  if (pastKeys.length === 0) {
    container.innerHTML = '<div class="no-data">過去の記録はありません</div>';
    return;
  }

  container.innerHTML = pastKeys.map(key => {
    const total = (data[key] || []).length;
    const [y, m, d] = key.split('-');
    return `
      <div class="history-item">
        <span class="history-date">${y}年${parseInt(m)}月${parseInt(d)}日</span>
        <span class="history-count">${total}人</span>
      </div>`;
  }).join('');
}

function render() {
  const records = getTodayRecords();
  renderHeader();
  renderCounter(records);
  renderHourly(records);
  renderHistory();
}

// ---- 初期化 ----
render();

// 1分ごとに現在時刻の時間帯表示を更新
setInterval(render, 60000);
