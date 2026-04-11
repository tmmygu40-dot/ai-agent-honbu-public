const colorPicker = document.getElementById('colorPicker');
const colorCode = document.getElementById('colorCode');
const colorName = document.getElementById('colorName');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const palette = document.getElementById('palette');
const colorCount = document.getElementById('colorCount');
const toast = document.getElementById('toast');

let colors = JSON.parse(localStorage.getItem('palette_colors') || '[]');
let toastTimer = null;

// カラーピッカー ↔ テキスト入力の同期
colorPicker.addEventListener('input', () => {
  colorCode.value = colorPicker.value;
});

colorCode.addEventListener('input', () => {
  const val = colorCode.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    colorPicker.value = val;
  }
});

// 色を追加
addBtn.addEventListener('click', addColor);
colorCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addColor();
});
colorName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addColor();
});

function addColor() {
  const hex = colorCode.value.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    showToast('正しいカラーコードを入力してください（例：#4A90D9）');
    return;
  }
  const name = colorName.value.trim() || hex;
  colors.push({ hex, name, id: Date.now() });
  save();
  render();
  colorName.value = '';
  showToast('色を追加しました');
}

// すべて削除
clearBtn.addEventListener('click', () => {
  if (colors.length === 0) return;
  if (confirm('すべての色を削除しますか？')) {
    colors = [];
    save();
    render();
  }
});

// 保存
function save() {
  localStorage.setItem('palette_colors', JSON.stringify(colors));
}

// 描画
function render() {
  palette.innerHTML = '';
  colorCount.textContent = `${colors.length}色`;

  colors.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'color-card';

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = c.hex;
    swatch.title = 'クリックでコピー';
    swatch.addEventListener('click', () => copyToClipboard(c.hex));

    const info = document.createElement('div');
    info.className = 'color-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'color-name';
    nameEl.textContent = c.name;
    nameEl.title = c.name;

    const hexEl = document.createElement('div');
    hexEl.className = 'color-hex';
    hexEl.textContent = c.hex;
    hexEl.title = 'コピー';
    hexEl.addEventListener('click', () => copyToClipboard(c.hex));

    info.appendChild(nameEl);
    info.appendChild(hexEl);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.title = '削除';
    delBtn.addEventListener('click', () => {
      colors = colors.filter((item) => item.id !== c.id);
      save();
      render();
    });

    card.appendChild(swatch);
    card.appendChild(info);
    card.appendChild(delBtn);
    palette.appendChild(card);
  });
}

// クリップボードコピー
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${text} をコピーしました`);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`${text} をコピーしました`);
  }
}

// トースト通知
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// 初期描画
render();
