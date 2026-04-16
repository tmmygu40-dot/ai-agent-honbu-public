const STORAGE_KEY = 'weekly-report-draft';

const fields = {
  weekRange: document.getElementById('week-range'),
  tasks:     document.getElementById('tasks'),
  results:   document.getElementById('results'),
  issues:    document.getElementById('issues'),
  nextWeek:  document.getElementById('next-week'),
  memo:      document.getElementById('memo'),
};

const generateBtn   = document.getElementById('generate-btn');
const clearBtn      = document.getElementById('clear-btn');
const copyBtn       = document.getElementById('copy-btn');
const outputSection = document.getElementById('output-section');
const outputText    = document.getElementById('output-text');
const copyMsg       = document.getElementById('copy-msg');

// localStorage から復元
function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    Object.keys(fields).forEach(key => {
      if (data[key] !== undefined) fields[key].value = data[key];
    });
  } catch (e) {}
}

// localStorage に保存
function saveDraft() {
  const data = {};
  Object.keys(fields).forEach(key => {
    data[key] = fields[key].value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 入力変化で自動保存
Object.values(fields).forEach(el => {
  el.addEventListener('input', saveDraft);
});

// 週報テキスト生成
function generateReport() {
  const weekRange = fields.weekRange.value.trim();
  const tasks     = fields.tasks.value.trim();
  const results   = fields.results.value.trim();
  const issues    = fields.issues.value.trim();
  const nextWeek  = fields.nextWeek.value.trim();
  const memo      = fields.memo.value.trim();

  let lines = [];

  lines.push('【週報】' + (weekRange ? weekRange : ''));
  lines.push('');

  lines.push('■ 今週の作業');
  lines.push(tasks || '（未入力）');
  lines.push('');

  lines.push('■ 今週の成果');
  lines.push(results || '（未入力）');
  lines.push('');

  lines.push('■ 課題・問題点');
  lines.push(issues || '（なし）');
  lines.push('');

  lines.push('■ 来週の予定');
  lines.push(nextWeek || '（未入力）');

  if (memo) {
    lines.push('');
    lines.push('■ その他・連絡事項');
    lines.push(memo);
  }

  return lines.join('\n');
}

generateBtn.addEventListener('click', () => {
  const text = generateReport();
  outputText.textContent = text;
  outputSection.classList.add('visible');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

copyBtn.addEventListener('click', () => {
  const text = outputText.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    showCopyMsg();
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyMsg();
  });
});

function showCopyMsg() {
  copyMsg.classList.add('show');
  setTimeout(() => copyMsg.classList.remove('show'), 2000);
}

clearBtn.addEventListener('click', () => {
  if (!confirm('入力内容をクリアしますか？')) return;
  Object.values(fields).forEach(el => { el.value = ''; });
  outputSection.classList.remove('visible');
  outputText.textContent = '';
  localStorage.removeItem(STORAGE_KEY);
});

// 初期化
loadDraft();
