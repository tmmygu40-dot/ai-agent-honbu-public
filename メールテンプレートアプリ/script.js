const STORAGE_KEY = 'mailTemplates';

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

function generateMailText(company, name, subject, sender, content) {
  const toLine = (company && name)
    ? `${company}　${name} 様`
    : company
      ? `${company} ご担当者 様`
      : name
        ? `${name} 様`
        : 'ご担当者 様';

  const subjectLine = subject ? `件名：${subject}` : '';

  const senderLine = sender
    ? `\n${sender}`
    : '';

  const body = content.trim()
    ? content.trim()
    : '（要件をご入力ください）';

  return [
    toLine,
    '',
    'お世話になっております。',
    senderLine ? senderLine.trim() + ' でございます。' : '',
    '',
    body,
    '',
    'ご確認のほど、よろしくお願いいたします。',
    '',
    '──────────────────',
    sender || '（署名）',
    '──────────────────',
  ].filter((line, i, arr) => {
    // 連続した空行を1つにまとめる
    if (line === '' && arr[i - 1] === '') return false;
    return true;
  }).join('\n');
}

function renderOutput(text) {
  const section = document.getElementById('outputSection');
  const pre = document.getElementById('mailOutput');
  pre.textContent = text;
  section.style.display = 'block';
}

document.getElementById('generateBtn').addEventListener('click', () => {
  const company = document.getElementById('company').value.trim();
  const name = document.getElementById('name').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const sender = document.getElementById('sender').value.trim();
  const content = document.getElementById('content').value.trim();

  const mail = generateMailText(company, name, subject, sender, content);
  renderOutput(mail);
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('mailOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
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
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'コピー完了！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  });
});

// テンプレート保存
document.getElementById('saveTemplateBtn').addEventListener('click', () => {
  const company = document.getElementById('company').value.trim();
  const name = document.getElementById('name').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const sender = document.getElementById('sender').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!subject && !content) {
    alert('件名または要件を入力してからテンプレートを保存してください。');
    return;
  }

  const templates = loadTemplates();
  const templateName = subject || content.slice(0, 20) || 'テンプレート';
  templates.push({ id: Date.now(), name: templateName, company, name: name, subject, sender, content, date: getToday() });
  saveTemplates(templates);
  renderTemplates();
});

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function renderTemplates() {
  const templates = loadTemplates();
  const section = document.getElementById('templatesSection');
  const list = document.getElementById('templatesList');

  if (templates.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  templates.forEach(t => {
    const item = document.createElement('div');
    item.className = 'template-item';

    const info = document.createElement('div');
    info.className = 'template-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'template-name';
    nameEl.textContent = t.name;

    const subEl = document.createElement('div');
    subEl.className = 'template-subject';
    subEl.textContent = t.date + (t.company ? '　' + t.company : '');

    info.appendChild(nameEl);
    info.appendChild(subEl);

    const actions = document.createElement('div');
    actions.className = 'template-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-load';
    loadBtn.textContent = '読み込む';
    loadBtn.addEventListener('click', () => {
      document.getElementById('company').value = t.company || '';
      document.getElementById('name').value = t.name || '';
      document.getElementById('subject').value = t.subject || '';
      document.getElementById('sender').value = t.sender || '';
      document.getElementById('content').value = t.content || '';
      // 読み込み後に自動生成
      const mail = generateMailText(t.company || '', t.name || '', t.subject || '', t.sender || '', t.content || '');
      renderOutput(mail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => {
      const updated = loadTemplates().filter(x => x.id !== t.id);
      saveTemplates(updated);
      renderTemplates();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);

    item.appendChild(info);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

// 初期表示
renderTemplates();
