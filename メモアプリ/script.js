// =============================================
// シンプルメモアプリ - script.js
// 追加・編集・削除・検索・並び替え・完了・お気に入り
// カテゴリ・JSON書き出し・JSON読み込み
// ダークモード・文字サイズ・完了日時
// 削除確認・Escキャンセル・上下移動・並び順保存
// =============================================

const STORAGE_KEY  = 'simple-memo-list';
const DARK_KEY     = 'simple-memo-dark';
const FONTSIZE_KEY = 'simple-memo-fontsize';
const SORT_KEY     = 'simple-memo-sort';   // 並び順を保存するキー

document.addEventListener('DOMContentLoaded', function () {

  // 使う部品を取得する
  const input          = document.getElementById('memoInput');
  const addBtn         = document.getElementById('addBtn');
  const clearBtn       = document.getElementById('clearBtn');
  const memoList       = document.getElementById('memoList');
  const memoCount      = document.getElementById('memoCount');
  const searchInput    = document.getElementById('searchInput');
  const sortSelect     = document.getElementById('sortSelect');
  const categorySelect = document.getElementById('categorySelect');
  const exportBtn      = document.getElementById('exportBtn');
  const importFile     = document.getElementById('importFile');
  const darkToggle     = document.getElementById('darkToggle');

  // 現在の絞り込み状態
  let currentFilter = 'all';
  let currentCat    = 'all';

  // -----------------------------------------------
  // 並び順の復元（保存済みの値をセレクトに反映する）
  // -----------------------------------------------
  sortSelect.value = localStorage.getItem(SORT_KEY) || 'new';

  sortSelect.addEventListener('change', function () {
    localStorage.setItem(SORT_KEY, sortSelect.value); // 変えるたびに保存する
    renderMemos();
  });

  // -----------------------------------------------
  // ダークモードの初期化
  // -----------------------------------------------
  function applyDark(isDark) {
    document.body.classList.toggle('dark', isDark);
    darkToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem(DARK_KEY, isDark ? '1' : '0');
  }

  applyDark(localStorage.getItem(DARK_KEY) === '1');

  darkToggle.addEventListener('click', function () {
    applyDark(!document.body.classList.contains('dark'));
  });

  // -----------------------------------------------
  // 文字サイズの初期化
  // -----------------------------------------------
  const fontSizes = ['small', 'medium', 'large'];
  const fsBtns    = document.querySelectorAll('.fs-btn');

  function applyFontSize(size) {
    fontSizes.forEach(function (s) { document.body.classList.remove('fs-' + s); });
    document.body.classList.add('fs-' + size);
    fsBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.size === size);
    });
    localStorage.setItem(FONTSIZE_KEY, size);
  }

  applyFontSize(localStorage.getItem(FONTSIZE_KEY) || 'medium');

  fsBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { applyFontSize(btn.dataset.size); });
  });

  // -----------------------------------------------
  // 状態絞り込みタブ
  // -----------------------------------------------
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderMemos();
    });
  });

  // -----------------------------------------------
  // カテゴリ絞り込みタブ
  // -----------------------------------------------
  const catBtns = document.querySelectorAll('.cat-btn');
  catBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      catBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderMemos();
    });
  });

  // ページを開いたとき、保存済みのメモを表示する
  renderMemos();

  // 「追加する」ボタン
  addBtn.addEventListener('click', addMemo);

  // Enter キーで追加（Shift+Enter は改行）
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addMemo();
    }
  });

  // 「全部削除」ボタン
  clearBtn.addEventListener('click', function () {
    if (!confirm('全部のメモを削除しますか？')) return;
    saveMemos([]);
    renderMemos();
  });

  // 検索欄
  searchInput.addEventListener('input', renderMemos);

  // -----------------------------------------------
  // JSON書き出しボタン
  // -----------------------------------------------
  exportBtn.addEventListener('click', function () {
    const json = JSON.stringify(loadMemos(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'memo-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // -----------------------------------------------
  // JSON読み込み
  // -----------------------------------------------
  importFile.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) {
          alert('読み込めませんでした。正しいメモのJSONファイルを選んでください。');
          return;
        }

        if (!confirm('今のメモを全部置き換えますか？\nキャンセルすると今のメモに追加されます。')) {
          const existing = loadMemos();
          const existIds = new Set(existing.map(function (m) { return m.id; }));
          saveMemos(existing.concat(imported.filter(function (m) { return !existIds.has(m.id); })));
        } else {
          saveMemos(imported);
        }

        renderMemos();
        alert('読み込み完了しました。');
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
      }
    };

    reader.readAsText(file);
    importFile.value = '';
  });

  // -----------------------------------------------
  // メモを追加する
  // -----------------------------------------------
  function addMemo() {
    const text = input.value.trim();
    if (text === '') { input.focus(); return; }

    const memos = loadMemos();
    memos.unshift({
      id:       Date.now(),
      text:     text,
      date:     getNowString(),
      done:     false,
      doneDate: null,
      fav:      false,
      category: categorySelect.value
    });

    saveMemos(memos);
    input.value = '';
    input.focus();
    renderMemos();
  }

  // -----------------------------------------------
  // メモを削除する（確認メッセージあり）
  // -----------------------------------------------
  function deleteMemo(id) {
    if (!confirm('このメモを削除しますか？')) return; // 削除前に確認する
    saveMemos(loadMemos().filter(function (m) { return m.id !== id; }));
    renderMemos();
  }

  // -----------------------------------------------
  // メモを上下に移動する
  // 保存されている配列の順番を入れ替える
  // -----------------------------------------------
  function moveMemo(id, direction) {
    const memos = loadMemos();
    const idx   = memos.findIndex(function (m) { return m.id === id; });
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= memos.length) return; // 端なので動かせない

    // 隣のメモと入れ替える
    const temp      = memos[idx];
    memos[idx]      = memos[swapIdx];
    memos[swapIdx]  = temp;

    saveMemos(memos);
    renderMemos();
  }

  // -----------------------------------------------
  // 完了フラグを切り替える（完了日時も記録する）
  // -----------------------------------------------
  function toggleDone(id) {
    const memos = loadMemos().map(function (m) {
      if (m.id === id) {
        m.done     = !m.done;
        m.doneDate = m.done ? getNowString() : null;
      }
      return m;
    });
    saveMemos(memos);
    renderMemos();
  }

  // -----------------------------------------------
  // お気に入りフラグを切り替える
  // -----------------------------------------------
  function toggleFav(id) {
    const memos = loadMemos().map(function (m) {
      if (m.id === id) m.fav = !m.fav;
      return m;
    });
    saveMemos(memos);
    renderMemos();
  }

  // -----------------------------------------------
  // メモを編集して保存する
  // -----------------------------------------------
  function saveMemoEdit(id, newText) {
    const memos = loadMemos().map(function (m) {
      if (m.id === id) m.text = newText;
      return m;
    });
    saveMemos(memos);
    renderMemos();
  }

  // -----------------------------------------------
  // メモ一覧を画面に描く
  // -----------------------------------------------
  function renderMemos() {
    const allMemos = loadMemos(); // 保存されている全メモ（移動ボタンの判定に使う）

    let memos = allMemos.map(function (m) {
      if (!m.category) m.category = 'その他';
      return m;
    });

    // お気に入りを先頭に並べる
    memos = memos.filter(function (m) { return m.fav; })
                 .concat(memos.filter(function (m) { return !m.fav; }));

    // 検索フィルター
    const keyword = searchInput.value.trim();
    if (keyword !== '') {
      memos = memos.filter(function (m) { return m.text.includes(keyword); });
    }

    // 状態絞り込み
    if (currentFilter === 'active') {
      memos = memos.filter(function (m) { return !m.done; });
    } else if (currentFilter === 'done') {
      memos = memos.filter(function (m) { return m.done; });
    } else if (currentFilter === 'fav') {
      memos = memos.filter(function (m) { return m.fav; });
    }

    // カテゴリ絞り込み
    if (currentCat !== 'all') {
      memos = memos.filter(function (m) { return m.category === currentCat; });
    }

    // 並び替え
    if (sortSelect.value === 'old') {
      memos = memos.slice().reverse();
    }

    // 一覧を空にする
    memoList.innerHTML = '';

    // 件数表示
    memoCount.textContent = keyword !== ''
      ? memos.length + '件（検索中）'
      : memos.length + '件';

    // 0件のとき
    if (memos.length === 0) {
      const msg = document.createElement('li');
      msg.className = 'empty-msg';
      if (keyword !== '') {
        msg.textContent = '「' + keyword + '」に一致するメモがありません。';
      } else if (currentFilter === 'done') {
        msg.textContent = '完了したメモがありません。';
      } else if (currentFilter === 'active') {
        msg.textContent = '未完了のメモがありません。';
      } else if (currentFilter === 'fav') {
        msg.textContent = 'お気に入りのメモがありません。';
      } else if (currentCat !== 'all') {
        msg.textContent = '「' + currentCat + '」のメモがありません。';
      } else {
        msg.textContent = 'まだメモがありません。上の入力欄に書いてみてください。';
      }
      memoList.appendChild(msg);
      return;
    }

    const catIcons = { '仕事': '💼', '個人': '🙂', '買い物': '🛒', 'その他': '📌' };

    memos.forEach(function (memo, displayIdx) {
      const cat      = memo.category || 'その他';
      const icon     = catIcons[cat] || '📌';

      // 保存配列の中でのこのメモの位置（上下移動ボタンの表示に使う）
      const storedIdx   = allMemos.findIndex(function (m) { return m.id === memo.id; });
      const isFirst     = storedIdx === 0;
      const isLast      = storedIdx === allMemos.length - 1;

      const li = document.createElement('li');
      li.className = 'memo-item cat-' + cat
        + (memo.done ? ' is-done' : '')
        + (memo.fav  ? ' is-fav'  : '');

      const doneDateHtml = (memo.done && memo.doneDate)
        ? `<div class="memo-done-date">✅ 完了：${memo.doneDate}</div>`
        : '';

      li.innerHTML = `
        <div class="memo-top">
          <div class="memo-main">
            <input type="checkbox" class="memo-check" ${memo.done ? 'checked' : ''} title="完了にする">
            <span class="memo-text">${escapeHtml(memo.text)}</span>
          </div>
          <div class="memo-actions">
            <button class="move-btn up-btn"   title="上へ移動" ${isFirst ? 'disabled' : ''}>▲</button>
            <button class="move-btn down-btn" title="下へ移動" ${isLast  ? 'disabled' : ''}>▼</button>
            <button class="fav-btn ${memo.fav ? 'on' : ''}" title="${memo.fav ? 'お気に入り解除' : 'お気に入り'}">⭐</button>
            <button class="edit-btn"   title="編集">✏️</button>
            <button class="delete-btn" title="削除">✕</button>
          </div>
        </div>
        <span class="memo-cat">${icon} ${cat}</span>
        <div class="memo-date">作成：${memo.date}</div>
        ${doneDateHtml}
      `;

      li.querySelector('.up-btn').addEventListener('click',    function () { moveMemo(memo.id, 'up'); });
      li.querySelector('.down-btn').addEventListener('click',  function () { moveMemo(memo.id, 'down'); });
      li.querySelector('.memo-check').addEventListener('change', function () { toggleDone(memo.id); });
      li.querySelector('.fav-btn').addEventListener('click',   function () { toggleFav(memo.id); });
      li.querySelector('.delete-btn').addEventListener('click', function () { deleteMemo(memo.id); });
      li.querySelector('.edit-btn').addEventListener('click',  function () { switchToEditMode(li, memo); });

      memoList.appendChild(li);
    });
  }

  // -----------------------------------------------
  // 編集モードに切り替える
  // Esc キーでキャンセルできる
  // -----------------------------------------------
  function switchToEditMode(li, memo) {
    li.innerHTML = `
      <textarea class="edit-textarea">${escapeHtml(memo.text)}</textarea>
      <div class="edit-actions">
        <button class="save-btn">保存する</button>
        <button class="cancel-btn">キャンセル</button>
      </div>
    `;

    const editArea = li.querySelector('.edit-textarea');
    editArea.focus();
    editArea.setSelectionRange(editArea.value.length, editArea.value.length);

    // Esc キーでキャンセルする
    editArea.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        renderMemos(); // 元の表示に戻す
      }
    });

    li.querySelector('.save-btn').addEventListener('click', function () {
      const newText = editArea.value.trim();
      if (newText === '') return;
      saveMemoEdit(memo.id, newText);
    });

    li.querySelector('.cancel-btn').addEventListener('click', renderMemos);
  }

  // -----------------------------------------------
  // localStorage からメモ一覧を読み込む
  // -----------------------------------------------
  function loadMemos() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // -----------------------------------------------
  // localStorage にメモ一覧を保存する
  // -----------------------------------------------
  function saveMemos(memos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  }

  // -----------------------------------------------
  // 今の日時を返す
  // -----------------------------------------------
  function getNowString() {
    const now = new Date();
    const y  = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d  = String(now.getDate()).padStart(2, '0');
    const h  = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return y + '/' + mo + '/' + d + ' ' + h + ':' + mi;
  }

  // -----------------------------------------------
  // HTML に直接入れる文字を安全にする（XSS対策）
  // -----------------------------------------------
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

});
