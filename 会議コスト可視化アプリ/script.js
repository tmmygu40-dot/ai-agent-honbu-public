const STORAGE_KEY = 'meeting_cost_history';

function calculate() {
  const participants = parseInt(document.getElementById('participants').value);
  const hourlyRate = parseInt(document.getElementById('hourlyRate').value);
  const duration = parseInt(document.getElementById('duration').value);

  if (!participants || !hourlyRate || !duration || participants < 1 || hourlyRate < 1 || duration < 1) {
    alert('参加人数・平均時給・会議時間を正しく入力してください。');
    return;
  }

  const cost = Math.round(participants * hourlyRate / 60 * duration);
  const formattedCost = cost.toLocaleString('ja-JP');

  const resultCard = document.getElementById('resultCard');
  document.getElementById('resultCost').textContent = `¥${formattedCost}`;
  document.getElementById('resultDetail').textContent =
    `${participants}人 × 時給¥${hourlyRate.toLocaleString()} × ${duration}分`;
  resultCard.style.display = 'block';

  saveHistory({ participants, hourlyRate, duration, cost });
  renderHistory();
}

function saveHistory(entry) {
  const history = loadHistory();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  history.unshift({ ...entry, date: dateStr });
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');

  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = history.map(item => `
    <li class="history-item">
      <div class="history-info">
        <div>${item.date}</div>
        <div>${item.participants}人 × 時給¥${item.hourlyRate.toLocaleString()} × ${item.duration}分</div>
      </div>
      <div class="history-cost">¥${item.cost.toLocaleString()}</div>
    </li>
  `).join('');
}

function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

document.addEventListener('DOMContentLoaded', () => {
  renderHistory();

  document.getElementById('participants').addEventListener('keydown', handleEnter);
  document.getElementById('hourlyRate').addEventListener('keydown', handleEnter);
  document.getElementById('duration').addEventListener('keydown', handleEnter);
});

function handleEnter(e) {
  if (e.key === 'Enter') calculate();
}
