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
    var anchor = document.querySelector('.back-link');
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
      link.textContent = a.name;
      link.style.cssText = 'display:block;padding:0.6rem 0.8rem;font-size:0.92rem;color:#1c1917;background:#f5f0e8;border:1px solid #e8ddd0;border-radius:9px;text-decoration:none;';
      list.appendChild(link);
    });
    box.appendChild(list);

    anchor.parentNode.insertBefore(box, anchor);
  }

  var current = getCurrentAppName();
  if(!current) return;
  fetchAppList().then(function(apps){
    render(pickRelated(apps, current, 5));
  }).catch(function(){});
})();
