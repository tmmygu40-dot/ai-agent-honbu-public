(function(){
  if (window.__nekoShareWidgetLoaded) return;
  window.__nekoShareWidgetLoaded = true;

  var SITE_TAG = 'ネコポケ';

  function getShareTitle(){
    var h1 = document.querySelector('h1');
    var t = (h1 && h1.textContent.trim()) || document.title || '';
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 60) t = t.slice(0, 58) + '…';
    return t;
  }
  function getShareUrl(){ return window.location.href.split('#')[0]; }

  function buildXUrl(title, url){
    return 'https://x.com/intent/tweet'
      + '?text=' + encodeURIComponent(title)
      + '&url='  + encodeURIComponent(url)
      + '&hashtags=' + encodeURIComponent(SITE_TAG);
  }
  function buildLineUrl(url){
    return 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  }

  function copyText(text, cb){
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function(){ cb(true); }, function(){ cb(false); });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      cb(!!ok);
    } catch(e){ cb(false); }
  }

  function showToast(msg){
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed','left:50%','bottom:88px','transform:translateX(-50%)',
      'background:rgba(40,40,40,0.92)','color:#fff','padding:10px 18px',
      'border-radius:20px','font-size:0.85rem','z-index:10000',
      'box-shadow:0 2px 8px rgba(0,0,0,0.25)','pointer-events:none',
      'opacity:0','transition:opacity 0.2s'
    ].join(';');
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity = '1'; });
    setTimeout(function(){
      t.style.opacity = '0';
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 1600);
  }

  var fabBtn, panel, isOpen = false;

  function makeFab(){
    fabBtn = document.createElement('button');
    fabBtn.type = 'button';
    fabBtn.id = 'neko-share-fab';
    fabBtn.setAttribute('aria-label', 'シェアする');
    fabBtn.innerHTML = '<span style="font-size:1.3rem;line-height:1;">🔗</span>'
      + '<span style="font-size:0.6rem;font-weight:600;margin-top:2px;">シェア</span>';
    fabBtn.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:calc(16px + env(safe-area-inset-bottom, 0px))',
      'z-index:9998',
      'width:56px','height:56px',
      'display:flex','flex-direction:column','align-items:center','justify-content:center',
      'background:#fff8ee','color:#f5a623',
      'border:2px solid #e07b00','border-radius:28px',
      'cursor:pointer','box-shadow:0 3px 10px rgba(0,0,0,0.18)',
      '-webkit-tap-highlight-color:transparent',
      'transition:transform 0.15s, box-shadow 0.15s',
      'padding:0'
    ].join(';');
    fabBtn.addEventListener('click', function(e){
      e.stopPropagation();
      toggle();
    });
    document.body.appendChild(fabBtn);
  }

  function makePanel(){
    panel = document.createElement('div');
    panel.id = 'neko-share-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:calc(80px + env(safe-area-inset-bottom, 0px))',
      'z-index:9998',
      'background:#fff','border:1px solid #eadfc8','border-radius:14px',
      'box-shadow:0 6px 20px rgba(0,0,0,0.18)',
      'padding:8px','display:none','flex-direction:column','gap:6px',
      'min-width:180px'
    ].join(';');

    panel.appendChild(makeItem('𝕏', 'Xでシェア', '#111', function(){
      window.open(buildXUrl(getShareTitle(), getShareUrl()), '_blank', 'noopener');
      close();
    }));
    panel.appendChild(makeItem('L', 'LINEでシェア', '#06c755', function(){
      window.open(buildLineUrl(getShareUrl()), '_blank', 'noopener');
      close();
    }));
    panel.appendChild(makeItem('📋', 'URLをコピー', '#f5a623', function(){
      copyText(getShareUrl(), function(ok){
        showToast(ok ? 'URLをコピーしました' : 'コピーに失敗しました');
      });
      close();
    }));

    document.body.appendChild(panel);

    document.addEventListener('click', function(e){
      if (!isOpen) return;
      if (panel.contains(e.target) || fabBtn.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  function makeItem(icon, label, iconColor, onClick){
    var b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = [
      'display:flex','align-items:center','gap:10px',
      'background:#fff','border:none','border-radius:10px',
      'padding:10px 12px','min-height:44px','cursor:pointer',
      'font-size:0.9rem','color:#333','text-align:left','width:100%',
      '-webkit-tap-highlight-color:transparent'
    ].join(';');
    var ic = document.createElement('span');
    ic.textContent = icon;
    ic.style.cssText = 'display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;font-weight:700;font-size:1rem;color:'+iconColor+';';
    var tx = document.createElement('span');
    tx.textContent = label;
    b.appendChild(ic);
    b.appendChild(tx);
    b.addEventListener('mouseenter', function(){ b.style.background = '#fdf8ef'; });
    b.addEventListener('mouseleave', function(){ b.style.background = '#fff'; });
    b.addEventListener('click', onClick);
    return b;
  }

  function open(){ panel.style.display = 'flex'; isOpen = true; }
  function close(){ panel.style.display = 'none'; isOpen = false; }
  function toggle(){ isOpen ? close() : open(); }

  function init(){
    makeFab();
    makePanel();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
