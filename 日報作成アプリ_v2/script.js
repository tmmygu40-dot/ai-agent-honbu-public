const STORAGE_KEY = 'nippo_v2_data';

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  document.getElementById('date').value = formatDate(today);
  loadFromStorage();
});

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateJP(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

// タスク追加
function addTask() {
  const container = document.getElementById('tasks-container');
  const div = document.createElement('div');
  div.className = 'task-item';
  div.innerHTML = `
    <div class="task-row">
      <input type="text" class="task-name" placeholder="作業内容（例：資料作成）">
      <input type="time" class="task-start" title="開始時間">
      <span class="time-sep">〜</span>
      <input type="time" class="task-end" title="終了時間">
      <button class="btn-remove" onclick="removeTask(this)" title="削除">✕</button>
    </div>
    <textarea class="task-detail" placeholder="詳細メモ（任意）" rows="2"></textarea>
  `;
  container.appendChild(div);
}

function removeTask(btn) {
  const item = btn.closest('.task-item');
  const container = document.getElementById('tasks-container');
  if (container.querySelectorAll('.task-item').length <= 1) {
    // 最後の1件はクリアだけ
    item.querySelector('.task-name').value = '';
    item.querySelector('.task-start').value = '';
    item.querySelector('.task-end').value = '';
    item.querySelector('.task-detail').value = '';
    return;
  }
  item.remove();
}

// 日報生成
function generateReport() {
  const date = document.getElementById('date').value;
  const name = document.getElementById('name').value.trim();
  const issues = document.getElementById('issues').value.trim();
  const tomorrow = document.getElementById('tomorrow').value.trim();
  const memo = document.getElementById('memo').value.trim();

  const taskItems = document.querySelectorAll('.task-item');
  const tasks = [];
  taskItems.forEach(item => {
    const taskName = item.querySelector('.task-name').value.trim();
    const start = item.querySelector('.task-start').value;
    const end = item.querySelector('.task-end').value;
    const detail = item.querySelector('.task-detail').value.trim();
    if (taskName) {
      tasks.push({ taskName, start, end, detail });
    }
  });

  if (!date) {
    alert('日付を入力してください。');
    return;
  }
  if (tasks.length === 0) {
    alert('作業内容を1件以上入力してください。');
    return;
  }

  let lines = [];

  lines.push(`【日報】${formatDateJP(date)}${name ? '　' + name : ''}`);
  lines.push('');
  lines.push('【作業内容】');
  tasks.forEach((t, i) => {
    let line = `${i + 1}. ${t.taskName}`;
    if (t.start && t.end) {
      line += `（${t.start} 〜 ${t.end}）`;
    } else if (t.start) {
      line += `（${t.start} 〜）`;
    } else if (t.end) {
      line += `（〜 ${t.end}）`;
    }
    lines.push(line);
    if (t.detail) {
      t.detail.split('\n').forEach(dl => {
        lines.push(`   ${dl}`);
      });
    }
  });

  lines.push('');

  if (issues) {
    lines.push('【課題・問題点】');
    issues.split('\n').forEach(l => lines.push(l));
    lines.push('');
  } else {
    lines.push('【課題・問題点】');
    lines.push('特になし');
    lines.push('');
  }

  if (tomorrow) {
    lines.push('【明日の予定・対応】');
    tomorrow.split('\n').forEach(l => lines.push(l));
    lines.push('');
  } else {
    lines.push('【明日の予定・対応】');
    lines.push('特になし');
    lines.push('');
  }

  if (memo) {
    lines.push('【その他・連絡事項】');
    memo.split('\n').forEach(l => lines.push(l));
    lines.push('');
  }

  lines.push('以上');

  const reportText = lines.join('\n');
  const outputSection = document.getElementById('output-section');
  const outputText = document.getElementById('output-text');
  outputSection.style.display = 'block';
  outputText.textContent = reportText;
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  saveToStorage();
}

// コピー
function copyReport() {
  const text = document.getElementById('output-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'コピー完了！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'コピー完了！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// クリア
function clearAll() {
  if (!confirm('入力内容をすべてクリアしますか？')) return;
  document.getElementById('name').value = '';
  document.getElementById('issues').value = '';
  document.getElementById('tomorrow').value = '';
  document.getElementById('memo').value = '';

  const container = document.getElementById('tasks-container');
  container.innerHTML = '';
  addTask();

  document.getElementById('output-section').style.display = 'none';
  localStorage.removeItem(STORAGE_KEY);
}

// localStorage保存
function saveToStorage() {
  const data = {
    date: document.getElementById('date').value,
    name: document.getElementById('name').value,
    issues: document.getElementById('issues').value,
    tomorrow: document.getElementById('tomorrow').value,
    memo: document.getElementById('memo').value,
    tasks: []
  };
  document.querySelectorAll('.task-item').forEach(item => {
    data.tasks.push({
      taskName: item.querySelector('.task-name').value,
      start: item.querySelector('.task-start').value,
      end: item.querySelector('.task-end').value,
      detail: item.querySelector('.task-detail').value
    });
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// localStorage読み込み
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    // 日付が今日と同じ場合のみ復元
    const today = formatDate(new Date());
    if (data.date !== today) return;

    document.getElementById('date').value = data.date || today;
    document.getElementById('name').value = data.name || '';
    document.getElementById('issues').value = data.issues || '';
    document.getElementById('tomorrow').value = data.tomorrow || '';
    document.getElementById('memo').value = data.memo || '';

    if (data.tasks && data.tasks.length > 0) {
      const container = document.getElementById('tasks-container');
      container.innerHTML = '';
      data.tasks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.innerHTML = `
          <div class="task-row">
            <input type="text" class="task-name" placeholder="作業内容（例：資料作成）" value="${escHtml(t.taskName)}">
            <input type="time" class="task-start" title="開始時間" value="${escHtml(t.start)}">
            <span class="time-sep">〜</span>
            <input type="time" class="task-end" title="終了時間" value="${escHtml(t.end)}">
            <button class="btn-remove" onclick="removeTask(this)" title="削除">✕</button>
          </div>
          <textarea class="task-detail" placeholder="詳細メモ（任意）" rows="2">${escHtml(t.detail)}</textarea>
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    // 読み込み失敗は無視
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
