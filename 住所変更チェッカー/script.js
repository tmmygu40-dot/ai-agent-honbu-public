const CHECKLIST = [
  {
    category: "🏛️ 役所・行政",
    items: [
      { id: "gov1", label: "転出届（旧住所の市区町村役所）", note: "引越し前に手続き" },
      { id: "gov2", label: "転入届（新住所の市区町村役所）", note: "引越し後14日以内" },
      { id: "gov3", label: "マイナンバーカードの住所変更", note: "転入届と同時に可" },
      { id: "gov4", label: "印鑑登録の変更または新規登録", note: "旧住所での登録は自動抹消" },
      { id: "gov5", label: "運転免許証の住所変更", note: "警察署・運転免許センター" },
      { id: "gov6", label: "パスポートの住所変更（記載事項変更）", note: "旅券事務所または市区町村" },
      { id: "gov7", label: "国民健康保険の変更手続き", note: "該当者のみ" },
      { id: "gov8", label: "国民年金の住所変更", note: "マイナンバー連携済みの場合は不要なことも" },
      { id: "gov9", label: "児童手当の住所変更", note: "該当者のみ" },
    ]
  },
  {
    category: "📮 郵便・通信",
    items: [
      { id: "post1", label: "郵便局への転居届（転送サービス）", note: "1年間、旧住所に届いた郵便を転送" },
      { id: "post2", label: "携帯電話・スマートフォンの住所変更", note: "各キャリアのWebまたは店舗" },
      { id: "post3", label: "インターネット・固定電話の移転手続き", note: "プロバイダ・NTTなどに連絡" },
    ]
  },
  {
    category: "🏦 金融・クレジット",
    items: [
      { id: "fin1", label: "銀行口座の住所変更（メインバンク）", note: "ネットバンキングまたは窓口" },
      { id: "fin2", label: "銀行口座の住所変更（サブバンク）", note: "" },
      { id: "fin3", label: "クレジットカードの住所変更（メイン）", note: "各カード会社のWeb・電話" },
      { id: "fin4", label: "クレジットカードの住所変更（サブ）", note: "" },
      { id: "fin5", label: "証券・投資口座の住所変更", note: "該当者のみ" },
      { id: "fin6", label: "ローン・住宅ローンの住所変更", note: "該当者のみ" },
    ]
  },
  {
    category: "🔌 ライフライン",
    items: [
      { id: "life1", label: "電力会社への解約・新規申込", note: "旧住所の解約と新住所の申込" },
      { id: "life2", label: "ガス会社への解約・新規申込", note: "立会いが必要な場合あり" },
      { id: "life3", label: "水道局への解約・新規申込", note: "市区町村の水道局に連絡" },
    ]
  },
  {
    category: "🏥 保険・年金",
    items: [
      { id: "ins1", label: "生命保険の住所変更", note: "各保険会社のWeb・電話" },
      { id: "ins2", label: "火災・地震保険の住所変更", note: "" },
      { id: "ins3", label: "自動車保険の住所変更", note: "車庫証明も必要な場合あり" },
      { id: "ins4", label: "勤務先の厚生年金・社会保険の住所変更", note: "会社の人事・総務へ届け出" },
    ]
  },
  {
    category: "🚗 自動車・交通",
    items: [
      { id: "car1", label: "車庫証明の取得（新住所の管轄警察署）", note: "引越し後15日以内" },
      { id: "car2", label: "車検証の住所変更（陸運局）", note: "車庫証明取得後" },
      { id: "car3", label: "自動車税・軽自動車税の住所変更", note: "運輸支局または市区町村" },
      { id: "car4", label: "ETC カードの住所変更", note: "クレジット会社に問い合わせ" },
      { id: "car5", label: "SUICA・PASMOなどの住所変更", note: "該当者のみ" },
    ]
  },
  {
    category: "💼 仕事・会社関係",
    items: [
      { id: "work1", label: "勤務先への住所変更届", note: "人事・総務部へ" },
      { id: "work2", label: "給与振込口座の確認・変更", note: "住所変更後の口座が有効か確認" },
      { id: "work3", label: "通勤定期の変更・申請", note: "経路変更がある場合" },
    ]
  },
  {
    category: "🛒 サービス・その他",
    items: [
      { id: "srv1", label: "Amazon・楽天などのネット通販の住所変更", note: "" },
      { id: "srv2", label: "Amazonプライム・Netflix等サブスクの住所変更", note: "請求住所の更新" },
      { id: "srv3", label: "NHK受信料の住所変更", note: "NHKのWebまたは電話" },
      { id: "srv4", label: "新聞・雑誌定期購読の住所変更", note: "該当者のみ" },
      { id: "srv5", label: "病院・クリニックへの住所変更連絡", note: "かかりつけ医など" },
      { id: "srv6", label: "学校・保育園・幼稚園の転校・転園手続き", note: "該当者のみ" },
      { id: "srv7", label: "ペット登録の住所変更（市区町村）", note: "該当者のみ" },
      { id: "srv8", label: "友人・知人への新住所の連絡", note: "" },
    ]
  }
];

const STORAGE_KEY = "address_change_checker";

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

function getTotalAndDone() {
  let total = 0, done = 0;
  CHECKLIST.forEach(cat => {
    cat.items.forEach(item => {
      total++;
      if (checked[item.id]) done++;
    });
  });
  return { total, done };
}

function updateProgress() {
  const { total, done } = getTotalAndDone();
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressText").textContent = `${done} / ${total} 完了（${pct}%）`;
}

function updateCategoryCount(catEl, catDef) {
  const done = catDef.items.filter(i => checked[i.id]).length;
  const total = catDef.items.length;
  catEl.querySelector(".category-count").textContent = `${done} / ${total}`;
}

function toggleItem(id, itemEl, catEl, catDef) {
  checked[id] = !checked[id];
  saveChecked(checked);
  if (checked[id]) {
    itemEl.classList.add("done");
  } else {
    itemEl.classList.remove("done");
  }
  updateCategoryCount(catEl, catDef);
  updateProgress();
}

function buildUI() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  CHECKLIST.forEach(catDef => {
    const catEl = document.createElement("div");
    catEl.className = "category";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<h2>${catDef.category}</h2><span class="category-count">0 / ${catDef.items.length}</span>`;
    catEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "category-body";

    catDef.items.forEach(itemDef => {
      const itemEl = document.createElement("div");
      itemEl.className = "item" + (checked[itemDef.id] ? " done" : "");
      itemEl.innerHTML = `
        <div class="checkbox"><span class="checkbox-icon">✓</span></div>
        <div>
          <div class="item-label">${itemDef.label}</div>
          ${itemDef.note ? `<div class="item-note">${itemDef.note}</div>` : ""}
        </div>
      `;
      itemEl.addEventListener("click", () => toggleItem(itemDef.id, itemEl, catEl, catDef));
      body.appendChild(itemEl);
    });

    catEl.appendChild(body);
    main.appendChild(catEl);
    updateCategoryCount(catEl, catDef);
  });

  updateProgress();
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("すべてのチェックをリセットしますか？")) {
    checked = {};
    saveChecked(checked);
    buildUI();
  }
});

buildUI();
