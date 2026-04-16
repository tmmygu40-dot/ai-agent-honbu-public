const CATEGORIES = [
  {
    id: 'yakusho',
    icon: '🏛️',
    title: '役所・行政手続き',
    items: [
      '転出届を旧住所の市区町村役所に提出する',
      '転入届を新住所の市区町村役所に提出する（引越し後14日以内）',
      'マイナンバーカードの住所変更をする',
      '印鑑登録を新住所で行う',
      '運転免許証の住所変更をする（警察署・運転免許センター）',
      '国民健康保険の転出・転入手続きをする',
      '国民年金の住所変更をする',
      '選挙人名簿の登録（自動で更新される場合も確認）',
    ],
  },
  {
    id: 'lifeline',
    icon: '⚡',
    title: '電気・ガス・水道',
    items: [
      '電気の解約（旧住所）の手続きをする',
      '電気の開通（新住所）の手続きをする',
      'ガスの解約（旧住所）の手続きをする',
      'ガスの開通（新住所）の手続きをする（立ち会い日程を確認）',
      '水道の使用停止（旧住所）の手続きをする',
      '水道の使用開始（新住所）の手続きをする',
      'インターネット回線の移転・新規契約をする',
    ],
  },
  {
    id: 'yuubin',
    icon: '📮',
    title: '郵便・通信',
    items: [
      '郵便局に転居届を提出する（旧住所への郵便を転送）',
      'NHKの住所変更をする',
      'スマートフォン・携帯電話の住所変更をする',
      '固定電話（あれば）の移転手続きをする',
    ],
  },
  {
    id: 'bank',
    icon: '🏦',
    title: '銀行・金融機関',
    items: [
      '銀行口座（メインバンク）の住所変更をする',
      'その他の銀行口座の住所変更をする',
      'クレジットカードの住所変更をする',
      '証券口座（あれば）の住所変更をする',
      '生命保険・医療保険の住所変更をする',
    ],
  },
  {
    id: 'tax',
    icon: '📋',
    title: '税金・公共料金',
    items: [
      '自動車税の住所変更をする（車検証の記載変更）',
      '車庫証明を新住所で取得する（引越し後15日以内）',
      '固定資産税（持家の場合）の連絡先変更をする',
    ],
  },
  {
    id: 'daily',
    icon: '🛒',
    title: '日常サービス・定期購読',
    items: [
      'ネットショッピング（Amazon・楽天など）の住所変更をする',
      '定期購読サービスの配送先住所を変更する',
      'ポイントカード・会員登録の住所変更をする',
      '会社（勤務先）に住所変更を届け出る',
      '子どもの学校・保育園の転校・転園手続きをする',
    ],
  },
  {
    id: 'hikkoshi',
    icon: '📦',
    title: '引越し作業',
    items: [
      '引越し業者に見積もりを依頼する',
      '引越し業者と日程・金額を確定する',
      '荷造りを開始する（不要品の処分・梱包）',
      '旧住所の部屋の清掃・原状回復を確認する',
      '鍵の返却・受け取りをする',
      '引越し当日の作業が完了しているか確認する',
      '新居の設備・傷の有無を確認して記録する',
    ],
  },
  {
    id: 'others',
    icon: '📝',
    title: 'その他',
    items: [
      '医療機関（かかりつけ医）に住所変更を伝える',
      'ペット（犬）の登録住所変更をする',
      '子どもの習い事・塾の住所変更をする',
      '近隣住民への挨拶をする',
      '旧住所の住民への挨拶・連絡をする',
    ],
  },
];

const STORAGE_KEY = 'hikkoshi_checklist';

function loadChecked() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChecked(checked) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
}

let checked = loadChecked();

function getItemId(catId, idx) {
  return `${catId}_${idx}`;
}

function renderAll() {
  const main = document.getElementById('main');
  main.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';

    const doneCount = cat.items.filter((_, i) => checked[getItemId(cat.id, i)]).length;
    const total = cat.items.length;
    const allDone = doneCount === total;
    const pct = total > 0 ? Math.round(doneCount / total * 100) : 0;

    card.innerHTML = `
      <div class="category-header">
        <span class="category-icon">${cat.icon}</span>
        <span class="category-title">${cat.title}</span>
        <span class="category-badge${allDone ? ' done' : ''}">${doneCount}/${total}</span>
      </div>
      <div class="category-progress-bar">
        <div class="category-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="category-items">
        ${cat.items.map((item, i) => {
          const id = getItemId(cat.id, i);
          const isChecked = !!checked[id];
          return `<div class="check-item${isChecked ? ' checked' : ''}" data-id="${id}">
            <input type="checkbox" id="chk_${id}"${isChecked ? ' checked' : ''}>
            <label for="chk_${id}">${item}</label>
          </div>`;
        }).join('')}
      </div>
    `;

    card.querySelectorAll('.check-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.id;
        const chk = el.querySelector('input[type="checkbox"]');
        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }
        checked[id] = chk.checked;
        saveChecked(checked);
        renderAll();
      });
    });

    main.appendChild(card);
  });

  updateTotalProgress();
}

function updateTotalProgress() {
  let total = 0;
  let done = 0;
  CATEGORIES.forEach(cat => {
    total += cat.items.length;
    cat.items.forEach((_, i) => {
      if (checked[getItemId(cat.id, i)]) done++;
    });
  });
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('total-count').textContent = `${done} / ${total} 完了`;
  document.getElementById('total-fill').style.width = pct + '%';
}

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('すべてのチェックをリセットしますか？')) {
    checked = {};
    saveChecked(checked);
    renderAll();
  }
});

renderAll();
