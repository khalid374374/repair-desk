/* متجر المحل (خالد 2026-11-08) — docs/store-plan.md
   صفحة واحدة بالـ hash: #/ الرئيسية، #/c/<قسم>، #/q/<بحث>، #/p/<منتج>، #/cart، #/checkout، #/o/<كود>، #/orders، #/svc، #/bill، #/repair، #/wish، #/trade، #/info
   الأسعار هنا للعرض بس: السيرفر بيحسب الطلب كله من نسخته. مفيش أي مفاتيح سرية في الصفحة (المفتاح العام بتاع Supabase بس). */
(function () {
  'use strict';
  var SB = 'https://sgqscttmkhmiqyjsuvio.supabase.co', GW = SB + '/functions/v1/gateway', ST = SB + '/storage/v1/object/public/store/';
  var KEY = 'sb_publishable_y11CnpnNLb6qIx00LVUHJQ_BzzQNXim';   // مفتاح عام (نفس اللي في t.html)
  var app = document.getElementById('app');
  var slug = '', C = null, P = {}, deferredInstall = null, timers = [], pollT = 0, trackLoad = null;

  /* ---------- أدوات ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = function (k, v) { var key = 'rds_' + slug + '_' + k; try { if (v === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(v)); } catch (e) { return null; } };
  var fm = function (n) { n = Math.round((+n || 0) * 100) / 100; return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  var cur = function () { return (C && C.cur) || 'ج'; };
  var money = function (n) { return '<span class="num">' + fm(n) + '</span> ' + esc(cur()); };
  var img = function (name) { return name ? ST + encodeURIComponent(slug) + '/i/' + encodeURIComponent(name) : ''; };
  var pic = function (p, big) { var u = p && p.img && p.img[0] ? img(p.img[0]) : ''; return u ? '<img src="' + esc(u) + '" alt="" loading="' + (big ? 'eager' : 'lazy') + '" decoding="async">' : esc((p && p.ic) || iconOf(p)); };
  function iconOf(p) { var c = p && catOf(p.c); return (c && c.ic) || '📦'; }
  function catOf(id) { return ((C && C.cats) || []).filter(function (c) { return c.id === id; })[0] || null; }
  function toast(t, k) { var el = document.getElementById('toast'); el.textContent = t; el.className = 'on ' + (k || ''); clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = k || ''; }, 2600); if (navigator.vibrate && k === 'ok') try { navigator.vibrate(12); } catch (e) {} }
  function gw(body) {
    return fetch(GW, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { error: 'مفيش نت. جرّب تاني.', status: 0 }; });
  }
  function waLink(text) { var n = String((C && C.shop && (C.shop.wa || C.shop.phone)) || '').replace(/\D/g, ''); if (/^01\d{9}$/.test(n)) n = '2' + n; return n ? 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '') : ''; }
  var WA_SVG = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3.2 29l6.9-1.8c1.9 1 4 1.6 6 1.6 7 0 12.7-5.7 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.1 1.1-4-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.3 9.8 10.1 5.1 16 5.1s10.7 4.7 10.7 10.5S21.9 26.1 16 26.1zm5.9-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2s0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.8 1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5.1.8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';

  /* ---------- الأسعار والعروض ---------- */
  function offOn(p) { var o = p && p.off; if (!o || !(+o.pr > 0)) return false; var now = Date.now(); return (!o.from || Date.parse(o.from) <= now) && (!o.to || Date.parse(o.to) >= now); }
  function eff(p) { var on = offOn(p), pr = on ? +p.off.pr : +p.pr || 0, was = on ? (+p.was || +p.pr) : +p.was || 0; return { pr: pr, was: was > pr ? was : 0, end: on && p.off.to ? p.off.to : '', pct: was > pr ? Math.round((1 - pr / was) * 100) : 0 }; }
  function avail(p) { return p && Number.isFinite(+p.q) && +p.q >= 0 ? +p.q : 99; }
  function cdHTML(end, small) { return '<span class="cd" data-end="' + esc(end) + '">' + (small ? '' : '') + '</span>'; }
  function tickTimers() {
    document.querySelectorAll('[data-end]').forEach(function (el) {
      var left = Math.max(0, Date.parse(el.dataset.end) - Date.now()), d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
      var p2 = function (n) { return String(n).padStart(2, '0'); };
      if (el.classList.contains('cd')) el.innerHTML = (d ? '<span class="num">' + d + '<em>يوم</em></span>' : '') + '<span class="num">' + p2(h) + '<em>ساعة</em></span><span class="num">' + p2(m) + '<em>دقيقة</em></span><span class="num">' + p2(s) + '<em>ثانية</em></span>';
      else el.innerHTML = (d ? d + ' يوم و ' : '') + '<bdi dir="ltr">' + p2(h) + ':' + p2(m) + ':' + p2(s) + '</bdi>';
      if (!left && !el.dataset.done) { el.dataset.done = 1; setTimeout(refresh, 400); }
    });
  }
  setInterval(tickTimers, 1000);

  /* ---------- السلة ---------- */
  function cart() { return (ls('cart') || []).filter(function (x) { return P[x.id] && !P[x.id].ask; }); }
  function setCart(c) { ls('cart', c); badge(); }
  function cartCount() { return cart().reduce(function (a, x) { return a + x.q; }, 0); }
  function lineTotal(x) { var p = P[x.id], e = eff(p); return x.q * (e.pr + (x.add || []).reduce(function (a, i) { return a + (+((p.add || [])[i] || {}).p || 0); }, 0)); }
  function addToCart(id, q, add) {
    var p = P[id]; if (!p) return; add = (add || []).slice().sort();
    var c = cart(), k = id + '|' + add.join(','), ex = c.filter(function (x) { return x.k === k; })[0];
    var have = c.filter(function (x) { return x.id === id; }).reduce(function (a, x) { return a + x.q; }, 0);
    if (have + q > avail(p)) return toast('المتاح ' + avail(p) + ' بس', 'bad');
    if (ex) ex.q += q; else c.push({ k: k, id: id, q: q, add: add });
    setCart(c); toast('✓ اتضاف للسلة', 'ok');
    document.querySelectorAll('.bdg[data-cart]').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }
  function badge() { var n = cartCount(); document.querySelectorAll('.bdg[data-cart]').forEach(function (b) { b.textContent = n; b.hidden = !n; }); }

  /* ---------- مواعيد الشغل ---------- */
  function openNow() {
    var h = C && C.shop && C.shop.hours; if (!h || !h.from || !h.to) return true;
    var t = new Date(), m = t.getHours() * 60 + t.getMinutes(), f = h.from.split(':'), e = h.to.split(':');
    var a = +f[0] * 60 + +(f[1] || 0), b = +e[0] * 60 + +(e[1] || 0); if (b === 0) b = 1440;
    if ((h.off || []).indexOf(t.getDay()) >= 0) return false;
    return a <= b ? m >= a && m < b : m >= a || m < b;
  }
  function hoursTxt() { var h = C.shop.hours; if (!h || !h.from) return ''; var f = function (s) { var p = s.split(':'), H = +p[0] % 24, mm = p[1] && p[1] !== '00' ? ':' + p[1] : ''; return (H % 12 || 12) + mm + (H < 12 ? ' ص' : ' م'); }; return f(h.from) + ' – ' + f(h.to); }

  /* ---------- الهيكل ---------- */
  // dk = صفحة من غير القايمة على الموبايل (المنتج / السلة / الفورمات): القايمة بتظهر على الشاشات الكبيرة بس (خالد 2026-11-13: المتجر على الكمبيوتر)
  function navHTML(on, dk) {
    var b = function (k, ic, t, extra) { return '<button data-go="' + k + '" class="' + (on === k ? 'on' : '') + '"><em>' + ic + '</em>' + t + (extra || '') + '</button>'; };
    return '<nav class="nav' + (dk ? ' dk' : '') + '"><div class="nlogo" data-go="#/"><span class="logo">' + logoHTML() + '</span><b>' + esc(C.shop.name) + '</b></div>' + b('#/', '🏠', 'الرئيسية') + b('#/cats', '🗂', 'الأقسام') + b('#/cart', '🛒', 'السلة', '<i class="bdg" data-cart hidden></i>') + b('#/orders', '📦', 'طلباتي') + b('#/svc', '🛠', 'الخدمات') + '</nav>'
      + (!dk && waLink() ? '<a class="wa" href="' + esc(waLink('السلام عليكم، عندي سؤال')) + '" target="_blank" rel="noopener" aria-label="واتساب">' + WA_SVG + '</a>' : '');
  }
  function barHTML(t, sub, back) { return '<div class="bar"><button class="bk" data-back="' + esc(back || '') + '" aria-label="رجوع">→</button><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function logoHTML() { return C.shop.logo ? '<img src="' + esc(img(C.shop.logo)) + '" alt="">' : esc(C.shop.ic || '🔧'); }
  /* QUIET (خالد 2026-11-09: "الموقع بيفضل يعمل ريفرش"): الرسم اللي جاي من تحديث في الخلفية (الكتالوج اتغيّر، حالة الطلب اتغيّرت، عرض خلص) بيتعمل
     من غير حركة الدخول ومن غير ما الصفحة ترجع لفوق. الحركة للتنقّل اللي العميل عمله بس */
  var QUIET = false;
  function shell(html, on, noNav) { clearTimers(); app.className = noNav ? '' : 'has-nav'; app.innerHTML = '<div class="page' + (QUIET ? ' still' : '') + '">' + html + '</div>' + navHTML(on, noNav); badge(); tickTimers(); installMaybe(); }
  // صفحات فيها خانات العميل بيكتب فيها: ماتترسمش من تاني من ورا ضهره (كان بيمسح اللي كتبه)
  function onForm() { return /^#\/(checkout|bill|repair|wish|trade)/.test(location.hash) || !!(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)); }
  function refresh() { if (!C || onForm() || document.querySelector('.sheet')) return; var y = window.scrollY; QUIET = true; try { render(); } finally { QUIET = false; } window.scrollTo({ top: y, behavior: 'instant' }); }
  function clearTimers() { clearTimeout(pollT); timers.forEach(clearTimeout); timers = []; }

  /* ---------- الكروت ---------- */
  function cardHTML(p, i) {
    var e = eff(p), q = avail(p), so = q <= 0;
    return '<div class="pc' + (so ? ' soldout' : '') + '" data-p="' + esc(p.id) + '" style="animation-delay:' + Math.min(i || 0, 12) * 30 + 'ms">'
      + (e.pct && !so ? '<span class="tag off">−' + e.pct + '%</span>' : so ? '<span class="tag low">خلص</span>' : q <= 2 ? '<span class="tag low">فاضل ' + q + '</span>' : '')
      + (p.st === 'new' ? '<span class="tag new">جديد متبرشم</span>' : p.st === 'used' ? '<span class="tag used">مستعمل</span>' : isFresh(p) ? '<span class="tag new">لسه واصل</span>' : p.sw ? '<span class="tag war">تبديل ' + esc(p.sw) + ' أيام</span>' : '')
      + '<div class="img">' + pic(p) + '</div><div class="nm">' + esc(p.n) + '</div>'
      + '<div class="pr">' + (p.ask ? '<span class="ask">💬 اسأل على السعر</span>' : so ? '<span class="out">هيتوفر قريب</span>' : '<strong class="num">' + fm(e.pr) + '</strong>' + (e.was ? '<s class="num">' + fm(e.was) + '</s>' : '')) + '</div>'
      + (!p.ask && !so && !(p.add && p.add.length) ? '<button class="add" data-add="' + esc(p.id) + '" aria-label="ضيف للسلة">+</button>' : '') + '</div>';
  }
  function isFresh(p) { return !!(p.fresh || p.new); }   // p.new = كاشير قديم (قبل 2.39)
  function gridHTML(list) { return list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : '<div class="empty"><div class="e">🔍</div><b>مفيش حاجة هنا</b><p>جرّب قسم تاني، أو قولّنا انت عايز إيه وهنجيبهولك.</p><button class="btn b1" data-go="#/wish">🤔 قولّنا عايز إيه</button></div>'; }
  var visible = function () { return (C.p || []).filter(function (p) { return !p.hide; }); };
  function sortList(list, how) {
    var l = list.slice();
    if (how === 'low') l.sort(function (a, b) { return (a.ask - b.ask) || eff(a).pr - eff(b).pr; });
    else if (how === 'high') l.sort(function (a, b) { return (a.ask - b.ask) || eff(b).pr - eff(a).pr; });
    else if (how === 'off') l = l.filter(function (p) { return eff(p).pct; }).sort(function (a, b) { return eff(b).pct - eff(a).pct; });
    return l.sort(function (a, b) { return (avail(a) <= 0) - (avail(b) <= 0); });
  }

  /* ---------- الصفحات ---------- */
  function home() {
    var cats = (C.cats || []).filter(function (c) { return visible().some(function (p) { return p.c === c.id; }); });
    var offs = sortList(visible(), 'off').filter(function (p) { return avail(p) > 0; });
    var deal = (C.deal && P[C.deal] && eff(P[C.deal]).pct ? P[C.deal] : null) || offs.filter(function (p) { return eff(p).end; })[0];
    var newOnes = visible().filter(function (p) { return isFresh(p) && avail(p) > 0; }).slice(0, 6);
    var s = C.svc || {}, opn = openNow();
    var html = '<header class="hd"><div class="r1"><div class="logo">' + logoHTML() + '</div><div class="nm"><b>' + esc(C.shop.name) + '</b><small><span class="dot' + (opn ? '' : ' off') + '"></span>' + (C.shop.area ? esc(C.shop.area) + ' · ' : '') + (opn ? 'مفتوح' + (hoursTxt() ? ' لحد ' + esc(hoursTxt().split('–')[1].trim()) : '') : 'مقفول دلوقتي') + '</small></div>'
      + '<div class="ic"><button data-go="#/orders" aria-label="طلباتي">📦</button><button data-go="#/cart" aria-label="السلة">🛒<i class="bdg" data-cart hidden></i></button></div></div>'
      + '<form class="srch" id="sf"><span>🔍</span><input id="sq" type="search" enterkeyhint="search" placeholder="دوّر على موبايل، جراب، اسكرينة..." autocomplete="off"></form></header>';
    if (!opn) html += '<div class="banner warn">🌙 المحل مقفول دلوقتي (' + esc(hoursTxt()) + '). اطلب عادي وطلبك هيتجهز أول ما نفتح.</div>';
    if (C.notice) html += '<div class="banner info">📣 ' + esc(C.notice) + '</div>';
    html += '<div class="chips">' + cats.map(function (c) { return '<button class="chip" data-go="#/c/' + esc(c.id) + '"><span style="--c1:' + esc(c.c1 || '#2f7cf6') + ';--c2:' + esc(c.c2 || '#5aa0ff') + '">' + esc(c.ic || '📦') + '</span>' + esc(c.n) + '</button>'; }).join('')
      + (offs.length ? '<button class="chip" data-go="#/c/_off"><span style="--c1:#d6455f;--c2:#f0753b">🔥</span>العروض</button>' : '')
      + '<button class="chip" data-go="#/svc"><span style="--c1:#e48b07;--c2:#ffc35c">🛠</span>الخدمات</button></div>';
    if (deal) { var e = eff(deal); html += '<button class="deal" data-p="' + esc(deal.id) + '"><div class="di">' + pic(deal) + '</div><div><small>⚡ ' + (C.dealT ? esc(C.dealT) : 'عرض لفترة محدودة') + '</small><b>' + esc(deal.n) + '</b><span class="pr">' + money(e.pr) + '</span>' + (e.was ? '<s class="num">' + fm(e.was) + '</s>' : '') + (e.end ? cdHTML(e.end) : '') + '</div></button>'; }
    if (offs.length) html += '<div class="sec"><b>🔥 عروض لفترة محدودة</b><button data-go="#/c/_off">الكل ←</button></div>' + gridHTML(offs.slice(0, 4));
    if (newOnes.length) html += '<div class="sec"><b>✨ لسه واصل</b></div>' + gridHTML(newOnes);
    cats.slice(0, 4).forEach(function (c) { var l = sortList(visible().filter(function (p) { return p.c === c.id; })).slice(0, 4); html += '<div class="sec"><b>' + esc(c.ic || '') + ' ' + esc(c.n) + '</b><button data-go="#/c/' + esc(c.id) + '">الكل ←</button></div>' + gridHTML(l); });
    html += svcCards(s);
    html += '<div class="box" style="text-align:center;background:color-mix(in srgb,#f59e0b 9%,var(--card));border-color:color-mix(in srgb,#f59e0b 35%,var(--line))"><b style="font-size:14px;font-weight:900">🤔 مش لاقي اللي عايزه؟</b><div style="color:var(--mut);font-size:12.5px;font-weight:600;margin:4px 0 10px">اكتبلنا وهنجيبهولك ونكلمك على واتساب</div><button class="btn b1" data-go="#/wish" style="width:100%">قولّنا عايز إيه</button></div>';
    html += footHTML();
    shell(html, '#/');
    document.getElementById('sf').onsubmit = function (ev) { ev.preventDefault(); var v = document.getElementById('sq').value.trim(); if (v) go('#/q/' + encodeURIComponent(v)); };
  }
  function svcCards(s) {
    var c = [];
    if (s.repair && s.repair.on !== false) c.push(['#/repair', '#e48b07', '🏠', 'صيانة من البيت', 'ناخده ونرجّعه لحد بابك']);
    if (s.bill && s.bill.on !== false) c.push(['#/bill', '#0d7340', '🧾', 'ادفع فاتورة', 'نت · كهربا · مية · شحن']);
    if (s.trade && s.trade.on !== false) c.push(['#/trade', '#7c4ddb', '🔁', 'بدّل موبايلك', 'قيّم القديم وخد الجديد']);
    if (s.repair && s.repair.on !== false) c.push(['#/repair?ask=1', '#1f5fae', '💬', 'استشارة فنية', 'اسأل الفني ببلاش']);
    return c.length ? '<div class="sec"><b>🛠 خدمات المحل</b></div><div class="svc">' + c.map(function (x) { return '<button data-go="' + x[0] + '"><span class="si" style="--c:' + x[1] + '">' + x[2] + '</span><span><b>' + x[3] + '</b><small>' + x[4] + '</small></span></button>'; }).join('') + '</div>' : '';
  }
  // السجل التجاري والبطاقة الضريبية (لو المحل كتبهم في الإعدادات)
  function legalTxt() { var s = C.shop || {}; var a = []; if (s.cr) a.push('سجل تجاري <span class="num">' + esc(s.cr) + '</span>'); if (s.tax) a.push('بطاقة ضريبية <span class="num">' + esc(s.tax) + '</span>'); return a.length ? '<span class="legal">' + a.join(' · ') + '</span><br>' : ''; }
  function footHTML() {
    var s = C.shop;
    return '<div class="foot">' + (s.addr ? '📍 ' + esc(s.addr) + '<br>' : '') + (s.phone ? '📞 <a href="tel:' + esc(s.phone) + '" class="num">' + esc(s.phone) + '</a>' + (hoursTxt() ? ' · 🕘 ' + esc(hoursTxt()) : '') + '<br>' : '')
      + legalTxt() + '<a href="#/info">الشروط والاسترجاع والضمان</a><br><span class="made">متجر بيشتغل بـ Repair Desk</span></div>';
  }
  function cats() {
    var list = (C.cats || []).filter(function (c) { return visible().some(function (p) { return p.c === c.id; }); });
    shell(barHTML('🗂 الأقسام') + '<div class="svc" style="padding-top:12px">' + list.map(function (c) { var n = visible().filter(function (p) { return p.c === c.id; }).length; return '<button data-go="#/c/' + esc(c.id) + '"><span class="si" style="--c:linear-gradient(135deg,' + esc(c.c1 || '#2f7cf6') + ',' + esc(c.c2 || '#5aa0ff') + ')">' + esc(c.ic || '📦') + '</span><span><b>' + esc(c.n) + '</b><small class="num">' + n + ' منتج</small></span></button>'; }).join('') + '</div>', '#/cats');
  }
  function catPage(id, q) {
    var st = catPage.st[id] = catPage.st[id] || { s: '', b: '', m: '', sort: '' };
    var c = id === '_off' ? { id: '_off', n: 'العروض', ic: '🔥' } : catOf(id);
    var base = id === '_off' ? sortList(visible(), 'off') : id === '_q' ? search(q) : visible().filter(function (p) { return p.c === id; });
    if (!c && id !== '_q') return go('#/');
    var subs = uniq(base.map(function (p) { return p.s; }).filter(Boolean));
    if (st.s && subs.indexOf(st.s) < 0) st.s = '';
    var inS = base.filter(function (p) { return !st.s || p.s === st.s; });
    var brands = uniq(inS.map(function (p) { return p.b; }).filter(Boolean));
    var inB = inS.filter(function (p) { return !st.b || p.b === st.b; });
    var models = c && c.models ? uniq([].concat.apply([], inB.map(function (p) { return p.m || []; }))) : [];
    var list = sortList(inB.filter(function (p) { return !st.m || (p.m || []).indexOf(st.m) >= 0; }), st.sort === 'off' ? '' : st.sort);
    var html = barHTML(id === '_q' ? '🔍 ' + esc(q) : esc(c.ic || '') + ' ' + esc(c.n), '<span class="num">' + list.length + '</span> منتج');
    if (subs.length > 1) html += '<div class="subs">' + ['<button data-s="" class="' + (!st.s ? 'on' : '') + '">الكل</button>'].concat(subs.map(function (x) { return '<button data-s="' + esc(x) + '" class="' + (st.s === x ? 'on' : '') + '">' + esc(x) + ' <i>' + base.filter(function (p) { return p.s === x; }).length + '</i></button>'; })).join('') + '</div>';
    if (brands.length > 1) html += '<div class="brands">' + ['<button data-b="" class="' + (!st.b ? 'on' : '') + '">الكل</button>'].concat(brands.map(function (b) { return '<button data-b="' + esc(b) + '" class="' + (st.b === b ? 'on' : '') + '">' + esc(b) + '</button>'; })).join('') + '</div>';
    if (models.length) html += '<div class="models">' + ['<button data-m="" class="' + (!st.m ? 'on' : '') + '">كل الموديلات</button>'].concat(models.map(function (m) { return '<button data-m="' + esc(m) + '" class="' + (st.m === m ? 'on' : '') + '">' + esc(m) + '</button>'; })).join('') + '</div>';
    html += '<div class="sec"><b>' + (st.m ? esc(st.s || c.n) + ' ' + esc(st.m) : st.b ? esc(st.b) : st.s ? esc(st.s) : 'كل المنتجات') + '</b><button data-sort>' + ({ low: 'الأرخص ↓', high: 'الأغلى ↑' }[st.sort] || 'الترتيب ⇅') + '</button></div>' + gridHTML(list);
    shell(html, '#/cats');
    app.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { st.s = b.dataset.s; st.b = ''; st.m = ''; catPage(id, q); }; });
    app.querySelectorAll('[data-b]').forEach(function (b) { b.onclick = function () { st.b = b.dataset.b; st.m = ''; catPage(id, q); }; });
    app.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { st.m = b.dataset.m; catPage(id, q); }; });
    var so = app.querySelector('[data-sort]'); if (so) so.onclick = function () { st.sort = st.sort === '' ? 'low' : st.sort === 'low' ? 'high' : ''; catPage(id, q); };
    var on = app.querySelector('.models .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  catPage.st = {};
  function uniq(a) { var s = {}; return a.filter(function (x) { return s[x] ? false : (s[x] = 1); }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim(); }
  function search(q) { var w = norm(q).split(' ').filter(Boolean); return visible().filter(function (p) { var t = norm([p.n, p.b, p.s, (p.m || []).join(' '), (catOf(p.c) || {}).n, p.d].join(' ')); return w.every(function (x) { return t.indexOf(x) >= 0; }); }); }

  function product(id) {
    var p = P[id]; if (!p) return go('#/');
    var e = eff(p), q = avail(p), so = q <= 0, sel = [], n = 1;
    var imgs = (p.img || []).length ? p.img : [''];
    var spec = p.spec || {};
    var specs = [spec.storage && ['💾', spec.storage], spec.ram && ['⚡', spec.ram + ' رام'], spec.batt && ['🔋', 'بطارية ' + spec.batt + '%'], spec.cond && ['✨', spec.cond], p.st === 'new' && ['📦', 'جديد متبرشم'], p.st === 'used' && !spec.cond && ['♻️', 'مستعمل']].filter(Boolean);
    var html = '<div class="gal"><div class="track">' + imgs.map(function (x) { return '<div>' + (x ? '<img src="' + esc(img(x)) + '" alt="">' : esc(iconOf(p))) + '</div>'; }).join('') + '</div>'
      + (imgs.length > 1 ? '<div class="dots">' + imgs.map(function (x, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div>' : '')
      + '<div class="fl"><button data-back aria-label="رجوع">→</button><button data-share aria-label="شارك">↗</button></div></div>'
      + '<div class="pb"><h1>' + esc(p.n) + '</h1><div class="sub">' + esc([p.b, (catOf(p.c) || {}).n, (p.m || []).slice(0, 3).join('، ')].filter(Boolean).join(' · ')) + '</div>'
      + (p.ask ? '<span class="ask" style="font-size:14px;padding:6px 14px">💬 اسأل على السعر</span>' : '<div class="bigpr"><strong>' + money(e.pr) + '</strong>' + (e.was ? '<s class="num">' + fm(e.was) + '</s><span class="save">وفّر <span class="num">' + fm(e.was - e.pr) + '</span></span>' : '') + '</div>')
      + (e.end && !p.ask ? '<div class="timer"><span>⏳ العرض بيخلص بعد</span><span data-end="' + esc(e.end) + '"></span></div>' : '')
      + (so ? '<div class="timer" style="background:var(--badbg);color:var(--badc)"><span>😕 خلص من المحل</span><span>بلّغني لما يرجع ↓</span></div>' : q <= 3 ? '<div class="timer"><span>🔥 فاضل <span class="num">' + q + '</span> بس</span></div>' : '')
      + (specs.length ? '<div class="feat">' + specs.map(function (s) { return '<span><em>' + s[0] + '</em>' + esc(s[1]) + '</span>'; }).join('') + '</div>' : '')
      + '<div class="feat">' + (p.w ? '<span><em>🛡</em>ضمان ' + esc(p.w) + '</span>' : '') + (p.sw ? '<span><em>🔁</em>تبديل ' + esc(p.sw) + ' أيام</span>' : '') + '<span><em>🚚</em>' + (delFreeTxt() || 'توصيل لحد البيت') + '</span>' + (C.del && C.del.pickup !== false ? '<span><em>🏪</em>أو استلم من المحل</span>' : '') + '</div>'
      + (p.d ? '<div class="desc">' + esc(p.d) + '</div>' : '')
      + (!p.ask && !so && (p.add || []).length ? '<div class="addon"><b>➕ ضيف معاه</b>' + p.add.map(function (a, i) { return '<label><span><input type="checkbox" data-ai="' + i + '"><i class="ck">✓</i>' + esc(a.n) + '</span><span class="num">+ ' + fm(a.p) + '</span></label>'; }).join('') + '</div>' : '')
      + (!p.ask && !so ? '<div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0"><b style="font-weight:900">الكمية</b><span class="qty"><button data-q="-1">−</button><b class="num" id="pq">1</b><button data-q="1">+</button></span></div>' : '')
      + '</div>';
    var waTxt = 'السلام عليكم، عايز أسأل على: ' + p.n + ' — ' + location.href;
    html += '<div class="cta">' + (waLink() ? '<a class="btn bw" href="' + esc(waLink(waTxt)) + '" target="_blank" rel="noopener" aria-label="اسأل على واتساب">' + WA_SVG.replace('<svg', '<svg style="width:22px;height:22px"') + '</a>' : '')
      + (p.ask ? '<a class="btn b1" href="' + esc(waLink(waTxt)) + '" target="_blank" rel="noopener">💬 اسأل على السعر</a>' : so ? '<button class="btn b1" id="notify">🔔 بلّغني لما يتوفر</button>' : '<button class="btn b1" id="buy">🛒 ضيف للسلة · <span id="ptot" class="num"></span></button>') + '</div>';
    shell(html, '', true);
    var upd = function () { var t = n * (e.pr + sel.reduce(function (a, i) { return a + (+p.add[i].p || 0); }, 0)); var el = document.getElementById('ptot'); if (el) el.textContent = fm(t); };
    upd();
    app.querySelectorAll('[data-ai]').forEach(function (c) { c.onchange = function () { var i = +c.dataset.ai; sel = c.checked ? sel.concat(i) : sel.filter(function (x) { return x !== i; }); upd(); }; });
    app.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { n = Math.max(1, Math.min(Math.min(20, q), n + +b.dataset.q)); document.getElementById('pq').textContent = n; upd(); }; });
    var buy = document.getElementById('buy'); if (buy) buy.onclick = function () { addToCart(p.id, n, sel); };
    var nt = document.getElementById('notify'); if (nt) nt.onclick = function () { go('#/wish?p=' + encodeURIComponent(p.id)); };
    var tr = app.querySelector('.gal .track'), dots = app.querySelectorAll('.gal .dots i');
    if (tr && dots.length) tr.onscroll = function () { var i = Math.round(Math.abs(tr.scrollLeft) / tr.clientWidth); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); };
    app.querySelector('[data-share]').onclick = function () { var u = location.href; if (navigator.share) navigator.share({ title: p.n, text: p.n + ' — ' + C.shop.name, url: u }).catch(function () {}); else { copy(u); toast('اتنسخ اللينك', 'ok'); } };
  }
  function delFreeTxt() { var d = C.del || {}, z = (d.zones || [])[0]; if (z && !(+z.fee)) return 'توصيل ببلاش لحد ' + z.km + ' كم'; if (+d.freeOver) return 'ببلاش فوق ' + fm(d.freeOver); return ''; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } }

  function cartPage() {
    var c = cart();
    if (!c.length) return shell(barHTML('🛒 السلة') + '<div class="empty"><div class="e">🛒</div><b>السلة فاضية</b><p>شوف العروض والمنتجات وضيف اللي يعجبك.</p><button class="btn b1" data-go="#/">تسوّق دلوقتي</button></div>', '#/cart');
    var sub = c.reduce(function (a, x) { return a + lineTotal(x); }, 0);
    // .main / .side: على الكمبيوتر المنتجات يمين والحساب وزرار الطلب شمال (خالد 2026-11-13). على الموبايل display: contents (زي ما هي)
    var html = barHTML('🛒 السلة', '<span class="num">' + cartCount() + '</span> قطعة') + '<div class="main"><div class="box">' + c.map(function (x) {
      var p = P[x.id], adds = (x.add || []).map(function (i) { return (p.add || [])[i]; }).filter(Boolean);
      return '<div class="ci"><div class="im" data-p="' + esc(p.id) + '">' + pic(p) + '</div><div class="t"><b>' + esc(p.n) + '</b>' + (adds.length ? '<small>+ ' + esc(adds.map(function (a) { return a.n; }).join('، ')) + '</small>' : '') + '<strong>' + money(lineTotal(x)) + '</strong></div><span class="qty"><button data-k="' + esc(x.k) + '" data-d="-1">' + (x.q === 1 ? '🗑' : '−') + '</button><b class="num">' + x.q + '</b><button data-k="' + esc(x.k) + '" data-d="1">+</button></span></div>';
    }).join('') + '</div>';
    var d = C.del || {}; if (+d.freeOver && sub < +d.freeOver) html += '<div class="banner info">🚚 ضيف بـ ' + money(d.freeOver - sub) + ' كمان والتوصيل يبقى ببلاش</div>';
    html += '</div><div class="side"><div class="box sum"><div><span>المجموع</span><span>' + money(sub) + '</span></div><div><span>التوصيل</span><span>بيتحسب في الخطوة الجاية</span></div></div>';
    html += '<div class="cta"><button class="btn b1" data-go="#/checkout">كمّل الطلب · <span class="num">' + fm(sub) + '</span></button></div></div>';
    shell(html, '#/cart', true);
    app.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { var cc = cart(), x = cc.filter(function (y) { return y.k === b.dataset.k; })[0]; if (!x) return; var nq = x.q + +b.dataset.d; if (nq > 0 && nq + cc.filter(function (y) { return y.id === x.id && y !== x; }).reduce(function (a, y) { return a + y.q; }, 0) > avail(P[x.id])) return toast('المتاح ' + avail(P[x.id]) + ' بس', 'bad'); if (nq <= 0) cc.splice(cc.indexOf(x), 1); else x.q = nq; setCart(cc); cartPage(); }; });
  }

  /* ---------- إتمام الطلب (منتجات / فاتورة / صيانة / مش لاقي / بدّل) ---------- */
  function me() { return ls('me') || {}; }
  function custBox(o) {
    var m = me(); o = o || {};
    return '<div class="box"><h4>👤 بياناتك <small>مش محتاج حساب</small></h4>'
      + '<label class="f"><span>الاسم</span><input class="in" id="cn" autocomplete="name" value="' + esc(m.name || '') + '" placeholder="اسمك"></label>'
      + '<label class="f"><span>رقم التليفون (واتساب)</span><input class="in num" id="cp" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" value="' + esc(m.phone || '') + '" placeholder="01xxxxxxxxx"></label>'
      + (o.noAddr ? '' : '<div id="addrw"><label class="f"><span>العنوان بالتفصيل</span><input class="in" id="ca" autocomplete="street-address" value="' + esc(m.addr || '') + '" placeholder="الشارع، رقم العمارة، الدور، الشقة، علامة مميزة"></label></div>')
      + '</div>';
  }
  function locBox() { return '<div class="box" id="locw"><h4>📍 مكانك بالظبط <small>علشان المندوب يوصلك</small></h4><div id="map"><div class="mapnote" id="mapn">دوس "حدد مكاني"</div></div><div class="locb"><button type="button" id="geo">📡 حدد مكاني</button><button type="button" id="pinhelp">✋ حرّك الدبوس للمكان الصح</button></div><div class="err" id="locerr" hidden></div></div>'; }
  var LL = null;
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (LL) return LL;
    LL = new Promise(function (res, rej) {
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      var s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = function () { res(window.L); }; s.onerror = rej; document.head.appendChild(s);
    });
    return LL;
  }
  function haversine(a1, o1, a2, o2) { var R = 6371, r = function (d) { return d * Math.PI / 180; }, x = Math.pow(Math.sin(r(a2 - a1) / 2), 2) + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.pow(Math.sin(r(o2 - o1) / 2), 2); return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); }
  // نفس حساب السيرفر (للعرض بس، السيرفر بيحسب تاني)
  function delQuote(sub, loc, pickup) {
    var d = C.del || {}; if (pickup) return { fee: 0 };
    var zones = (d.zones || []).filter(function (z) { return +z.km > 0; }).sort(function (a, b) { return a.km - b.km; });
    var km = null, fee = zones.length ? +zones[0].fee : +d.fee || 0;
    if (d.center && zones.length) { if (!loc) return { need: true }; km = Math.round(haversine(+d.center.lat, +d.center.lng, loc.lat, loc.lng) * 100) / 100; var z = zones.filter(function (x) { return km <= x.km; })[0]; if (!z) return { out: true, km: km }; fee = +z.fee; }
    if (+d.freeOver > 0 && sub >= +d.freeOver) fee = 0;
    return { fee: fee, km: km };
  }
  function mapInit(onLoc) {
    var m = me(), d = C.del || {}, start = m.lat ? { lat: m.lat, lng: m.lng } : d.center ? { lat: +d.center.lat, lng: +d.center.lng } : { lat: 30.0444, lng: 31.2357 };
    var loc = m.lat ? { lat: m.lat, lng: m.lng } : null, mk = null, map = null;
    var set = function (ll, fit) { loc = { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) }; if (mk) mk.setLatLng(ll); if (map && fit) map.setView(ll, 16); onLoc(loc); };
    leaflet().then(function (L) {
      var el = document.getElementById('map'); if (!el) return;
      map = L.map(el, { zoomControl: false, attributionControl: true }).setView(start, loc ? 16 : 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      if (d.center) { L.circleMarker([+d.center.lat, +d.center.lng], { radius: 7, color: '#0a1a44', fillColor: '#2b7be0', fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip('🏪 المحل'); (d.zones || []).slice(0, 3).forEach(function (z, i) { L.circle([+d.center.lat, +d.center.lng], { radius: z.km * 1000, color: ['#17904f', '#f59e0b', '#d6455f'][i], weight: 1.5, dashArray: '6 6', fillOpacity: .04 }).addTo(map); }); }
      var icon = L.divIcon({ className: '', html: '<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 4px 4px #0005)">📍</div>', iconSize: [0, 0] });
      mk = L.marker(loc || start, { draggable: true, icon: icon }).addTo(map);
      mk.on('dragend', function () { set(mk.getLatLng()); });
      map.on('click', function (ev) { set(ev.latlng); });
      if (loc) onLoc(loc);
    }).catch(function () { var n = document.getElementById('mapn'); if (n) n.textContent = 'الخريطة مش راضية تحمّل — دوس "حدد مكاني"'; });
    document.getElementById('geo').onclick = function () {
      var b = this; if (!navigator.geolocation) return toast('الموبايل مش بيدعم تحديد المكان', 'bad');
      b.textContent = '⏳ بنحدد...';
      navigator.geolocation.getCurrentPosition(function (pos) { b.textContent = '📡 حدد مكاني'; set({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true); toast('✓ اتحدد مكانك. حرّك الدبوس لو مش مظبوط', 'ok'); },
        function (er) { b.textContent = '📡 حدد مكاني'; toast(er && er.code === 1 ? 'اسمح للمتصفح يعرف مكانك، أو حرّك الدبوس بإيدك' : 'مقدرناش نحدد مكانك. حرّك الدبوس بإيدك', 'bad'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    };
    document.getElementById('pinhelp').onclick = function () { toast('اسحب الدبوس 📍 أو دوس على المكان في الخريطة'); };
    return function () { return loc; };
  }
  function readCust(needAddr) {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var c = { name: g('cn'), phone: g('cp'), addr: g('ca') }, bad = '';
    ['cn', 'cp', 'ca'].forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.remove('bad'); });
    if (c.name.length < 2) bad = 'cn'; else if (!/^(\+?20|0)?1[0125]\d{8}$|^0[2-9]\d{7,8}$/.test(c.phone.replace(/[\s-]/g, '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }))) bad = 'cp'; else if (needAddr && c.addr.length < 5) bad = 'ca';
    if (bad) { var e = document.getElementById(bad); e.classList.add('bad'); e.focus(); toast(bad === 'cn' ? 'اكتب اسمك' : bad === 'cp' ? 'رقم التليفون مش مظبوط' : 'اكتب العنوان بالتفصيل', 'bad'); return null; }
    var m = me(); m.name = c.name; m.phone = c.phone; if (c.addr) m.addr = c.addr; ls('me', m);
    return c;
  }
  function payBox(opts) {
    var p = C.pay || {}, h = '<div class="box pay"><h4>💳 هتدفع إزاي</h4>', first = true;
    var row = function (v, ic, t, sm, dis) { var r = '<input type="radio" name="pay" id="pay-' + v + '" value="' + v + '"' + (first && !dis ? ' checked' : '') + (dis ? ' disabled' : '') + '><label for="pay-' + v + '"' + (dis ? ' class="dis"' : '') + '><span class="rad"></span><em>' + ic + '</em>' + t + (sm ? '<small>' + sm + '</small>' : '') + '</label>'; if (!dis) first = false; return r; };
    if (p.cash !== false) h += row('cash', '💵', opts && opts.billCash ? 'كاش' : 'كاش عند الاستلام', opts && opts.cashSub);
    if (p.insta && p.insta.on) h += row('insta', '⚡', 'انستا باي', 'حوّل وإحنا نأكد');
    if (p.voda && p.voda.on) h += row('voda', '📱', 'فودافون كاش', 'حوّل وإحنا نأكد');   // خالد 2026-11-13: مع انستا في أي دفع
    if (!(opts && opts.noCard)) h += row('card', '💳', 'فيزا / ميزة أونلاين', p.card && p.card.on ? 'دفع آمن' : 'قريبًا', !(p.card && p.card.on));
    return h + '</div>';
  }
  function payVal() { var r = app.querySelector('input[name=pay]:checked'); return r ? r.value : 'cash'; }
  function submitOrder(body, btn) {
    btn.disabled = true; var old = btn.innerHTML; btn.innerHTML = '⏳ بنبعت الطلب...';
    return gw(Object.assign({ action: 'store-order', slug: slug }, body)).then(function (r) {
      btn.disabled = false; btn.innerHTML = old;
      if (!r.ok) {
        toast(r.error || 'الطلب ماتبعتش، جرّب تاني', 'bad');
        var f = { addr: 'ca', loc: 'locw', coupon: 'cpn', dev: 'rd', acct: 'ba', text: 'wt' }[r.field]; var el = f && document.getElementById(f); if (el) { if (el.classList.contains('in')) { el.classList.add('bad'); el.focus(); } else el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (r.stale) loadCat(true);
        return null;
      }
      var list = ls('orders') || []; list.unshift({ trk: r.trk, no: r.no, at: Date.now(), kind: body.kind, total: r.totals && r.totals.total }); ls('orders', list.slice(0, 40));
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
      if (body.pay === 'card') { return gw({ action: 'store-pay', trk: r.trk, back: location.href.split('#')[0] + '#/o/' + r.trk }).then(function (pr) { if (pr.url) location.href = pr.url; else { toast(pr.error || 'الدفع مش متاح دلوقتي', 'bad'); go('#/o/' + r.trk + '?new=1'); } return r; }); }
      go('#/o/' + r.trk + '?new=1'); return r;
    });
  }
  function checkout() {
    var c = cart(); if (!c.length) return go('#/cart');
    var sub = c.reduce(function (a, x) { return a + lineTotal(x); }, 0), d = C.del || {}, canPick = d.pickup !== false, pickup = !!(me().pickup && canPick), loc = null, getLoc = null;
    var html = barHTML('إتمام الطلب') + '<div class="main"><div class="box"><div class="seg" id="mode"><button type="button" data-m="del" class="' + (pickup ? '' : 'on') + '">🚚 توصيل</button>' + (canPick ? '<button type="button" data-m="pick" class="' + (pickup ? 'on' : '') + '">🏪 هستلم من المحل</button>' : '') + '</div>'
      + '<div class="hint" id="modeh"></div></div>' + custBox() + locBox()
      + '<div class="box"><label class="f" style="margin:0"><span>ملاحظات للمحل (اختياري)</span><input class="in" id="cnote" placeholder="مثلًا: كلّمني قبل ما توصل"></label></div>'
      + payBox() + '<div class="box"><h4>🏷 كوبون خصم <small>اختياري</small></h4><input class="in" id="cpn" placeholder="اكتب الكود" style="text-transform:uppercase"></div>'
      + '</div><div class="side"><div class="box sum" id="sum"></div><div class="cta flow"><button class="btn bg" id="go">✓ أكّد الطلب</button></div></div>';
    shell(html, '', true);
    var paint = function () {
      document.getElementById('addrw').hidden = pickup; document.getElementById('locw').hidden = pickup;
      var q = delQuote(sub, loc, pickup), n = document.getElementById('mapn');
      document.getElementById('modeh').innerHTML = pickup ? '🏪 هتستلم من المحل' + (C.shop.addr ? ': ' + esc(C.shop.addr) : '') + (hoursTxt() ? ' — من ' + esc(hoursTxt()) : '') + '. هنبعتلك أول ما يجهز.' : '🚚 ' + (delFreeTxt() || 'التوصيل حسب المسافة') + (C.del && C.del.eta ? ' · ' + esc(C.del.eta) : '');
      if (n) { n.className = 'mapnote ' + (q.out ? 'bad' : q.km != null ? 'ok' : ''); n.textContent = q.out ? '😕 برّه منطقة التوصيل (' + q.km + ' كم)' : q.km != null ? q.km + ' كم · ' + (q.fee ? 'التوصيل ' + fm(q.fee) : 'التوصيل ببلاش 🎉') : 'دوس "حدد مكاني"'; }
      document.getElementById('sum').innerHTML = '<div><span>المنتجات (' + cartCount() + ')</span><span>' + money(sub) + '</span></div><div><span>التوصيل</span><span class="' + (q.fee === 0 ? 'free' : '') + '">' + (pickup ? 'استلام من المحل' : q.need ? 'حدد مكانك الأول' : q.out ? '—' : q.fee ? money(q.fee) : 'ببلاش 🎉') + '</span></div>' + '<div class="tot"><span>الإجمالي</span><span>' + money(sub + (q.fee || 0)) + '</span></div><div style="font-size:11.5px">الخصم (لو فيه كوبون) بيتحسب لما تأكد.</div>';
    };
    getLoc = mapInit(function (l) { loc = l; var m = me(); m.lat = l.lat; m.lng = l.lng; ls('me', m); paint(); });
    app.querySelectorAll('#mode [data-m]').forEach(function (b) { b.onclick = function () { pickup = b.dataset.m === 'pick'; var m = me(); m.pickup = pickup; ls('me', m); app.querySelectorAll('#mode [data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); paint(); }; });
    paint();
    document.getElementById('go').onclick = function () {
      var cu = readCust(!pickup); if (!cu) return;
      var q = delQuote(sub, loc, pickup);
      if (!pickup && q.need) { document.getElementById('locw').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('حدد مكانك على الخريطة علشان المندوب', 'bad'); }
      if (!pickup && q.out) return toast('مكانك برّه منطقة التوصيل. ممكن تستلم من المحل.', 'bad');
      submitOrder({ kind: 'order', pay: payVal(), coupon: document.getElementById('cpn').value.trim(), items: c.map(function (x) { return { id: x.id, q: x.q, add: x.add }; }),
        cust: { name: cu.name, phone: cu.phone, addr: cu.addr, lat: loc && loc.lat, lng: loc && loc.lng, pickup: pickup, notes: document.getElementById('cnote').value.trim() } }, this).then(function (r) { if (r) setCart([]); });
    };
  }
  /* ادفع فاتورة (خالد 2026-11-09: "لو اخترت أي واحدة البيانات اللي تحت مش بتتغيّر"): كل خدمة بخانتها وشركاتها.
     شحن الرصيد: يكتب اللي هيدفعه أو الصافي اللي عايزه والتاني بيتحسب. الباقة: من جدول المحل (السعر تقريبي) أو يكتبها. كود السداد: المحل بيقول المبلغ.
     الدفع بفودافون كاش أو انستا بس (مفيش دفع في المحل). الكتالوج القديم (كاشير لسه مااتحدّثش) بيفضل زي الأول */
  function billPage() {
    var s = (C.svc || {}).bill; if (!s || s.on === false) return go('#/svc');
    var items = s.items || [], f = s.fee || {}, P0 = C.pay || {}, newCat = P0.voda !== undefined, pct = Math.max(30, Math.min(100, +s.topPct || 70));
    var canPay = !newCat || (P0.voda && P0.voda.on) || (P0.insta && P0.insta.on);
    var sel = items[0] || {}, co = '', pack = '';
    var payH = '<div class="box pay"><h4>💳 هتدفع إزاي</h4>';
    if (newCat) {
      var first = true, prow = function (v, ic, t, sm, dis) { var r = '<input type="radio" name="pay" id="pay-' + v + '" value="' + v + '"' + (first && !dis ? ' checked' : '') + (dis ? ' disabled' : '') + '><label for="pay-' + v + '"' + (dis ? ' class="dis"' : '') + '><span class="rad"></span><em>' + ic + '</em>' + t + (sm ? '<small>' + sm + '</small>' : '') + '</label>'; if (!dis) first = false; return r; };
      if (P0.voda && P0.voda.on) payH += prow('voda', '📱', 'فودافون كاش', 'حوّل وإحنا نأكد');
      if (P0.insta && P0.insta.on) payH += prow('insta', '⚡', 'انستا باي', 'حوّل وإحنا نأكد');
      payH += prow('card', '💳', 'فيزا / ميزة', 'قريبًا', true) + '<div class="hint" style="margin-top:4px">مش هتدفع دلوقتي: هنبعتلك المبلغ الأول، وبعد ما توافق تحوّل.</div></div>';
    }
    var html = barHTML('🧾 ادفع فاتورة')
      + (canPay ? '' : '<div class="banner warn">⚠ المحل لسه ماحددش طريقة دفع الفواتير. كلّمنا على واتساب.</div>')
      + '<div class="box"><h4>اختار الخدمة</h4><div class="opts" id="bs">' + items.map(function (x) { return '<button type="button" class="opt' + (x.id === sel.id ? ' on' : '') + '" data-s="' + esc(x.id) + '"><em>' + esc(x.ic || '🧾') + '</em>' + esc(x.n) + '</button>'; }).join('') + '</div></div>'
      + '<div class="box" id="bf"></div>' + custBox({ noAddr: true }) + (newCat ? payH : payBox({ noCard: true, billCash: true, cashSub: 'في المحل' }))
      + '<div class="cta flow"><button class="btn b1" id="go"' + (canPay ? '' : ' disabled') + '>ابعت الطلب</button></div>';
    shell(html, '#/svc', true);
    var $ = function (id) { return document.getElementById(id); };
    var num = function (id) { var e = $(id); return e ? +String(e.value).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[^\d.]/g, '') || 0 : 0; };
    var feeOf = function (a) { return sel.nofee || !a ? 0 : a <= (+f.upto || 0) || !(+f.pct) ? +f.fix || 0 : Math.max(+f.fix || 0, Math.round(a * f.pct) / 100); };
    var feeTxt = function () { return sel.nofee ? '' : '<br>عمولة المحل: ' + (f.upto ? '<b class="num">' + fm(f.fix || 0) + '</b> ج لحد ' + fm(f.upto) + (f.pct ? '، وبعدها ' + f.pct + '%' : '') : '<b class="num">' + fm(f.fix || 0) + '</b> ج') + '.'; };
    var hint = function () {
      var h = $('bh'); if (!h) return; var k = sel.k || 'bill', a = num('bm'), t = '';
      if (k === 'top') t = a ? 'هتدفع <b class="num">' + fm(a + feeOf(a)) + '</b> ج، وهيوصلك رصيد صافي حوالي <b class="num">' + fm(Math.round(a * pct) / 100) + '</b> ج.' : 'اكتب اللي هتدفعه أو الصافي اللي عايزه، والتاني بيتحسب لوحده.';
      else if (k === 'pack') { var pk = (sel.packs || []).filter(function (p) { return p.n === pack; })[0]; t = pk && pk.p ? 'السعر تقريبًا <b class="num">' + fm(pk.p + feeOf(pk.p)) + '</b> ج' + (feeOf(pk.p) ? ' (' + fm(pk.p) + ' + عمولة ' + fm(feeOf(pk.p)) + ')' : '') + '. هنأكده ونبعتلك قبل ما تدفع.' : 'هنستعلم عن السعر ونبعتلك المبلغ بالظبط قبل ما تدفع.' + feeTxt(); }
      else if (k === 'code') t = 'هنستعلم بالكود ونبعتلك المبلغ، وبعد ما توافق تحوّل وندفع ونبعتلك الإيصال.' + feeTxt();
      else t = (a ? 'المطلوب تقريبًا <b class="num">' + fm(a + feeOf(a)) + '</b> ج (' + fm(a) + (feeOf(a) ? ' + عمولة ' + fm(feeOf(a)) : '') + '). ' : '') + 'هنستعلم ونبعتلك المبلغ بالظبط قبل ما تدفع.' + (a ? '' : feeTxt());
      h.innerHTML = 'ℹ️ ' + t + (sel.note ? '<br>' + esc(sel.note) : '');
    };
    var paintSvc = function () {
      var k = sel.k || 'bill', cos = sel.cos || [], packs = sel.packs || [], numF = sel.ft !== 'text', h = '';
      co = cos.length === 1 ? cos[0] : ''; pack = '';
      if (cos.length) h += '<div class="f" id="bcow"><span>الشركة</span><div class="pills" id="bco">' + cos.map(function (c) { return '<button type="button" class="' + (c === co ? 'on' : '') + '" data-co="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>';
      h += '<label class="f"><span id="bl">' + esc(sel.fl || 'رقم الخط أو العداد') + '</span><input class="in' + (numF ? ' num' : '') + '" id="ba"' + (numF ? ' inputmode="numeric" dir="ltr" style="text-align:right"' : '') + ' maxlength="40" placeholder="' + esc(sel.fl || '') + '"></label>';
      if (k === 'top') h += '<div class="two"><label class="f"><span>هتدفع كام</span><input class="in num" id="bm" inputmode="decimal" dir="ltr" style="text-align:right" placeholder="10"></label><label class="f"><span>أو عايز رصيد صافي</span><input class="in num" id="bn" inputmode="decimal" dir="ltr" style="text-align:right" placeholder="7"></label></div>';
      else if (k === 'pack') h += (packs.length ? '<div class="f"><span>الباقة</span><div class="packs" id="bpk">' + packs.map(function (p) { return '<button type="button" data-pk="' + esc(p.n) + '"><b>' + esc(p.n) + '</b><small>' + (p.p ? '<span class="num">' + fm(p.p) + '</span> ج تقريبًا' : 'هنستعلم') + '</small></button>'; }).join('') + '<button type="button" data-pk=""><b>باقة تانية</b><small>اكتبها</small></button></div></div>' : '')
        + '<label class="f" id="bptw"' + (packs.length ? ' hidden' : '') + '><span>نظام الباقة (لو عارفه)</span><input class="in" id="bpt" maxlength="60" placeholder="مثلًا: فليكس 70"></label>';
      else if (k === 'bill') h += '<label class="f"><span>المبلغ (لو عارفه)</span><input class="in num" id="bm" inputmode="decimal" dir="ltr" style="text-align:right" placeholder="هنستعلم ونبعتلك المبلغ"></label>';
      h += '<label class="f"><span>ملاحظة (اختياري)</span><input class="in" id="bnote" maxlength="120" placeholder="أي حاجة تحب المحل يعرفها"></label><div class="hint" id="bh"></div>';
      $('bf').innerHTML = h;
      app.querySelectorAll('#bco [data-co]').forEach(function (b) { b.onclick = function () { co = b.dataset.co; app.querySelectorAll('#bco [data-co]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      app.querySelectorAll('#bpk [data-pk]').forEach(function (b) { b.onclick = function () { pack = b.dataset.pk; app.querySelectorAll('#bpk [data-pk]').forEach(function (x) { x.classList.toggle('on', x === b); }); $('bptw').hidden = !!pack; if (!pack) $('bpt').focus(); hint(); }; });
      if ($('bm')) $('bm').oninput = function () { if ($('bn')) $('bn').value = num('bm') ? fm(Math.round(num('bm') * pct) / 100) : ''; hint(); };
      if ($('bn')) $('bn').oninput = function () { $('bm').value = num('bn') ? Math.ceil(num('bn') * 100 / pct) : ''; hint(); };
      hint();
    };
    paintSvc();
    app.querySelectorAll('#bs [data-s]').forEach(function (b) { b.onclick = function () { sel = items.filter(function (x) { return x.id === b.dataset.s; })[0] || sel; app.querySelectorAll('#bs [data-s]').forEach(function (x) { x.classList.toggle('on', x === b); }); paintSvc(); }; });
    $('go').onclick = function () {
      var k = sel.k || 'bill', acct = $('ba').value.trim();
      if ((sel.cos || []).length && !co) { $('bcow').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('اختار الشركة', 'bad'); }
      if (acct.length < 3) { $('ba').classList.add('bad'); $('ba').focus(); return toast('اكتب ' + (sel.fl || 'الرقم'), 'bad'); }
      if (k === 'top' && !num('bm')) { $('bm').classList.add('bad'); $('bm').focus(); return toast('اكتب مبلغ الشحن', 'bad'); }
      var pk = k === 'pack' ? (pack || ($('bpt') ? $('bpt').value.trim() : '')) : '';
      var cu = readCust(false); if (!cu) return;
      submitOrder({ kind: 'bill', pay: payVal(), bill: { svc: sel.id, acct: acct, co: co, amt: k === 'top' || k === 'bill' ? num('bm') : 0, pack: pk, note: $('bnote').value.trim() }, cust: { name: cu.name, phone: cu.phone, pickup: true } }, this);
    };
  }
  function repairPage(ask) {
    var s = (C.svc || {}).repair; if (!s || s.on === false) return go('#/svc');
    var mode = ask ? 'ask' : 'home', probs = [], loc = null;
    var P2 = [['📱', 'شاشة'], ['🔋', 'بطارية'], ['🔌', 'شحن'], ['📷', 'كاميرا'], ['💧', 'وقع في مية'], ['🔊', 'صوت'], ['📶', 'شبكة'], ['🔐', 'سوفت وير'], ['❓', 'حاجة تانية']];
    var html = barHTML('🛠 صيانة') + '<div class="box"><h4>عايز إيه؟</h4><div class="opts" id="rm"><button type="button" class="opt' + (mode === 'home' ? ' on' : '') + '" data-m="home"><em>🏠</em>ناخده ونرجّعه</button><button type="button" class="opt" data-m="shop"><em>🏪</em>هجيبه المحل</button><button type="button" class="opt' + (mode === 'ask' ? ' on' : '') + '" data-m="ask"><em>💬</em>استشارة</button></div><div class="hint" id="rh" style="margin-top:10px"></div></div>'
      + '<div class="box"><h4>الجهاز والمشكلة</h4><label class="f"><span>الجهاز</span><input class="in" id="rd" placeholder="مثلًا iPhone 12 أو Samsung A54"></label><div class="opts" id="rp" style="margin-bottom:8px">' + P2.map(function (x) { return '<button type="button" class="opt" data-pr="' + x[1] + '"><em>' + x[0] + '</em>' + x[1] + '</button>'; }).join('') + '</div>'
      + '<textarea class="in" id="rx" placeholder="اوصف المشكلة (اختياري)"></textarea></div>'
      + '<div class="box" id="rw"><h4>⏰ نيجي ناخده إمتى</h4><div class="opts" id="rt"><button type="button" class="opt on" data-t="النهارده">النهارده</button><button type="button" class="opt" data-t="بكرة الصبح">بكرة الصبح</button><button type="button" class="opt" data-t="بكرة بالليل">بكرة بالليل</button></div></div>'
      + custBox() + locBox() + '<div class="cta flow"><button class="btn b1" id="go">ابعت الطلب</button></div>';
    shell(html, '#/svc', true);
    var paint = function () {
      var home = mode === 'home'; ['rw', 'addrw', 'locw'].forEach(function (id) { var e = document.getElementById(id); if (e) e.hidden = !home; });
      document.getElementById('rh').innerHTML = mode === 'home' ? '🏠 المندوب بياخد الجهاز ويرجّعه بعد التصليح' + (+s.pickupFee ? ' — المشوار <b class="num">' + fm(s.pickupFee) + '</b>' : ' ببلاش') + '. السعر النهائي بعد الفحص.' : mode === 'shop' ? '🏪 هنحجزلك ميعاد ونكلمك. ' + (C.shop.addr ? esc(C.shop.addr) : '') : '💬 الفني هيكلمك على واتساب ببلاش ويقولك المشكلة غالبًا إيه وهتتكلف كام تقريبًا.';
      var n = document.getElementById('mapn'); if (n && loc) { var q = delQuote(0, loc, false); n.className = 'mapnote ' + (q.out ? 'bad' : 'ok'); n.textContent = q.out ? 'برّه منطقة التوصيل (' + q.km + ' كم)' : q.km + ' كم'; }
    };
    mapInit(function (l) { loc = l; var m = me(); m.lat = l.lat; m.lng = l.lng; ls('me', m); paint(); });
    var when = 'النهارده';
    app.querySelectorAll('#rm [data-m]').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; app.querySelectorAll('#rm [data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); paint(); }; });
    app.querySelectorAll('#rp [data-pr]').forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); probs = [].map.call(app.querySelectorAll('#rp .on'), function (x) { return x.dataset.pr; }); }; });
    app.querySelectorAll('#rt [data-t]').forEach(function (b) { b.onclick = function () { when = b.dataset.t; app.querySelectorAll('#rt [data-t]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    paint();
    document.getElementById('go').onclick = function () {
      var dev = document.getElementById('rd').value.trim(); if (dev.length < 2) { document.getElementById('rd').classList.add('bad'); document.getElementById('rd').focus(); return toast('اكتب الجهاز', 'bad'); }
      var cu = readCust(mode === 'home'); if (!cu) return;
      if (mode === 'home' && C.del && C.del.center && !loc) { document.getElementById('locw').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('حدد مكانك على الخريطة', 'bad'); }
      submitOrder({ kind: 'repair', pay: 'cash', repair: { dev: dev, prob: probs, desc: document.getElementById('rx').value.trim(), mode: mode, when: mode === 'home' ? when : '' }, cust: { name: cu.name, phone: cu.phone, addr: cu.addr, lat: loc && loc.lat, lng: loc && loc.lng, pickup: mode !== 'home' } }, this);
    };
  }
  function wishPage(pid, trade) {
    var p = pid && P[pid], kinds = [['📱', 'موبايل', 'ph'], ['🛡', 'جراب', 'case'], ['🔲', 'اسكرينة', 'scr'], ['🎧', 'إكسسوار', 'acc'], ['🛠', 'قطعة غيار', 'part'], ['❓', 'تاني', 'other']], k = 'other';
    var html = barHTML(trade ? '🔁 بدّل موبايلك' : p ? '🔔 بلّغني لما يتوفر' : '🤔 قولّنا عايز إيه')
      + (trade ? '<div class="box"><h4>موبايلك القديم</h4><label class="f"><span>الموبايل</span><input class="in" id="wt" placeholder="مثلًا iPhone 11 128GB"></label><div class="opts" id="tc"><button type="button" class="opt on" data-c="زي الجديد"><em>✨</em>زي الجديد</button><button type="button" class="opt" data-c="خدوش خفيفة"><em>👌</em>خدوش خفيفة</button><button type="button" class="opt" data-c="فيه عيوب"><em>🩹</em>فيه عيوب</button></div><label class="f" style="margin-top:8px"><span>عايز تبدّله بإيه؟ (اختياري)</span><input class="in" id="tw" placeholder="الموبايل اللي عايزه"></label><div class="hint">💡 هنبعتلك تقييم مبدئي على واتساب، والسعر النهائي بعد ما نشوفه.</div></div>'
        : p ? '<div class="box" style="display:flex;gap:12px;align-items:center"><div class="ci" style="border:0;padding:0;flex:1"><div class="im">' + pic(p) + '</div><div class="t"><b>' + esc(p.n) + '</b><small>هنبعتلك على واتساب أول ما يرجع</small></div></div></div><input type="hidden" id="wt" value="' + esc('بلّغني لما يتوفر: ' + p.n) + '">'
          : '<div class="box"><h4>بتدوّر على إيه؟</h4><label class="f"><span>اكتبه</span><input class="in" id="wt" placeholder="مثلًا جراب Spigen لـ S24 Ultra"></label><div class="opts" id="wk">' + kinds.map(function (x) { return '<button type="button" class="opt' + (x[2] === k ? ' on' : '') + '" data-k="' + x[2] + '"><em>' + x[0] + '</em>' + x[1] + '</button>'; }).join('') + '</div><label class="f" style="margin-top:8px"><span>ميزانيتك تقريبًا (اختياري)</span><input class="in num" id="wb" inputmode="numeric" dir="ltr" style="text-align:right"></label></div>')
      + custBox({ noAddr: true }) + '<div class="cta flow"><button class="btn b1" id="go">' + (p ? '🔔 بلّغني' : 'ابعت') + '</button></div>';
    shell(html, '#/svc', true);
    var cond = 'زي الجديد';
    app.querySelectorAll('#wk [data-k]').forEach(function (b) { b.onclick = function () { k = b.dataset.k; app.querySelectorAll('#wk [data-k]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    app.querySelectorAll('#tc [data-c]').forEach(function (b) { b.onclick = function () { cond = b.dataset.c; app.querySelectorAll('#tc [data-c]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    document.getElementById('go').onclick = function () {
      var t = document.getElementById('wt').value.trim(); if (t.length < 3) { document.getElementById('wt').classList.add('bad'); return toast(trade ? 'اكتب موبايلك' : 'اكتب انت عايز إيه', 'bad'); }
      if (trade) t = 'بدّل: ' + t + ' (' + cond + ')' + (document.getElementById('tw').value.trim() ? ' ← ' + document.getElementById('tw').value.trim() : '');
      var cu = readCust(false); if (!cu) return;
      submitOrder({ kind: 'wish', wish: { text: t, cat: trade ? 'trade' : p ? 'notify' : k, budget: +((document.getElementById('wb') || {}).value || 0), pid: p ? p.id : '' }, cust: { name: cu.name, phone: cu.phone, pickup: true } }, this);
    };
  }
  function svcPage() {
    var s = C.svc || {};
    shell(barHTML('🛠 الخدمات') + svcCards(s) + '<div class="svc"><button data-go="#/wish"><span class="si" style="--c:#f59e0b">🤔</span><span><b>مش لاقي حاجة؟</b><small>قولّنا وهنجيبهالك</small></span></button>'
      + (waLink() ? '<button data-wa><span class="si" style="--c:#25d366">💬</span><span><b>كلّم المحل</b><small>على واتساب</small></span></button>' : '') + (C.shop.phone ? '<button data-tel><span class="si" style="--c:#1f5fae">📞</span><span><b>اتصل بينا</b><small class="num">' + esc(C.shop.phone) + '</small></span></button>' : '')
      + (C.shop.map || (C.del && C.del.center) ? '<button data-map><span class="si" style="--c:#0ea5a4">🗺</span><span><b>مكان المحل</b><small>افتح الخريطة</small></span></button>' : '') + '<button data-go="#/info"><span class="si" style="--c:#5b6b8c">📜</span><span><b>الشروط</b><small>الاسترجاع والضمان</small></span></button></div>' + footHTML(), '#/svc');
    var w = app.querySelector('[data-wa]'); if (w) w.onclick = function () { open(waLink('السلام عليكم'), '_blank'); };
    var t = app.querySelector('[data-tel]'); if (t) t.onclick = function () { location.href = 'tel:' + C.shop.phone; };
    var m = app.querySelector('[data-map]'); if (m) m.onclick = function () { var c = C.del && C.del.center; open(C.shop.map || ('https://www.google.com/maps?q=' + c.lat + ',' + c.lng), '_blank'); };
  }
  function legalBox() { var s = C.shop || {}; if (!s.cr && !s.tax) return ''; return '<div class="box"><h4>🏢 بيانات المحل</h4><div class="legal-rows">' + (s.name ? '<div><span>الاسم</span><b>' + esc(s.name) + '</b></div>' : '') + (s.cr ? '<div><span>رقم السجل التجاري</span><b class="num">' + esc(s.cr) + '</b></div>' : '') + (s.tax ? '<div><span>رقم البطاقة الضريبية</span><b class="num">' + esc(s.tax) + '</b></div>' : '') + '</div></div>'; }
  function infoPage() {
    var t = C.terms || {};
    var blk = function (h, x) { return x ? '<div class="box"><h4>' + h + '</h4><div class="terms">' + esc(x) + '</div></div>' : ''; };
    shell(barHTML('📜 الشروط') + blk('↩ الاسترجاع والاستبدال', t.ret) + blk('🛡 الضمان', t.war) + blk('🚚 التوصيل', t.del) + blk('🔒 بياناتك', t.priv || 'بنستخدم اسمك وتليفونك وعنوانك ومكانك علشان طلبك بس، ومابنديهمش لحد.') + legalBox() + footHTML(), '#/svc');
  }

  /* ---------- طلباتي والتتبّع ---------- */
  var ST_ORDER = { new: ['📝', 'استلمنا طلبك'], ok: ['✅', 'المحل أكّد الطلب'], prep: ['📦', 'بيتجهز'], ready: ['🎁', 'جاهز'], out: ['🛵', 'مع المندوب في السكة'], done: ['🏠', 'اتسلّم'], paid: ['🏠', 'اتسلّم'], cancel: ['✕', 'اتلغى'], ret: ['↩', 'مرتجع'] };
  var FLOW = { order: ['new', 'ok', 'prep', 'ready', 'out', 'done'], pick: ['new', 'ok', 'prep', 'ready', 'done'], bill: ['new', 'ok', 'done'], repair: ['new', 'ok', 'out', 'prep', 'ready', 'done'], wish: ['new', 'ok', 'done'], ask: ['new', 'ok', 'done'] };   // ask = استشارة (سؤال مش جهاز)
  var LABEL = { bill: { ok: 'بنستعلم ونبعتلك المبلغ', done: 'اتدفعت ✓' }, repair: { ok: 'اتأكد الميعاد', out: 'المندوب جاي ياخده', prep: 'في الصيانة', ready: 'جاهز', done: 'رجعلك ✓' }, wish: { new: 'وصلتنا', ok: 'بندوّرلك', done: 'لقيناه! هنكلمك' }, ask: { new: 'سؤالك وصل', ok: 'المحل رد عليك', done: 'خلص ✓' }, pick: { ready: 'جاهز تستلمه من المحل', done: 'استلمته ✓' } };
  function lab(kind, pick, s, ask, reply, bill) { var k = ask ? 'ask' : kind === 'order' && pick ? 'pick' : kind; if (kind === 'wish' && s === 'ok' && reply) return 'المحل رد عليك'; if (bill && (s === 'ok' || s === 'new')) return bill; return ((LABEL[k] || {})[s]) || (ST_ORDER[s] || ['', s])[1]; }
  function ordersPage() {
    var list = ls('orders') || [];
    if (!list.length) return shell(barHTML('📦 طلباتي') + '<div class="empty"><div class="e">📦</div><b>لسه مفيش طلبات</b><p>طلباتك من الموبايل ده بتظهر هنا وتقدر تتابعها.</p><button class="btn b1" data-go="#/">تسوّق دلوقتي</button></div>', '#/orders');
    shell(barHTML('📦 طلباتي') + '<div class="box">' + list.map(function (o) { return '<div class="ol" data-go="#/o/' + esc(o.trk) + '"><span style="font-size:24px">' + ({ order: '🛒', bill: '🧾', repair: '🛠', wish: '🤔' }[o.kind] || '🛒') + '</span><div class="t"><b class="num">W-' + esc(o.no) + '</b><small>' + new Date(o.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' }) + (o.total ? ' · ' + fm(o.total) + ' ' + esc(cur()) : '') + '</small></div><span class="pill" data-st="' + esc(o.trk) + '">…</span></div>'; }).join('') + '</div>', '#/orders');
    // الحالة لأحدث 5 بس (كل واحدة = نداء للسيرفر)
    list.slice(0, 5).forEach(function (o) { gw({ action: 'store-track', trk: o.trk }).then(function (r) { var el = app.querySelector('[data-st="' + o.trk + '"]'); if (!el) return; if (!r.ok) { el.textContent = '—'; return; } var s = r.order.status; el.textContent = lab(r.order.kind, r.order.pickup, s); el.className = 'pill ' + (s === 'cancel' || s === 'ret' ? 'bad' : s === 'done' || s === 'paid' ? 'ok' : 'wait'); }); });
    list.slice(5).forEach(function (o) { var el = app.querySelector('[data-st="' + o.trk + '"]'); if (el) el.textContent = 'افتح'; });
  }
  function xferBox(o, total) {
    var v = o.pay === 'voda', addr = v ? ((C.pay && C.pay.voda && C.pay.voda.num) || '') : ((C.pay && C.pay.insta && C.pay.insta.addr) || ''), n = ((o.info || {}).proofs || []).length;
    return '<div class="box xfer"><h4>' + (v ? '📱 ادفع بفودافون كاش' : '⚡ ادفع بانستا باي') + '</h4><div class="hint" style="margin-bottom:8px">حوّل <b>' + money(total) + '</b> على ' + (v ? 'الرقم ده' : 'العنوان ده') + '، وارفع صورة التحويل هنا. المحل هيأكد أول ما الفلوس توصل' + (o.kind === 'bill' ? ' ويدفعلك الفاتورة' : '') + '.</div>'
      + (addr ? '<div class="copy"><span>' + esc(addr) + '</span><button data-copy="' + esc(addr) + '">انسخ</button></div>' : '')
      + (n ? '<div class="pf-ok">✓ صورة التحويل وصلت المحل' + (n > 1 ? ' (' + n + ')' : '') + ' — مستنيين يأكدوا</div>' : '')
      + (n < 3 ? '<label class="btn ' + (n ? 'bs' : 'b1') + ' pf-up"><input type="file" accept="image/*" id="pf" hidden>📸 ' + (n ? 'ارفع صورة تانية' : 'ارفع صورة التحويل') + '</label>' : '')
      + (waLink() ? '<a class="btn bw" style="width:100%;margin-top:8px" target="_blank" rel="noopener" href="' + esc(waLink('حوّلت ' + fm(total) + (v ? ' فودافون كاش' : ' على انستا') + ' لطلب W-' + o.no)) + '">💬 أو ابعتها واتساب</a>' : '') + '</div>';
  }
  // صورة التحويل: أصغر (1400px وجودة لحد ما تبقى أقل من ~300KB)
  function shrinkImg(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = rej;
      fr.onload = function () { var im = new Image(); im.onerror = rej; im.onload = function () { var k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); var q = 0.82, u = c.toDataURL('image/jpeg', q); while (u.length > 400000 && q > 0.35) { q -= 0.1; u = c.toDataURL('image/jpeg', q); } res(u); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  function trackPage(trk, isNew) {
    shell(barHTML('📦 الطلب') + '<div class="box"><div class="sk" style="height:110px"></div></div><div class="box"><div class="sk" style="height:200px"></div></div>', '#/orders', true);
    var sig = null;
    var load = function () {
      clearTimeout(pollT);
      gw({ action: 'store-track', trk: trk }).then(function (r) {
        if (location.hash.indexOf('#/o/' + trk) !== 0) return;
        var ns = JSON.stringify(r), first = sig === null;
        if (ns === sig) { var o0 = r.order || {}, s0 = o0.status === 'paid' ? 'done' : o0.status; if (r.ok && s0 !== 'done' && s0 !== 'cancel' && s0 !== 'ret' && !document.hidden) pollT = setTimeout(load, 45000); return; }   // مفيش جديد: الصفحة زي ما هي
        sig = ns; var y = window.scrollY; QUIET = !first;
        if (!r.ok) return shell(barHTML('📦 الطلب') + '<div class="empty"><div class="e">😕</div><b>' + esc(r.error || 'الطلب مش موجود') + '</b><p></p><button class="btn b1" data-go="#/orders">طلباتي</button></div>', '#/orders');
        var o = r.order, ask = o.kind === 'repair' && o.info && o.info.mode === 'ask', reply = o.info && o.info.reply;
        var fk = ask ? 'ask' : o.kind === 'order' && o.pickup ? 'pick' : o.kind, flow = FLOW[fk] || FLOW.order, s = o.status === 'paid' ? 'done' : o.status, idx = flow.indexOf(s), bad = s === 'cancel' || s === 'ret';
        var bi = o.info || {}, bt = o.totals || {}, bw = o.kind === 'bill' && !!bt.total && bi.agreed !== undefined && !(bi.agreed === 'yes' && +bi.agreedAmt === +bt.total);
        var billNow = o.kind !== 'bill' || o.pay_state === 'paid' ? '' : bw ? (bi.agreed === 'no' ? 'المحل بيراجع المبلغ' : 'مستني موافقتك على المبلغ') : bt.total && !(bi.approx && bi.agreed === undefined) ? 'مستني التحويل' : '';
        var at = {}; (o.hist || []).forEach(function (h) { at[h.s === 'paid' ? 'done' : h.s] = h; });
        var tm = function (h) { return h ? new Date(h.at).toLocaleString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) + (h.n ? ' · ' + esc(h.n) : '') : '—'; };
        var col = bad ? ['#8f1f35', '#b8304a'] : s === 'done' ? ['#0b5c32', '#137a43'] : s === 'out' ? ['#8a3c06', '#b45309'] : ['#16407f', '#1f5fae'];   // أغمق: الكلام الأبيض الصغير عليها واضح (WCAG)
        var html = barHTML('📦 طلب <span class="num">W-' + esc(o.no) + '</span>', '', '#/orders')
          + (isNew ? '<div class="banner info" style="background:var(--okbg);color:var(--okc)">🎉 طلبك وصل للمحل! هنكلمك على واتساب.</div>' : '')
          + '<div class="oh" style="--c1:' + col[0] + ';--c2:' + col[1] + '"><small>الحالة دلوقتي</small><b>' + esc((ST_ORDER[s] || [''])[0]) + ' ' + esc(lab(o.kind, o.pickup, s, ask, reply, billNow)) + '</b><small>' + esc(o.name) + ' · ' + new Date(o.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' }) + '</small></div>';
        /* فاتورة: المبلغ اللي المحل كتبه لازم توافق عليه الأول (خالد 2026-11-09). agreed: undefined = المبلغ منك انت | '' = مستني | yes / no (مربوطة بالمبلغ) */
        var oi = o.info || {}, ot = o.totals || {}, wait = o.kind === 'bill' && !!ot.total && oi.agreed !== undefined && !(oi.agreed === 'yes' && +oi.agreedAmt === +ot.total);
        if (o.kind === 'bill' && !bad && s !== 'done' && o.pay_state !== 'paid') {
          if (wait) html += '<div class="box agree"><h4>🧾 المبلغ المطلوب</h4><div class="bigamt"><b class="num">' + fm(ot.total) + '</b> ' + esc(cur()) + '<small>' + fm(ot.amt) + (ot.fee ? ' + عمولة ' + fm(ot.fee) : '') + '</small></div>'
            + (oi.agreed === 'no' ? '<div class="hint" style="margin-bottom:8px">انت رفضت المبلغ ده. المحل هيراجعه ويبعتلك، أو تقدر توافق دلوقتي.</div>' : '<div class="hint" style="margin-bottom:8px">موافق على المبلغ؟ بعد الموافقة هيظهرلك تحوّل على إيه.</div>')
            + '<div class="two"><button class="btn bg" id="agy">✓ موافق</button>' + (oi.agreed === 'no' ? '' : '<button class="btn bs" id="agn">✕ مش موافق</button>') + '</div></div>';
          else if (!ot.total) html += '<div class="box"><div class="hint">⏳ المحل بيستعلم عن المبلغ وهيبعتهولك هنا' + (waLink() ? ' وعلى واتساب' : '') + '.' + (oi.approx ? ' السعر اللي شفته تقريبي.' : '') + '</div></div>';
          else if (oi.approx) html += '<div class="box"><div class="hint">⏳ السعر تقريبي (' + money(ot.total) + '). المحل هيأكده ويبعتلك توافق قبل ما تدفع.</div></div>';
        }
        var canPayNow = !wait && !(o.kind === 'bill' && oi.approx && oi.agreed === undefined);
        // فودافون كاش / انستا: الرقم أو العنوان والمبلغ، وصورة التحويل ترتفع هنا لحد ما الكاشير يأكد (خالد 2026-11-13)
        if ((o.pay === 'voda' || o.pay === 'insta') && o.pay_state !== 'paid' && !bad && ot.total && canPayNow) html += xferBox(o, ot.total);
        // رد المحل على الاستشارة / "بدوّر على" (خالد 2026-11-09): أول حاجة تحت الحالة
        if (reply) html += '<div class="box reply"><h4>💬 رد المحل' + (o.info.replyAt ? ' <small>' + new Date(o.info.replyAt).toLocaleString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) + '</small>' : '') + '</h4><div class="rtx">' + esc(reply) + '</div></div>';
        if (o.pay === 'card' && o.pay_state !== 'paid' && !bad) html += '<div class="box"><h4>💳 الدفع بالفيزا ' + (o.pay_state === 'fail' ? '<small style="color:var(--rd)">الدفع ماتمّش</small>' : '') + '</h4><button class="btn b1" id="paynow" style="width:100%">ادفع دلوقتي · <span class="num">' + fm(o.totals.total) + '</span></button></div>';
        if (o.pay_state === 'paid') html += '<div class="banner" style="background:var(--okbg);color:var(--okc)">✓ اتدفع ' + (o.pay === 'card' ? 'بالفيزا' : o.pay === 'voda' ? 'بفودافون كاش' : 'بانستا') + '</div>';
        html += '<div class="box"><div class="trk">' + (bad ? '<div class="x"><i>✕</i><span><b>' + esc(lab(o.kind, o.pickup, s, ask, reply)) + '</b><small>' + tm(at[s]) + '</small></span></div>'
          : flow.map(function (f, i) { var c = i < idx || (i === idx && s === 'done') ? 'd' : i === idx ? 'c' : 'n'; return '<div class="' + c + '"><i>' + (c === 'd' ? '✓' : c === 'c' ? esc((ST_ORDER[f] || [''])[0]) : '') + '</i><span><b>' + esc(lab(o.kind, o.pickup, f, ask, reply)) + '</b><small>' + (i <= idx ? tm(at[f]) : '—') + '</small></span></div>'; }).join('')) + '</div></div>';
        if ((o.items || []).length || o.totals) {
          var t = o.totals || {};
          html += '<div class="box sum">' + (o.items || []).map(function (x) { return '<div><span>' + esc(x.n) + (x.q > 1 ? ' ×' + x.q : '') + (x.add && x.add.length ? ' + ' + esc(x.add.map(function (a) { return a.n; }).join('، ')) : '') + '</span><span>' + money(x.q * (x.pr + (x.add || []).reduce(function (a, y) { return a + y.p; }, 0))) + '</span></div>'; }).join('')
            + (o.kind === 'bill' ? '<div><span>' + esc(o.info.svcN || 'فاتورة') + (o.info.co ? ' · ' + esc(o.info.co) : '') + (o.info.pack ? ' · ' + esc(o.info.pack) : '') + '</span><span>' + (t.amt ? money(t.amt) : 'بنستعلم') + '</span></div>' + (o.info.net ? '<div><span>رصيد صافي تقريبًا</span><span>' + money(o.info.net) + '</span></div>' : '') + (t.fee != null ? '<div><span>العمولة</span><span>' + money(t.fee) + '</span></div>' : '') : '')
            + (o.kind === 'repair' ? '<div><span>' + esc(o.info.dev) + (o.info.prob && o.info.prob.length ? ' · ' + esc(o.info.prob.join('، ')) : '') + '</span><span></span></div>' : '')
            + (o.kind === 'wish' ? '<div><span>' + esc(o.info.text) + '</span><span></span></div>' : '')
            + (t.disc ? '<div><span>خصم ' + esc(t.coupon || '') + '</span><span class="free">− ' + money(t.disc) + '</span></div>' : '')
            + (t.del != null && o.kind !== 'wish' ? '<div><span>' + (o.kind === 'repair' ? 'المشوار' : 'التوصيل') + '</span><span class="' + (t.del ? '' : 'free') + '">' + (o.pickup && o.kind === 'order' ? 'من المحل' : t.del ? money(t.del) : 'ببلاش') + '</span></div>' : '')
            + (t.total ? '<div class="tot"><span>' + (o.pay === 'cash' && !o.pickup && o.kind === 'order' ? 'هتدفع للمندوب' : 'الإجمالي') + '</span><span>' + money(t.total) + '</span></div>' : '') + '</div>';
        }
        html += '<div class="cta">' + (waLink() ? '<a class="btn bw" target="_blank" rel="noopener" href="' + esc(waLink('بخصوص طلب W-' + o.no)) + '">💬 كلّم المحل</a>' : '') + (s === 'new' ? '<button class="btn bs" id="cancel">✕ الغي الطلب</button>' : s === 'done' && o.kind === 'order' && waLink() ? '<a class="btn bs" target="_blank" rel="noopener" href="' + esc(waLink('عايز أرجّع حاجة من طلب W-' + o.no + '. السبب: ')) + '">↩ عايز أرجّع حاجة</a>' : '') + '</div>';
        shell(html, '#/orders', true); if (QUIET) { QUIET = false; window.scrollTo({ top: y, behavior: 'instant' }); }
        var cp = app.querySelector('[data-copy]'); if (cp) cp.onclick = function () { copy(cp.dataset.copy); toast('اتنسخ ✓', 'ok'); };
        var pf = document.getElementById('pf'); if (pf) pf.onchange = function () {
          var f = pf.files && pf.files[0]; if (!f) return; var lb = pf.parentNode; lb.classList.add('busy'); lb.lastChild.nodeValue = ' بنرفع الصورة...';
          shrinkImg(f).then(function (u) { return gw({ action: 'store-proof', trk: trk, img: u }); }).then(function (x) { if (!x.ok) { toast(x.error || 'الصورة ماترفعتش', 'bad'); load(); return; } toast('✓ الصورة وصلت المحل', 'ok'); load(); })
            .catch(function () { toast('الصورة دي مش راضية تتقري', 'bad'); load(); });
        };
        var pn = document.getElementById('paynow'); if (pn) pn.onclick = function () { pn.disabled = true; gw({ action: 'store-pay', trk: trk, back: location.href.split('#')[0] + '#/o/' + trk }).then(function (pr) { pn.disabled = false; if (pr.url) location.href = pr.url; else if (pr.paid) load(); else toast(pr.error || 'الدفع مش متاح', 'bad'); }); };
        var ag = function (yes) { return function () { var b1 = document.getElementById('agy'), b2 = document.getElementById('agn'); if (b1) b1.disabled = true; if (b2) b2.disabled = true; gw({ action: 'store-track', trk: trk, agree: yes }).then(function (x) { if (!x.ok) { toast(x.error || 'حصل خطأ', 'bad'); if (b1) b1.disabled = false; if (b2) b2.disabled = false; return; } toast(yes ? 'تمام ✓ حوّل المبلغ وهندفعلك' : 'وصل للمحل، هيراجع المبلغ', yes ? 'ok' : ''); sig = null; load(); }); }; };
        var ay = document.getElementById('agy'); if (ay) ay.onclick = ag(true);
        var an = document.getElementById('agn'); if (an) an.onclick = ag(false);
        var cn = document.getElementById('cancel'); if (cn) cn.onclick = function () { if (!confirm('متأكد إنك عايز تلغي الطلب؟')) return; gw({ action: 'store-track', trk: trk, cancel: true }).then(function (x) { if (!x.ok) return toast(x.error, 'bad'); toast('اتلغى', 'ok'); load(); }); };
        if (!bad && s !== 'done' && !document.hidden) pollT = setTimeout(load, 45000);   // متابعة كل 45 ثانية وهي مفتوحة
      });
    };
    trackLoad = load; load();
  }

  /* ---------- التثبيت كتطبيق ---------- */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; installMaybe(); });
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; }
  function installMaybe() {
    var onShop = /^(#\/?|#\/cats.*|#\/c\/.*)?$/.test(location.hash), old = document.querySelector('.install');
    if (!onShop) { if (old) old.remove(); return; }   // كان بيطلع فوق صفحة الطلب وزرار التأكيد (خالد 2026-11-09)
    if (!C || standalone() || old) return;
    var seen = +(ls('inst') || 0); if (Date.now() - seen < 7 * 864e5) return;
    var visits = +(ls('visits') || 0); if (visits < 2 && !(ls('orders') || []).length) return;
    if (!deferredInstall && !isIOS()) return;
    var d = document.createElement('div'); d.className = 'install';
    d.innerHTML = '<button class="x" aria-label="إغلاق">✕</button><div class="logo">' + logoHTML() + '</div><div style="flex:1"><b>ثبّت "' + esc(C.shop.name) + '" على موبايلك</b><small>يفتح على طول من الشاشة الرئيسية، وتشوف العروض الجديدة أول بأول.</small><button class="btn b1" style="margin-top:8px;padding:9px;font-size:13.5px;width:100%">📲 ثبّت</button></div>';
    document.body.appendChild(d);
    d.querySelector('.x').onclick = function () { ls('inst', Date.now()); d.remove(); };
    d.querySelector('.b1').onclick = function () {
      ls('inst', Date.now());
      if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(function () { deferredInstall = null; d.remove(); }); return; }
      d.remove(); sheet('<h3 style="font-weight:900;margin-bottom:10px">📲 ثبّت على الآيفون</h3><div class="terms">1) دوس على زرار المشاركة ⬆️ تحت في Safari\n2) اختار "Add to Home Screen" (إضافة إلى الشاشة الرئيسية)\n3) دوس "Add"</div><button class="btn b1" style="width:100%;margin-top:14px" data-close>تمام</button>');
    };
  }
  function sheet(html) { var bg = document.createElement('div'); bg.className = 'sheet-bg'; var s = document.createElement('div'); s.className = 'sheet'; s.innerHTML = html; document.body.append(bg, s); var close = function () { bg.remove(); s.remove(); }; bg.onclick = close; s.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = close; }); }

  /* ---------- التنقّل ---------- */
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function render() {
    if (!C) return;
    var h = location.hash || '#/', path = h.split('?')[0], q = new URLSearchParams(h.split('?')[1] || ''), seg = path.slice(2).split('/');
    if (!QUIET) { var tt = document.getElementById('toast'); if (tt && /bad/.test(tt.className)) { clearTimeout(toast.t); tt.className = ''; } }   // رسالة خطأ من الصفحة اللي فاتت ماتفضلش فوق الصفحة الجديدة
    if (!QUIET) window.scrollTo({ top: 0, behavior: 'instant' });   // من غير الانزلاق الناعم (html: scroll-behavior smooth) علشان الصفحة الجديدة تبدأ من فوق على طول
    if (C.open === false && seg[0] !== 'o' && seg[0] !== 'orders') return shell('<div class="closed"><div class="logo" style="width:84px;height:84px;margin:0 auto;font-size:40px;border-radius:26px">' + logoHTML() + '</div><b>' + esc(C.shop.name) + '</b><div class="e">🌙</div><b>المتجر مقفول مؤقتًا</b><p>' + (waLink() ? 'تقدر تكلّمنا على واتساب.' : '') + '</p>' + (waLink() ? '<a class="btn bw" style="margin-top:12px" href="' + esc(waLink('السلام عليكم')) + '" target="_blank" rel="noopener">💬 كلّمنا</a>' : '') + '</div>', '', true);
    switch (seg[0]) {
      case '': return home();
      case 'cats': return cats();
      case 'c': return catPage(decodeURIComponent(seg[1] || ''));
      case 'q': return catPage('_q', decodeURIComponent(seg[1] || ''));
      case 'p': return product(decodeURIComponent(seg[1] || ''));
      case 'cart': return cartPage();
      case 'checkout': return checkout();
      case 'orders': return ordersPage();
      case 'o': return trackPage(seg[1] || '', q.get('new') === '1');
      case 'svc': return svcPage();
      case 'bill': return billPage();
      case 'repair': return repairPage(q.get('ask') === '1');
      case 'wish': return wishPage(q.get('p'));
      case 'trade': return wishPage('', true);
      case 'info': return infoPage();
      default: return home();
    }
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add]'); if (t) { e.stopPropagation(); return addToCart(t.dataset.add, 1, []); }
    var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    var p = e.target.closest('[data-p]'); if (p && !e.target.closest('a')) return go('#/p/' + encodeURIComponent(p.dataset.p));
    var b = e.target.closest('[data-back]'); if (b) { if (history.length > 1 && !b.dataset.back) history.back(); else go(b.dataset.back || '#/'); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && /^#\/o\//.test(location.hash) && trackLoad) trackLoad(); if (!document.hidden && C && Date.now() - (loadCat.at || 0) > 120000) loadCat(true); });

  /* ---------- التحميل ---------- */
  /* لون المحل (خالد 2026-11-13: "الالوان اللي في اعدادات المتجر مش بتغير في الوان الموقع" / "الالوان مش مبينه الكلام"):
     من اللون اللي المحل اختاره بنحسب درجات مقروءة (WCAG 4.5): --ac-tx كلام بلون المحل على الفاتح (أغمق شوية) وعلى الغامق (أفتح شوية)،
     --ac-fill / --on-ac زرار بلون المحل والكلام عليه أبيض أو أسود حسب اللون (أصفر = كلام أسود)، --ac-dk خلفية غامقة بلون المحل لكلام أبيض.
     كده أي لون يختاره بيبان في الموقع من غير ما الكلام يضيع */
  var hexRgb = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
  var rgbHex = function (c) { return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); };
  var mixC = function (a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); };   // t = قد إيه من b
  var lumC = function (c) { return c.reduce(function (s, v, i) { v /= 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); };
  var crC = function (a, b) { var x = lumC(a), y = lumC(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // بنقرّب اللون من "to" خطوة خطوة لحد ما يبقى مقروء على كل الخلفيات اللي بيظهر عليها
  var fitC = function (c, to, bgs, need) { for (var t = 0; t <= 1.0001; t += 0.04) { var x = mixC(c, to, t); if (bgs.every(function (b) { return crC(x, b) >= need; })) return x; } return to; };
  function accentVars(hex) {
    var ac = hexRgb(hex), W = [255, 255, 255], INK = [11, 31, 77], DK = [11, 20, 48], CARD_D = [19, 28, 48], BG_D = [10, 17, 32];
    var onWhite = crC(W, ac) >= 2.5;   // أبيض على لون المحل إلا لو اللون فاتح أوي (أصفر)؛ الدرجة بعدين بتتغمّق لحد 4.6 (كانت + سودة على الأزرق)
    var on = onWhite ? W : [16, 24, 40];
    var fill = fitC(ac, onWhite ? DK : W, [on], 4.6);
    var txL = fitC(ac, INK, [W, [247, 248, 251], mixC(W, ac, 0.13)], 4.6);
    var txD = fitC(ac, W, [CARD_D, BG_D, mixC(CARD_D, ac, 0.15)], 4.6);
    var dk = fitC(ac, DK, [W], 7);
    return { '--ac': hex, '--ac-fill': rgbHex(fill), '--ac2': rgbHex(mixC(fill, onWhite ? DK : W, 0.18)), '--on-ac': rgbHex(on), '--ac-tx-l': rgbHex(txL), '--ac-tx-d': rgbHex(txD), '--ac-dk': rgbHex(dk) };
  }
  function theme() {
    var ac = C.shop && /^#[0-9a-f]{6}$/i.test(C.shop.ac || '') ? C.shop.ac : '#2b7be0';
    var v = accentVars(ac); for (var k in v) document.documentElement.style.setProperty(k, v[k]);
    document.title = C.shop.name || 'المتجر';
    document.getElementById('mf').href = ST + slug + '/manifest.json';
    if (C.shop.logo) document.getElementById('ati').href = img(C.shop.logo);
  }
  function loadCat(quiet) {
    loadCat.at = Date.now();
    return fetch(ST + encodeURIComponent(slug) + '/catalog.json?t=' + Math.floor(Date.now() / 30000), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); })
      .then(function (j) { var txt = JSON.stringify(j), same = txt === loadCat.sig; loadCat.sig = txt; set(j); try { localStorage.setItem('rds_cat_' + slug, txt); } catch (e) {} if (quiet && !same) refresh(); })
      .catch(function (st) { if (C) return; var old = null; try { old = JSON.parse(localStorage.getItem('rds_cat_' + slug)); } catch (e) {} if (old) { set(old); render(); toast('مفيش نت — بتشوف آخر نسخة', 'bad'); } else fail(st === 400 || st === 404 ? 'المتجر ده مش موجود' : 'مفيش نت. جرّب تاني.'); });
  }
  function set(j) { C = j; C.shop = C.shop || {}; P = {}; (C.p || []).forEach(function (p) { P[p.id] = p; }); theme(); }
  function fail(t) { app.className = ''; app.innerHTML = '<div class="closed"><div class="e">🛍</div><b>' + esc(t) + '</b><p>اتأكد من اللينك أو جرّب تاني بعد شوية.</p><button class="btn b1" style="margin-top:14px" onclick="location.reload()">جرّب تاني</button></div>'; }
  function boot() {
    var qs = new URLSearchParams(location.search), host = location.hostname;
    slug = (qs.get('s') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    var pre = slug ? Promise.resolve() : !/github\.io$|^localhost$|^127\.|^$/.test(host)
      ? fetch(ST + '_d/' + encodeURIComponent(host.toLowerCase()) + '.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { slug = (j && j.s) || ''; }).catch(function () {})
      : Promise.resolve();
    pre.then(function () {
      if (!slug) { try { slug = localStorage.getItem('rds_last') || ''; } catch (e) {} }
      if (!slug) return fail('اللينك ناقص اسم المحل');
      try { localStorage.setItem('rds_last', slug); } catch (e) {}
      ls('visits', (+(ls('visits') || 0)) + 1);
      var cached = null; try { cached = JSON.parse(localStorage.getItem('rds_cat_' + slug)); } catch (e) {}
      if (cached) { loadCat.sig = JSON.stringify(cached); set(cached); render(); loadCat(true); } else loadCat().then(function () { if (C) render(); });
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  window.__store = { render: render, go: go, state: function () { return { slug: slug, C: C, cart: cart() }; }, reload: function () { return loadCat(true); }, poll: function () { if (trackLoad) trackLoad(); } };   // للاختبار
  boot();
})();
