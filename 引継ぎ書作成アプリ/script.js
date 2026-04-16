const STORAGE_KEY = 'hikitsugi_data';

let steps = [];
let notes = [];

function save() {
  const data = {
    title: document.getElementById('title').value,
    fromName: document.getElementById('from-name').value,
    toName: document.getElementById('to-name').value,
    date: document.getElementById('date').value,
    steps,
    notes,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const data = JSON.parse(raw);
  document.getElementById('title').value = data.title || '';
  document.getElementById('from-name').value = data.fromName || '';
  document.getElementById('to-name').value = data.toName || '';
  document.getElementById('date').value = data.date || '';
  steps = data.steps || [];
  notes = data.notes || [];
  renderSteps();
  renderNotes();
}

function renderSteps() {
  const el = document.getElementById('steps-list');
  if (steps.length === 0) {
    el.innerHTML = '';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'item-list';
  steps.forEach((text, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="item-num">${i + 1}</span>
      <span class="item-text">${escapeHtml(text)}</span>
      <button class="btn-del" onclick="removeStep(${i})" title="削除">✕</button>
    `;
    ul.appendChild(li);
  });
  el.innerHTML = '';
  el.appendChild(ul);
}

function renderNotes() {
  const el = document.getElementById('notes-list');
  if (notes.length === 0) {
    el.innerHTML = '';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'item-list';
  notes.forEach((text, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="item-num">!</span>
      <span class="item-text">${escapeHtml(text)}</span>
      <button class="btn-del" onclick="removeNote(${i})" title="削除">✕</button>
    `;
    ul.appendChild(li);
  });
  el.innerHTML = '';
  el.appendChild(ul);
}

function addStep() {
  const input = document.getElementById('step-input');
  const text = input.value.trim();
  if (!text) return;
  steps.push(text);
  input.value = '';
  renderSteps();
  save();
  document.getElementById('preview-section').style.display = 'none';
}

function removeStep(i) {
  steps.splice(i, 1);
  renderSteps();
  save();
  document.getElementById('preview-section').style.display = 'none';
}

function addNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;
  notes.push(text);
  input.value = '';
  renderNotes();
  save();
  document.getElementById('preview-section').style.display = 'none';
}

function removeNote(i) {
  notes.splice(i, 1);
  renderNotes();
  save();
  document.getElementById('preview-section').style.display = 'none';
}

function generatePreview() {
  const title = document.getElementById('title').value.trim() || '（件名未入力）';
  const fromName = document.getElementById('from-name').value.trim() || '（未入力）';
  const toName = document.getElementById('to-name').value.trim() || '（未入力）';
  const date = document.getElementById('date').value || '（未入力）';

  let text = '';
  text += `■ 引継ぎ書\n`;
  text += `${'─'.repeat(30)}\n`;
  text += `件名　　：${title}\n`;
  text += `引継ぎ日：${date}\n`;
  text += `担当者　：${fromName} → ${toName}\n`;
  text += `${'─'.repeat(30)}\n\n`;

  text += `【業務手順】\n`;
  if (steps.length === 0) {
    text += `（手順未入力）\n`;
  } else {
    steps.forEach((s, i) => {
      text += `  ${i + 1}. ${s}\n`;
    });
  }
  text += `\n`;

  text += `【注意点】\n`;
  if (notes.length === 0) {
    text += `（注意点未入力）\n`;
  } else {
    notes.forEach((n) => {
      text += `  ・${n}\n`;
    });
  }
  text += `\n`;
  text += `以上\n`;

  document.getElementById('preview-text').textContent = text;
  const section = document.getElementById('preview-section');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
  save();
}

function copyToClipboard() {
  const text = document.getElementById('preview-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const msg = document.getElementById('copy-msg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const msg = document.getElementById('copy-msg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
  });
}

function clearAll() {
  if (!confirm('入力内容をすべてリセットしますか？')) return;
  document.getElementById('title').value = '';
  document.getElementById('from-name').value = '';
  document.getElementById('to-name').value = '';
  document.getElementById('date').value = '';
  steps = [];
  notes = [];
  renderSteps();
  renderNotes();
  document.getElementById('preview-section').style.display = 'none';
  localStorage.removeItem(STORAGE_KEY);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('step-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addStep();
  });
  document.getElementById('note-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addNote();
  });

  // 今日の日付をデフォルト設定
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;

  // 自動保存（入力変更時）
  ['title', 'from-name', 'to-name', 'date'].forEach(id => {
    document.getElementById(id).addEventListener('input', save);
  });

  load();
});
