const STORAGE_KEY = 'koujinippo_reports';
const MAX_REPORTS = 20;

const dateInput = document.getElementById('date');
const siteInput = document.getElementById('site-name');
const workerInput = document.getElementById('worker-count');
const weatherSelect = document.getElementById('weather');
const contentInput = document.getElementById('work-content');
const remarksInput = document.getElementById('remarks');

const previewSection = document.getElementById('preview-section');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');

// 今日の日付をデフォルト設定
dateInput.value = new Date().toISOString().slice(0, 10);

document.getElementById('preview-btn').addEventListener('click', showPreview);
document.getElementById('clear-btn').addEventListener('click', clearForm);
document.getElementById('print-btn').addEventListener('click', () => window.print());
document.getElementById('save-btn').addEventListener('click', saveReport);

function showPreview() {
  const data = getFormData();
  if (!data.date || !data.siteName) {
    alert('日付と現場名を入力してください。');
    return;
  }

  document.getElementById('r-date').textContent = formatDate(data.date);
  document.getElementById('r-weather').textContent = data.weather;
  document.getElementById('r-site').textContent = data.siteName;
  document.getElementById('r-workers').textContent = data.workerCount ? data.workerCount + ' 名' : '―';
  document.getElementById('r-content').textContent = data.workContent || '―';
  document.getElementById('r-remarks').textContent = data.remarks || '―';

  previewSection.classList.add('visible');
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

function clearForm() {
  dateInput.value = new Date().toISOString().slice(0, 10);
  siteInput.value = '';
  workerInput.value = '';
  weatherSelect.value = '晴れ';
  contentInput.value = '';
  remarksInput.value = '';
  previewSection.classList.remove('visible');
}

function getFormData() {
  return {
    date: dateInput.value,
    siteName: siteInput.value.trim(),
    workerCount: workerInput.value,
    weather: weatherSelect.value,
    workContent: contentInput.value.trim(),
    remarks: remarksInput.value.trim()
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function saveReport() {
  const data = getFormData();
  if (!data.date || !data.siteName) {
    alert('日付と現場名を入力してください。');
    return;
  }

  const reports = loadReports();
  const newReport = {
    id: Date.now(),
    ...data,
    savedAt: new Date().toISOString()
  };

  reports.unshift(newReport);
  if (reports.length > MAX_REPORTS) reports.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));

  renderHistory();
  alert('日報を保存しました。');
}

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const reports = loadReports();
  historyCount.textContent = reports.length > 0 ? `(${reports.length}件)` : '';

  if (reports.length === 0) {
    historyList.innerHTML = '<p class="empty-message">保存された日報はありません</p>';
    return;
  }

  historyList.innerHTML = reports.map(r => `
    <div class="history-item">
      <div class="history-info">
        <span class="history-date">${formatDate(r.date)}</span>
        <span class="history-site">${escapeHtml(r.siteName)}</span>
        <span class="history-site">作業員数: ${r.workerCount ? r.workerCount + '名' : '―'} / 天候: ${escapeHtml(r.weather)}</span>
      </div>
      <div class="history-actions">
        <button class="btn btn-sm btn-primary" onclick="loadReport(${r.id})">読み込む</button>
        <button class="btn btn-sm btn-danger" onclick="deleteReport(${r.id})">削除</button>
      </div>
    </div>
  `).join('');
}

function loadReport(id) {
  const reports = loadReports();
  const r = reports.find(rep => rep.id === id);
  if (!r) return;

  dateInput.value = r.date;
  siteInput.value = r.siteName;
  workerInput.value = r.workerCount;
  weatherSelect.value = r.weather;
  contentInput.value = r.workContent;
  remarksInput.value = r.remarks;

  showPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteReport(id) {
  if (!confirm('この日報を削除しますか？')) return;
  const reports = loadReports().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  renderHistory();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// 初期描画
renderHistory();
historySection.style.display = 'block';
