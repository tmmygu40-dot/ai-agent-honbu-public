const STORAGE_KEY = 'project_progress_data';

let projects = [];
let editingId = null;
let currentSort = 'deadline';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { projects = JSON.parse(raw); } catch(e) { projects = []; }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function submitProject() {
  const name = document.getElementById('input-name').value.trim();
  const progress = parseInt(document.getElementById('input-progress').value, 10);
  const deadline = document.getElementById('input-deadline').value;
  const memo = document.getElementById('input-memo').value.trim();

  if (!name) { alert('案件名を入力してください'); return; }
  if (isNaN(progress) || progress < 0 || progress > 100) { alert('進捗は0〜100の数値を入力してください'); return; }

  if (editingId) {
    const idx = projects.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], name, progress, deadline, memo };
    }
    editingId = null;
    document.getElementById('form-title').textContent = '案件を登録';
    document.getElementById('btn-submit').textContent = '登録する';
    document.getElementById('btn-cancel').classList.add('hidden');
  } else {
    projects.push({ id: generateId(), name, progress, deadline, memo, createdAt: Date.now() });
  }

  saveData();
  clearForm();
  renderList();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('form-title').textContent = '案件を登録';
  document.getElementById('btn-submit').textContent = '登録する';
  document.getElementById('btn-cancel').classList.add('hidden');
  clearForm();
}

function clearForm() {
  document.getElementById('input-name').value = '';
  document.getElementById('input-progress').value = '';
  document.getElementById('input-deadline').value = '';
  document.getElementById('input-memo').value = '';
}

function deleteProject(id) {
  if (!confirm('この案件を削除しますか？')) return;
  projects = projects.filter(p => p.id !== id);
  saveData();
  renderList();
}

function editProject(id) {
  const p = projects.find(proj => proj.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('input-name').value = p.name;
  document.getElementById('input-progress').value = p.progress;
  document.getElementById('input-deadline').value = p.deadline || '';
  document.getElementById('input-memo').value = p.memo || '';
  document.getElementById('form-title').textContent = '案件を編集';
  document.getElementById('btn-submit').textContent = '更新する';
  document.getElementById('btn-cancel').classList.remove('hidden');
  document.getElementById('input-name').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setSort(type) {
  currentSort = type;
  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('sort-' + type).classList.add('active');
  renderList();
}

function getDaysUntilDeadline(deadlineStr) {
  if (!deadlineStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadlineStr);
  dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
}

function getStatus(project) {
  if (project.progress >= 100) return 'done';
  const days = getDaysUntilDeadline(project.deadline);
  if (days !== null && days <= 3 && project.progress < 50) return 'red';
  if (days !== null && days <= 7 && project.progress < 80) return 'yellow';
  return 'green';
}

function formatDeadline(deadlineStr) {
  if (!deadlineStr) return null;
  const d = new Date(deadlineStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function getSortedProjects() {
  const list = [...projects];
  if (currentSort === 'deadline') {
    list.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else if (currentSort === 'progress') {
    list.sort((a, b) => a.progress - b.progress);
  } else if (currentSort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  return list;
}

function renderList() {
  const listEl = document.getElementById('project-list');
  const emptyEl = document.getElementById('empty-msg');
  const sorted = getSortedProjects();

  if (sorted.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = sorted.map(p => {
    const status = getStatus(p);
    const days = getDaysUntilDeadline(p.deadline);
    const deadlineFormatted = formatDeadline(p.deadline);

    let deadlineBadge = '';
    if (deadlineFormatted) {
      let badgeClass = 'badge-normal';
      let deadlineLabel = `期限：${deadlineFormatted}`;
      if (p.progress >= 100) {
        badgeClass = 'badge-done';
      } else if (days !== null && days < 0) {
        badgeClass = 'badge-red';
        deadlineLabel += `（${Math.abs(days)}日超過）`;
      } else if (days !== null && days <= 3) {
        badgeClass = 'badge-red';
        deadlineLabel += `（残${days}日）`;
      } else if (days !== null && days <= 7) {
        badgeClass = 'badge-yellow';
        deadlineLabel += `（残${days}日）`;
      } else if (days !== null) {
        deadlineLabel += `（残${days}日）`;
      }
      deadlineBadge = `<span class="deadline-badge ${badgeClass}">${deadlineLabel}</span>`;
    }

    const memoHtml = p.memo ? `<div class="card-memo">📝 ${escapeHtml(p.memo)}</div>` : '';

    return `
      <div class="project-card status-${status}">
        <div class="card-header">
          <div class="card-name">${escapeHtml(p.name)}</div>
          <div class="card-actions">
            <button class="btn-edit" onclick="editProject('${p.id}')">編集</button>
            <button class="btn-delete" onclick="deleteProject('${p.id}')">削除</button>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${p.progress}%"></div>
        </div>
        <div class="card-meta">
          <span class="progress-text">${p.progress}%</span>
          ${deadlineBadge}
        </div>
        ${memoHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
loadData();
renderList();
