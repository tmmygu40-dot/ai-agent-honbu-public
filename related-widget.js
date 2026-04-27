(function(){
  function getCurrentAppName(){
    var p = decodeURIComponent(window.location.pathname);
    var m = p.match(/\/([^\/]+)\/(?:index\.html)?$/);
    return m ? m[1] : '';
  }

  function bigrams(s){
    var out = {};
    for(var i=0; i<s.length-1; i++) out[s.substr(i, 2)] = true;
    return out;
  }

  function score(a, b){
    var ag = bigrams(a), bg = bigrams(b), n = 0;
    for(var k in ag){ if(bg[k]) n++; }
    return n;
  }

  function pickEmoji(name){
    // 上から順に評価 (具体的なカテゴリ → 汎用)
    var rules = [
      { e: '🩺', kw: ['健康','体調','血圧','体重','ダイエット','カロリー','栄養','睡眠','運動','病気','医療','診察','予防接種'] },
      { e: '🎒', kw: ['防災','災害','地震','備蓄','避難','停電','非常','ハザード'] },
      { e: '💰', kw: ['保険','年金','資産','投資','貯蓄','税','確定申告','所得','給与','損益','利益','利率','ローン','預金','為替','収入','報酬','資金','補助金'] },
      { e: '✉️', kw: ['メール','文例','文書','テンプレ','送付','案内','通知','宛名','返信','お詫び','挨拶','文章','案内文'] },
      { e: '⚖️', kw: ['クレーム','苦情','相談','法律','契約','相続','トラブル','労基','違反','コンプライアンス','就業規則','通知書'] },
      { e: '🏠', kw: ['家計','食費','生活費','買い物','節約','暮らし','引越','賃貸','住宅','光熱','家賃'] },
      { e: '📋', kw: ['業務','勤怠','有給','シフト','経費','在庫','売上','顧客','営業','報告','議事録','受注','発注','管理','作業','稟議','立替','精算','見積','請求'] },
      { e: '🔍', kw: ['診断','チェック','判定','クイズ','確認','検査','計算','チェッカー','シミュレーター','比較','逆引き'] }
    ];
    for(var i=0; i<rules.length; i++){
      var r = rules[i];
      for(var j=0; j<r.kw.length; j++){
        if(name.indexOf(r.kw[j]) !== -1) return r.e;
      }
    }
    return '🔗';
  }

  function fetchAppList(){
    return fetch('../index.html').then(function(r){ return r.text(); }).then(function(html){
      var apps = [], re = /<a[^>]+href="\.\/([^\/"?#]+)\/?"[^>]*>([^<]+)<\/a>/g, m;
      while((m = re.exec(html)) !== null){
        var folder;
        try { folder = decodeURIComponent(m[1]); } catch(e){ folder = m[1]; }
        if(/\.html$/i.test(folder)) continue;
        var label = m[2].trim();
        apps.push({ folder: folder, name: label || folder });
      }
      return apps;
    });
  }

  function pickRelated(apps, currentName, n){
    return apps
      .filter(function(a){ return a.folder !== currentName; })
      .map(function(a){ return { app: a, s: score(currentName, a.name) }; })
      .filter(function(x){ return x.s > 0; })
      .sort(function(a, b){ return b.s - a.s; })
      .slice(0, n)
      .map(function(x){ return x.app; });
  }

  function render(items){
    if(!items.length) return;
    var anchors = document.querySelectorAll('.back-link');
    var anchor = anchors[anchors.length - 1];
    if(!anchor) return;

    var box = document.createElement('div');
    box.className = 'no-print';
    box.id = 'related-widget';
    box.style.cssText = 'max-width:600px;margin:2rem auto 1rem;padding:1rem 1.2rem;background:#fff;border:1.5px solid #e8ddd0;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.06);';

    var title = document.createElement('p');
    title.textContent = '🔗 こんなアプリも';
    title.style.cssText = 'font-size:0.78rem;font-weight:700;color:#888;letter-spacing:0.06em;margin-bottom:0.7rem;';
    box.appendChild(title);

    var list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;';
    items.forEach(function(a){
      var link = document.createElement('a');
      link.href = '../' + encodeURIComponent(a.folder) + '/';
      link.textContent = pickEmoji(a.name) + ' ' + a.name;
      link.style.cssText = 'display:block;padding:0.6rem 0.8rem;font-size:0.92rem;color:#1c1917;background:#f5f0e8;border:1px solid #e8ddd0;border-radius:9px;text-decoration:none;';
      list.appendChild(link);
    });
    box.appendChild(list);

    anchor.parentNode.insertBefore(box, anchor);
  }

  var current = getCurrentAppName();
  if(!current) return;
  fetchAppList().then(function(apps){
    render(pickRelated(apps, current, 3));
  }).catch(function(){});
})();
