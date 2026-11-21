/* متجر المحل (خالد 2026-11-08) — docs/store-plan.md
   صفحة واحدة بالـ hash: #/ الرئيسية، #/c/<قسم>، #/q/<بحث>، #/p/<منتج>، #/cart، #/checkout، #/o/<كود>، #/orders، #/svc، #/bill، #/repair، #/wish، #/trade، #/info
   الأسعار هنا للعرض بس: السيرفر بيحسب الطلب كله من نسخته. مفيش أي مفاتيح سرية في الصفحة (المفتاح العام بتاع Supabase بس). */
(function () {
  'use strict';
  var SB = 'https://sgqscttmkhmiqyjsuvio.supabase.co', GW = SB + '/functions/v1/gateway', ST = SB + '/storage/v1/object/public/store/';
  var KEY = 'sb_publishable_y11CnpnNLb6qIx00LVUHJQ_BzzQNXim';   // مفتاح عام (نفس اللي في t.html)
  var app = document.getElementById('app');
  var activeDealId = '', dealCampaign = null, dealAuto = 0;   // dealAuto: مؤقت البانر اللي بيقلب لوحده
  var slug = '', C = null, P = {}, deferredInstall = null, timers = [], pollT = 0, trackLoad = null, BR = null;   // BR: فروع المحل (branches.json) لو المتجر واحد لكل الفروع

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
  function waLink(text) { var n = String((C && C.shop && (C.shop.wa || C.shop.phone)) || '').replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }).replace(/\D/g, '').replace(/^00/, ''); if (/^01\d{9}$/.test(n)) n = '2' + n; /* 2026-11-17: "0020…" كان بيعمل لينك واتساب بايظ */ return n ? 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '') : ''; }
  var WA_SVG = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3.2 29l6.9-1.8c1.9 1 4 1.6 6 1.6 7 0 12.7-5.7 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.1 1.1-4-.3-.4c-1.1-1.7-1.6-3.6-1.6-5.5C5.3 9.8 10.1 5.1 16 5.1s10.7 4.7 10.7 10.5S21.9 26.1 16 26.1zm5.9-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2s0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.8 1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5.1.8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';

  /* ---------- الأسعار والعروض ---------- */
  function offOn(p) { var o = p && p.off; if (!o || !(+o.pr > 0)) return false; var now = Date.now(); return (!o.from || Date.parse(o.from) <= now) && (!o.to || Date.parse(o.to) >= now); }
  function eff(p) { var on = offOn(p), pr = on ? +p.off.pr : +p.pr || 0, was = on ? (+p.was || +p.pr) : +p.was || 0; return { pr: pr, was: was > pr ? was : 0, end: on && p.off.to ? p.off.to : '', pct: was > pr ? Math.round((1 - pr / was) * 100) : 0 }; }
  function limMsg(p) { var raw = p && Number.isFinite(+p.q) && +p.q >= 0 ? +p.q : 99; return raw > 20 ? 'أقصى حاجة 20 قطعة من الصنف في الطلب' : p.hq ? 'مش متاح أكتر من كده' : 'المتاح ' + avail(p) + ' بس'; }
  function avail(p) { return Math.min(20, p && Number.isFinite(+p.q) && +p.q >= 0 ? +p.q : 99); }   // 20 = أقصى كمية للصنف في الطلب الواحد على السيرفر
  function cdHTML(end, small) { return '<span class="cd" data-end="' + esc(end) + '">' + (small ? '' : '') + '</span>'; }
  function tickTimers() {
    document.querySelectorAll('[data-end]').forEach(function (el) {
      var left = Math.max(0, Date.parse(el.dataset.end) - Date.now()), d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
      var p2 = function (n) { return String(n).padStart(2, '0'); };
      // خالد 2026-11-16: الثواني بتظهر في آخر يوم بس؛ قبلها يوم / ساعة / دقيقة
      if (el.classList.contains('cd')) el.innerHTML = (d ? '<span class="num">' + d + '<em>يوم</em></span>' : '') + '<span class="num">' + p2(h) + '<em>ساعة</em></span><span class="num">' + p2(m) + '<em>دقيقة</em></span>' + (d ? '' : '<span class="num">' + p2(s) + '<em>ثانية</em></span>');
      else el.innerHTML = (d ? d + ' يوم و ' : '') + '<bdi dir="ltr">' + p2(h) + ':' + p2(m) + (d ? '' : ':' + p2(s)) + '</bdi>';
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
    var p = P[id]; if (!p) return; var quiet = !!(add && add.quiet); add = (add || []).slice().sort();
    var c = cart(), k = id + '|' + add.join(','), ex = c.filter(function (x) { return x.k === k; })[0];
    var have = c.filter(function (x) { return x.id === id; }).reduce(function (a, x) { return a + x.q; }, 0);
    if (have + q > avail(p)) { toast(limMsg(p), 'bad'); return false; }
    if (ex) ex.q += q; else c.push({ k: k, id: id, q: q, add: add });
    setCart(c); if (!quiet) toast('✓ اتضاف للسلة', 'ok');
    document.querySelectorAll('.bdg[data-cart]').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    return true;
  }
  function badge() { var n = cartCount(); document.querySelectorAll('.bdg[data-cart]').forEach(function (b) { b.textContent = n; b.hidden = !n; }); }

  /* ---------- مواعيد الشغل ---------- */
  function openNow(hh) {
    var h = hh !== undefined ? hh : C && C.shop && C.shop.hours; if (!h || !h.from || !h.to) return true;
    var t = new Date(), m = t.getHours() * 60 + t.getMinutes(), f = h.from.split(':'), e = h.to.split(':');
    var a = +f[0] * 60 + +(f[1] || 0), b = +e[0] * 60 + +(e[1] || 0); if (b === 0) b = 1440;
    // 2026-11-17: لو المحل بيقفل بعد نص الليل (6 م – 2 ص)، الساعة 1 الصبح لسه وردية امبارح: الإجازة بتتحسب على امبارح مش النهارده
    var day = a > b && m < b ? (t.getDay() + 6) % 7 : t.getDay();
    if ((h.off || []).indexOf(day) >= 0) return false;
    return a <= b ? m >= a && m < b : m >= a || m < b;
  }
  function hoursTxt() { var h = C.shop.hours; if (!h || !h.from) return ''; var f = function (s) { var p = s.split(':'), H = +p[0] % 24, mm = p[1] && p[1] !== '00' ? ':' + p[1] : ''; return (H % 12 || 12) + mm + (H < 12 ? ' ص' : ' م'); }; return f(h.from) + ' – ' + f(h.to); }

  /* ---------- الهيكل ---------- */
  // dk = صفحة من غير القايمة على الموبايل (المنتج / السلة / الفورمات): القايمة بتظهر على الشاشات الكبيرة بس (خالد 2026-11-13: المتجر على الكمبيوتر)
  /* خالد 2026-11-16: زرار "العروض" في الشريط اللي تحت، لو المحل عنده حاجة عليها خصم بس */
  function hasOffers() { return (C.p || []).some(function (p) { return !p.hide && eff(p).pct && avail(p) > 0; }); }
  function navHTML(on, dk) {
    var b = function (k, ic, t, extra) { return '<button data-go="' + k + '" class="' + (on === k ? 'on' : '') + '"><em>' + ic + '</em>' + t + (extra || '') + '</button>'; };
    return '<nav class="nav' + (dk ? ' dk' : '') + '"><div class="nlogo" data-go="#/"><span class="logo">' + logoHTML() + '</span><b>' + esc(C.shop.name) + '</b></div>' + b('#/', '🏠', 'الرئيسية') + b('#/cats', '🗂', 'الأقسام') + (hasOffers() ? b('#/c/_off', '🔥', 'العروض') : '') + b('#/cart', '🛒', 'السلة', '<i class="bdg" data-cart hidden></i>') + b('#/me', '👤', 'حسابي') + b('#/svc', '🛠', 'الخدمات') + '</nav>'
      + (!dk && waLink() ? '<a class="wa" href="' + esc(waLink('السلام عليكم، عندي سؤال')) + '" target="_blank" rel="noopener" aria-label="واتساب">' + WA_SVG + '</a>' : '');
  }
  function barHTML(t, sub, back) { return '<div class="bar"><button class="bk" data-back="' + esc(back || '') + '" aria-label="رجوع">→</button><b>' + t + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  // فروع: اللوجو من فولدر الفرع الرئيسي (C.shop._lg = "<slug>/i/<اسم>")
  function logoHTML() { var u = C.shop._lg ? ST + C.shop._lg.split('/').map(encodeURIComponent).join('/') : C.shop.logo ? img(C.shop.logo) : ''; return u ? '<img src="' + esc(u) + '" alt="">' : esc(C.shop.ic || '🔧'); }
  /* QUIET (خالد 2026-11-09: "الموقع بيفضل يعمل ريفرش"): الرسم اللي جاي من تحديث في الخلفية (الكتالوج اتغيّر، حالة الطلب اتغيّرت، عرض خلص) بيتعمل
     من غير حركة الدخول ومن غير ما الصفحة ترجع لفوق. الحركة للتنقّل اللي العميل عمله بس */
  var QUIET = false;
  function shell(html, on, noNav) { clearTimers(); app.className = noNav ? '' : 'has-nav'; app.innerHTML = '<div class="page' + (QUIET ? ' still' : '') + '">' + html + '</div>' + navHTML(on, noNav); badge(); tickTimers(); installMaybe(); markLoading(app); adPick(); }
  /* خالد 2026-11-16: الصورة وهي بتتحمّل بيظهر عليها لمعة التحميل، وبعدين بتظهر بهدوء */
  function markLoading(root) {
    root.querySelectorAll('img').forEach(function (im) {
      if (im.complete && im.naturalWidth) return;
      var box = im.parentNode; if (!box || box.classList.contains('ld')) return;
      box.classList.add('ld');
      var off = function () { box.classList.remove('ld'); };
      im.addEventListener('load', off, { once: true }); im.addEventListener('error', off, { once: true });
    });
  }
  /* صورة شكلها مش قريب من المربع (كيبورد عريض، سلك طويل) كانت بتتقص في الكروت والبانر (خالد 2026-11-21: "شكلها مش حلو").
     دلوقتي بتبان كاملة، وورها نفس الصورة متغبّشة تملى المكان. الصور اللي قريبة من شكل المربع زي ما هي */
  document.addEventListener('load', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !im.naturalWidth) return;
    var box = im.closest('.pc .img, .sc .img, .deal .di, .ci .im, .deal.psb'); if (!box) return;
    var bw = box.clientWidth || 1, bh = box.clientHeight || 1, k = (im.naturalWidth / im.naturalHeight) / (bw / bh);
    var off = k > 1.3 || k < 0.72; box.classList.toggle('fit', off);   // toggle: البانر بيبدّل الصورة جوه نفس الزرار
    if (off) box.style.setProperty('--fitbg', 'url("' + im.currentSrc.replace(/"/g, '%22') + '")');
  }, true);
  // صفحات فيها خانات العميل بيكتب فيها: ماتترسمش من تاني من ورا ضهره (كان بيمسح اللي كتبه)
  function onForm() { return /^#\/(checkout|bill|repair|wish|trade)/.test(location.hash) || !!(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)); }
  function refresh() { if (!C || onForm() || document.querySelector('.sheet')) return; var y = window.scrollY; QUIET = true; try { render(); } finally { QUIET = false; } window.scrollTo({ top: y, behavior: 'instant' }); }
  function clearTimers() { clearTimeout(pollT); timers.forEach(clearTimeout); timers = []; }

  /* ---------- الكروت ---------- */
  /* ---------- تقييمات العملا (خالد 2026-11-16، memory store-product-reviews) ----------
     الملف العام reviews.json (السيرفر بيعمله من جديد بعد أي تقييم/إخفاء/رد): لكل منتج المتوسط والعدد وآخر 30 رأي. اللي اشترى بس اللي بيقيّم (من صفحة طلبه) */
  var REV = null;
  function revOf(id) { var x = REV && REV.p && REV.p[id]; return x && x.n ? x : null; }
  function starsHTML(a, big) { return '<span class="stars' + (big ? ' big' : '') + '" style="--v:' + Math.max(0, Math.min(100, a / 5 * 100)) + '%" aria-label="' + a + ' من 5">★★★★★</span>'; }
  function loadRev() {
    return fetch(ST + encodeURIComponent(slug) + '/reviews.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var had = JSON.stringify(REV); REV = j && j.p ? j : { p: {} }; if (JSON.stringify(REV) !== had && /^#\/(p\/|$|c\/|q\/)/.test(location.hash || '#/')) refresh(); }).catch(function () {});
  }
  function revLine(id) { var r = revOf(id); return r ? '<button type="button" class="rate" data-rev>' + starsHTML(r.a) + ' <b class="num">' + r.a + '</b> <span>(<span class="num">' + r.n + '</span> ' + (r.n > 10 ? 'تقييم' : r.n > 2 ? 'تقييمات' : 'تقييم') + ')</span></button>' : ''; }
  function revCard(x) { return '<div class="rv"><div class="rv-h"><b>' + esc(x.n || 'عميل') + ' <small>✓ اشترى من المحل</small></b>' + starsHTML(x.s) + '</div>' + (x.t ? '<p>' + esc(x.t) + '</p>' : '') + '<small class="rv-d">' + new Date(x.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) + '</small>' + (x.rp ? '<div class="rv-rp"><b>💬 رد المحل</b>' + esc(x.rp) + '</div>' : '') + '</div>'; }
  function revSection(id) {
    var r = revOf(id); if (!r) return '';
    return '<div class="revs" id="revs"><h4>⭐ آراء العملا</h4><div class="rv-sum">' + '<b class="num">' + r.a + '</b><span>' + starsHTML(r.a, true) + '<small><span class="num">' + r.n + '</span> عميل اشتروه وقيّموه</small></span></div>'
      + r.r.slice(0, 3).map(revCard).join('') + (r.r.length > 3 ? '<div id="rv-more" hidden>' + r.r.slice(3).map(revCard).join('') + '</div><button type="button" class="btn bs rv-all" id="rv-all">اعرض كل الآراء (<span class="num">' + r.r.length + '</span>)</button>' : '') + '</div>';
  }
  function cardHTML(p, i) {
    var e = eff(p), q = avail(p), so = q <= 0;
    return '<div class="pc' + (so ? ' soldout' : '') + '" data-p="' + esc(p.id) + '" style="animation-delay:' + Math.min(i || 0, 12) * 30 + 'ms">'
      + (e.pct && !so ? '<span class="tag off">−' + e.pct + '%</span>' : so ? '<span class="tag low">خلص</span>' : q <= 2 && !p.hq ? '<span class="tag low">فاضل ' + q + '</span>' : '')
      + (p.st === 'new' ? '<span class="tag new">جديد متبرشم</span>' : p.st === 'used' ? '<span class="tag used">مستعمل</span>' : isFresh(p) ? '<span class="tag new">لسه واصل</span>' : p.sw ? '<span class="tag war">تبديل ' + esc(p.sw) + ' أيام</span>' : '')
      + '<div class="img">' + pic(p) + '</div><div class="nm">' + esc(p.n) + '</div>' + (revOf(p.id) ? '<div class="cr">★ <b class="num">' + revOf(p.id).a + '</b> <span class="num">(' + revOf(p.id).n + ')</span></div>' : '')
      + '<div class="pr">' + (p.ask ? '<span class="ask">💬 اسأل على السعر</span>' : so ? '<span class="out">هيتوفر قريب</span>' : '<strong class="num">' + fm(e.pr) + '</strong>' + (e.was ? '<s class="num">' + fm(e.was) + '</s>' : '')) + '</div>'
      + (!p.ask && !so && !(p.add && p.add.length) ? '<button class="add" data-add="' + esc(p.id) + '" aria-label="ضيف للسلة">+</button>' : '') + '</div>';
  }
  function isFresh(p) { return !!(p.fresh || p.new); }   // p.new = كاشير قديم (قبل 2.39)
  function gridHTML(list) { return list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : '<div class="empty"><div class="e">🔍</div><b>مفيش حاجة هنا</b><p>جرّب قسم تاني، أو قولّنا انت عايز إيه وهنجيبهولك.</p><button class="btn b1" data-go="#/wish">🤔 قولّنا عايز إيه</button></div>'; }
  // بانر العروض كبوستر (خالد 2026-11-20): الشكل من إعدادات المتجر في الكاشير (C.bn، poster.js)، والكارت القديم لو مفيش
  var poster = function () { return window.RdPoster && C.bn && window.RdPoster.on(C.bn); };
  function dealContent(p) {
    if (p._ps) { var u = ST + slug + '/i/' + encodeURIComponent(p._ps.im); return '<span class="psb-bg" style="background-image:url(&quot;' + esc(u) + '&quot;)"></span><img src="' + esc(u) + '" alt="" decoding="async">'; }
    var e = eff(p);
    if (poster()) return window.RdPoster.html(C.bn, { name: p.n, pic: pic(p, true), img: !!(p.img && p.img[0]), price: money(e.pr), was: e.was ? '<span class="num">' + fm(e.was) + '</span>' : '', pct: e.pct || 0, save: e.was && e.was > e.pr ? money(e.was - e.pr) : '', timer: e.end ? cdHTML(e.end) : '', sub: C.dealT || '' });
    return '<div class="di">' + pic(p, true) + '</div><div class="deal-copy"><small>⚡ ' + (C.dealT ? esc(C.dealT) : 'عرض لفترة محدودة') + '</small><b>' + esc(p.n) + '</b>'
      + '<div class="deal-money"><span class="pr">' + money(e.pr) + '</span>' + (e.was ? '<s class="num">' + fm(e.was) + '</s>' : '') + '</div>'
      + '<div class="deal-timer">' + (e.end ? cdHTML(e.end) : '') + '</div></div>';
  }
  /* اسم العرض في البانر (خالد 2026-11-16: "الكلام لو كتير بيتقص ويجيب نقط"): مكانه ثابت (سطرين بالخط العادي علشان البانر مايتغيّرش طوله)،
     والخط بيصغر لحد ما الاسم كله يدخل. لو طويل جدًا (أصغر خط ومش داخل) بيبقى 3 أو 4 سطور بالخط الصغير، والاسم كامل في صفحة المنتج */
  function fitDeal(b) {
    if (!b || !b.isConnected) return;
    b.style.fontSize = ''; b.style.height = ''; b.style.webkitLineClamp = ''; b.style.display = '';
    var base = parseFloat(getComputedStyle(b).fontSize) || 16, H = Math.ceil(base * 1.35 * 2), f = base;
    b.style.height = H + 'px'; b.style.minHeight = '0'; b.style.display = 'block';
    for (; f >= 12; f -= 0.5) { b.style.fontSize = f + 'px'; if (b.scrollHeight <= H + 1) return; }
    b.style.display = '-webkit-box'; b.style.webkitLineClamp = String(Math.max(2, Math.floor(H / (f * 1.35))));
  }
  function dealSlideHTML(p, index, total) {
    if (p._ps) return '<button type="button" class="deal psb" data-go="' + esc(window.RdPoster.goOf(p._ps)) + '" data-deal-banner aria-live="polite" aria-label="إعلان ' + (index + 1) + ' من ' + total + '">' + dealContent(p) + '</button>';
    var pa = poster() ? window.RdPoster.attrs(C.bn, (C.shop || {}).ac) : { cls: '', style: '' };
    return '<button type="button" class="deal' + pa.cls + '"' + (pa.style ? ' style="' + esc(pa.style) + '"' : '') + ' data-p="' + esc(p.id) + '" data-deal-banner aria-live="polite" aria-label="العرض ' + (index + 1) + ' من ' + total + ': ' + esc(p.n) + '">' + dealContent(p) + '</button>';
  }
  /* خالد 2026-11-16: العروض الكتير كانت بتعمل صفين نقط. دلوقتي صف واحد، 5 نقط بالكتير بتتزحلق مع العرض، واللي على الطرف أصغر لو فيه عروض بعدها */
  var DOT_MAX = 5;
  function dotWin(dots, at) {
    var n = dots.length, from = Math.max(0, Math.min(at - Math.floor(DOT_MAX / 2), n - DOT_MAX));
    dots.forEach(function (b, i) {
      var inWin = n <= DOT_MAX || (i >= from && i < from + DOT_MAX);
      b.hidden = !inWin;
      b.classList.toggle('sm', inWin && n > DOT_MAX && ((i === from && from > 0) || (i === from + DOT_MAX - 1 && from + DOT_MAX < n)));
    });
  }
  function dealDotsHTML(total) {
    if (total < 2) return '';
    return '<div class="deal-dots" role="group" aria-label="اختيار العرض من ' + total + ' عروض">' + Array.from({ length: total }, function (_, i) {
      return '<button type="button" class="deal-dot' + (i === 0 ? ' on' : '') + '" data-deal-index="' + i + '" aria-label="العرض ' + (i + 1) + ' من ' + total + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"></button>';
    }).join('') + '</div>';
  }
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
    if (dealCampaign !== (C.deal || '')) { dealCampaign = C.deal || ''; activeDealId = ''; }
    var dealSlides = offs.filter(function (p) { return eff(p).end; }), preferredDeal = activeDealId || C.deal;
    // بوستر صورة من المحل (خالد 2026-11-21): الصور مكان عروض البانر، والدوسة بتفتح المنتج/القسم/العروض
    var psList = window.RdPoster && C.bn && window.RdPoster.imgs ? window.RdPoster.imgs(C.bn) : [];
    var psOnly = psList.length && (window.RdPoster.clean(C.bn).pm === 'only' || !dealSlides.length), hasOffSlides = dealSlides.length && !psOnly;
    if (psList.length) dealSlides = psList.map(function (x, i) { return { id: '_ps' + i, _ps: x, n: 'إعلان ' + (i + 1) }; }).concat(psOnly ? [] : dealSlides);   // الصور الأول وبعدها العروض   // خالد 2026-11-16: البانر للعروض اللي ليها مدة بس؛ اللي من غير مدة بتفضل بخصمها في مكانها وفي "العروض"
    var preferredIndex = dealSlides.findIndex(function (p) { return p.id === preferredDeal; });
    if (preferredIndex > 0) dealSlides.unshift(dealSlides.splice(preferredIndex, 1)[0]);
    var newOnes = visible().filter(function (p) { return isFresh(p) && avail(p) > 0; }).slice(0, 6);
    var s = C.svc || {}, opn = openNow();
    var html = '<header class="hd"><div class="r1"><div class="logo">' + logoHTML() + '</div><div class="nm"><b>' + esc(C.shop.name) + '</b><small' + (brCur() ? ' class="hbr"' : '') + '>' + (brCur() ? '<button type="button" class="brc" data-br aria-haspopup="dialog">📍 فرع <b>' + esc(brCur().n) + '</b> ▾</button> ' : '') + '<span class="dot' + (opn ? '' : ' off') + '"></span>' + (C.shop.area && !brCur() ? esc(C.shop.area) + ' · ' : '') + (opn ? 'مفتوح' + (hoursTxt() ? ' لحد ' + esc(hoursTxt().split('–')[1].trim()) : '') : 'مقفول دلوقتي') + '</small></div>'
      + '<div class="ic"><button data-go="#/orders" aria-label="طلباتي">📦</button><button data-go="#/cart" aria-label="السلة">🛒<i class="bdg" data-cart hidden></i></button></div></div>'
      + '<form class="srch" id="sf"><span>🔍</span><input id="sq" type="search" enterkeyhint="search" placeholder="دوّر على موبايل، جراب، اسكرينة..." autocomplete="off"></form></header>';
    if (!opn) html += '<div class="banner warn">🌙 المحل مقفول دلوقتي (' + esc(hoursTxt()) + '). اطلب عادي وطلبك هيتجهز أول ما نفتح.</div>';
    if (C.notice) html += '<div class="banner info">📣 ' + esc(C.notice) + '</div>';
    html += '<div class="chips">' + cats.map(function (c) { return '<button class="chip" data-go="#/c/' + esc(c.id) + '"><span style="--c1:' + esc(c.c1 || '#2f7cf6') + ';--c2:' + esc(c.c2 || '#5aa0ff') + '">' + esc(c.ic || '📦') + '</span>' + esc(c.n) + '</button>'; }).join('')
      + (offs.length ? '<button class="chip" data-go="#/c/_off"><span style="--c1:#d6455f;--c2:#f0753b">🔥</span>العروض</button>' : '')
      + '<button class="chip" data-go="#/svc"><span style="--c1:#e48b07;--c2:#ffc35c">🛠</span>الخدمات</button></div>';
    if (dealSlides.length) {
      html += !hasOffSlides ? '<div class="ps-gap"></div>' : '<div class="sec"><b>🔥 عروض لفترة محدودة</b><button data-go="#/c/_off">الكل ←</button></div>';
      var dealNav = dealSlides.length > 1
        ? '<button type="button" class="deal-nav prev" data-deal-step="-1" aria-label="العرض السابق">←</button><button type="button" class="deal-nav next" data-deal-step="1" aria-label="العرض التالي">→</button>'
        : '';
      html += '<div class="deal-carousel"><div class="deal-stage">' + dealSlideHTML(dealSlides[0], 0, dealSlides.length) + dealNav + '</div>' + dealDotsHTML(dealSlides.length) + '</div>';
    }
    if (newOnes.length) html += '<div class="sec"><b>✨ لسه واصل</b></div>' + gridHTML(newOnes);
    cats.slice(0, 4).forEach(function (c) { var l = sortList(visible().filter(function (p) { return p.c === c.id; })).slice(0, 4); html += '<div class="sec"><b>' + esc(c.ic || '') + ' ' + esc(c.n) + '</b><button data-go="#/c/' + esc(c.id) + '">الكل ←</button></div>' + gridHTML(l); });
    html += svcCards(s);
    html += '<div class="box" style="text-align:center;background:color-mix(in srgb,#f59e0b 9%,var(--card));border-color:color-mix(in srgb,#f59e0b 35%,var(--line))"><b style="font-size:14px;font-weight:900">🤔 مش لاقي اللي عايزه؟</b><div style="color:var(--mut);font-size:12.5px;font-weight:600;margin:4px 0 10px">اكتبلنا وهنجيبهولك ونكلمك على واتساب</div><button class="btn b1" data-go="#/wish" style="width:100%">قولّنا عايز إيه</button></div>';
    html += footHTML();
    shell(html, '#/');
    var dealBanner = app.querySelector('[data-deal-banner]');
    var refit = function () { fitDeal(dealBanner && dealBanner.querySelector('b')); };
    refit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    var dealDots = [].slice.call(app.querySelectorAll('[data-deal-index]'));
    if (dealAuto) { clearInterval(dealAuto); dealAuto = 0; }
    if (dealBanner && dealSlides.length) {
      var dealIndex = 0, swipeX = null, swallowClick = false, dealMotionTimer = 0;
      dotWin(dealDots, 0);
      var dealStage = dealBanner.parentElement;
      var clearDealMotion = function () {
        if (dealMotionTimer) { clearTimeout(dealMotionTimer); dealMotionTimer = 0; }
        dealStage.querySelectorAll('.deal-leaving').forEach(function (el) { el.remove(); });
        dealBanner.classList.remove('deal-enter-right', 'deal-enter-left');
      };
      var showDeal = function (index, direction) {
        var nextIndex = (index + dealSlides.length) % dealSlides.length;
        if (nextIndex === dealIndex) { tickTimers(); return; }
        var movingRight = direction == null ? nextIndex > dealIndex : direction > 0;
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        clearDealMotion();
        if (!reduced) {
          var leaving = dealBanner.cloneNode(true);
          leaving.removeAttribute('data-deal-banner');
          leaving.setAttribute('aria-hidden', 'true');
          leaving.tabIndex = -1;
          leaving.disabled = true;
          leaving.classList.add(movingRight ? 'deal-leave-right' : 'deal-leave-left', 'deal-leaving');
          dealStage.appendChild(leaving);
        }
        dealIndex = nextIndex;
        var p = dealSlides[dealIndex];
        activeDealId = p.id;
        if (p._ps) { delete dealBanner.dataset.p; dealBanner.dataset.go = window.RdPoster.goOf(p._ps); } else { delete dealBanner.dataset.go; dealBanner.dataset.p = p.id; }
        // الصورة والعرض شكلهم مختلف: الكلاس والألوان بتاعة الشريحة دي
        var sa = p._ps ? { cls: ' psb', style: '' } : poster() ? window.RdPoster.attrs(C.bn, (C.shop || {}).ac) : { cls: '', style: '' };
        dealBanner.className = 'deal' + sa.cls; if (sa.style) dealBanner.setAttribute('style', sa.style); else dealBanner.removeAttribute('style');
        dealBanner.setAttribute('aria-label', 'العرض ' + (dealIndex + 1) + ' من ' + dealSlides.length + ': ' + p.n);
        dealBanner.innerHTML = dealContent(p); refit();
        if (!reduced) {
          dealBanner.classList.add(movingRight ? 'deal-enter-left' : 'deal-enter-right');
          dealMotionTimer = setTimeout(clearDealMotion, 430);
        }
        dealDots.forEach(function (b, i) { b.classList.toggle('on', i === dealIndex); b.setAttribute('aria-pressed', String(i === dealIndex)); });
        dotWin(dealDots, dealIndex);
        tickTimers();
      };
      dealDots.forEach(function (b) { b.onclick = function () { var target = +b.dataset.dealIndex; showDeal(target, target > dealIndex ? 1 : -1); }; });
      [].slice.call(app.querySelectorAll('[data-deal-step]')).forEach(function (b) {
        b.onclick = function () { var step = +b.dataset.dealStep; showDeal(dealIndex + step, step); };
      });
      if (dealSlides.length > 1) {
        dealBanner.addEventListener('pointerdown', function (e) {
          if (e.isPrimary === false || (e.button != null && e.button !== 0)) return;
          swipeX = e.clientX;
          if (dealBanner.setPointerCapture && e.pointerId != null) try { dealBanner.setPointerCapture(e.pointerId); } catch (_) {}
        });
        dealBanner.addEventListener('pointerup', function (e) {
          if (swipeX === null) return;
          var dx = e.clientX - swipeX; swipeX = null;
          if (Math.abs(dx) < 45) return;
          e.preventDefault(); swallowClick = true;
          showDeal(dealIndex + (dx > 0 ? 1 : -1), dx > 0 ? 1 : -1);
          setTimeout(function () { swallowClick = false; }, 0);
        });
        dealBanner.addEventListener('pointercancel', function () { swipeX = null; });
        // بيقلب لوحده كل 5 ثواني (خالد 2026-11-20: "البانر مش بيتحرك لوحده يوريني باقي العروض")؛
        // بيقف والماوس عليه أو وانت بتلمسه أو الزرار عليه focus أو الصفحة مش قدامك، وبيبدأ العدّ من الأول بعد أي سحب/دوسة
        var held = false, lastMove = Date.now(), hold = function (v) { return function () { held = v; lastMove = Date.now(); }; };
        dealStage.addEventListener('pointerenter', hold(true)); dealStage.addEventListener('pointerleave', hold(false));
        dealStage.addEventListener('focusin', hold(true)); dealStage.addEventListener('focusout', hold(false));
        dealStage.addEventListener('touchstart', hold(true), { passive: true }); dealStage.addEventListener('touchend', hold(false), { passive: true });
        dealDots.forEach(function (b) { b.addEventListener('click', function () { lastMove = Date.now(); }); });
        dealAuto = setInterval(function () {
          if (!dealBanner.isConnected) { clearInterval(dealAuto); dealAuto = 0; return; }
          if (held || document.hidden || Date.now() - lastMove < 5000) return;
          lastMove = Date.now(); showDeal(dealIndex + 1, 1);
        }, 1000);
        dealBanner.addEventListener('click', function (e) {
          if (!swallowClick) return;
          e.preventDefault(); e.stopImmediatePropagation(); swallowClick = false;
        }, true);
      }
    }
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
      + legalTxt() + '<a href="#/info">الشروط والاسترجاع والضمان</a> · <a href="#/privacy">الخصوصية</a><br><span class="made">متجر بيشتغل بـ Repair Desk</span></div>';
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
    shell(html, id === '_off' ? '#/c/_off' : '#/cats');
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

  /* منتجات مشابهة تحت صفحة المنتج، صف بيتسحب للشمال زي أمازون (خالد 2026-11-21). نفس القسم والنوع والماركة وكلام في الاسم وسعر قريب */
  function similar(p) {
    var words = norm(p.n).split(' ').filter(function (w) { return w.length >= 3; }), pr = eff(p).pr || 0;
    var scored = visible().filter(function (x) { return x.id !== p.id; }).map(function (x) {
      var sc = (x.c === p.c ? 3 : 0) + (p.s && x.s === p.s ? 3 : 0) + (p.b && x.b && norm(x.b) === norm(p.b) ? 2 : 0), xn = norm(x.n), xp = eff(x).pr || 0, k = 0;
      words.forEach(function (w) { if (k < 3 && xn.indexOf(w) >= 0) { sc++; k++; } });
      if (pr && xp && xp >= pr / 2 && xp <= pr * 2) sc++;
      return { x: x, sc: sc - (avail(x) <= 0 ? 2 : 0) };
    }).sort(function (a, b) { return b.sc - a.sc; });
    /* المشابه الأول (نفس القسم/النوع/الماركة/الاسم)، ولو قليل (محل فيه منتجات قليلة) بيكمّل بباقي المنتجات: العروض الأول وبعدين السعر الأقرب
       (خالد 2026-11-21: "ليه مش شايف الأصناف المشابهة" — متجره كل منتج في قسم لوحده فماكانش بيطلع حاجة) */
    var sim = scored.filter(function (o) { return o.sc >= 3; }).map(function (o) { return o.x; });
    if (sim.length < 6) sim = sim.concat(scored.filter(function (o) { return o.sc < 3 && avail(o.x) > 0; }).map(function (o) { return o.x; })
      .sort(function (a, b) { var ea = eff(a), eb = eff(b); return (eb.pct ? 1 : 0) - (ea.pct ? 1 : 0) || Math.abs((ea.pr || 0) - pr) - Math.abs((eb.pr || 0) - pr); }));
    return sim.slice(0, 12);
  }
  function simHTML(p) {
    var list = similar(p); if (list.length < 2) return '';
    return '<div class="simw"><div class="sec"><b>ممكن يعجبك كمان</b></div><div class="sim">' + list.map(function (x) {
      var e = eff(x), so = avail(x) <= 0;
      return '<div class="sc' + (so ? ' soldout' : '') + '" data-p="' + esc(x.id) + '"><div class="img">' + pic(x) + '</div>' + (e.pct && !so ? '<span class="sc-off">−' + e.pct + '%</span>' : '')
        + '<div class="nm">' + esc(x.n) + '</div><div class="pr">' + (x.ask ? '<span class="ask">💬 اسأل</span>' : so ? '<span class="out">هيتوفر قريب</span>' : '<strong class="num">' + fm(e.pr) + '</strong>' + (e.was ? '<s class="num">' + fm(e.was) + '</s>' : '')) + '</div>'
        + (!x.ask && !so && !(x.add && x.add.length) ? '<button class="sc-add" data-add="' + esc(x.id) + '" aria-label="ضيف للسلة">+</button>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  function product(id) {
    var p = P[id]; if (!p) return go('#/');
    var e = eff(p), q = avail(p), so = q <= 0, sel = [], n = 1;
    var imgs = (p.img || []).length ? p.img : [''];
    var spec = p.spec || {};
    var specs = [spec.storage && ['💾', spec.storage], spec.ram && ['⚡', spec.ram + ' رام'], spec.batt && ['🔋', 'بطارية ' + spec.batt + '%'], spec.cond && ['✨', spec.cond], p.st === 'new' && ['📦', 'جديد متبرشم'], p.st === 'used' && !spec.cond && ['♻️', 'مستعمل']].filter(Boolean);
    var html = '<div class="gal"><div class="track">' + imgs.map(function (x) { return '<div>' + (x ? '<img src="' + esc(img(x)) + '" alt="">' : esc(iconOf(p))) + '</div>'; }).join('') + '</div>'
      + (imgs.length > 1 ? '<div class="dots">' + imgs.map(function (x, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div>' : '')
      + '<div class="fl"><button data-back aria-label="رجوع">→</button><span class="fl-r"><button data-fav aria-label="المفضلة" class="' + (isFav(p.id) ? 'on' : '') + '">' + (isFav(p.id) ? '❤️' : '🤍') + '</button><button data-share aria-label="شارك">↗</button></span></div></div>'
      + '<div class="pb"><h1>' + esc(p.n) + '</h1><div class="sub">' + esc([p.b, (catOf(p.c) || {}).n, (p.m || []).slice(0, 3).join('، ')].filter(Boolean).join(' · ')) + '</div>' + revLine(p.id)
      + (p.ask ? '<span class="ask" style="font-size:14px;padding:6px 14px">💬 اسأل على السعر</span>' : '<div class="bigpr"><strong>' + money(e.pr) + '</strong>' + (e.was ? '<s class="num">' + fm(e.was) + '</s><span class="save">وفّر <span class="num">' + fm(e.was - e.pr) + '</span></span>' : '') + '</div>')
      // العرض والكمية القليلة في سطر واحد (كانوا كارتين أصفر ورا بعض، مراجعة التصميم 2026-11-21)
      + (so ? '<div class="timer" style="background:var(--badbg);color:var(--badc)"><span>😕 خلص من المحل</span><span>بلّغني لما يرجع ↓</span></div>'
        : (e.end && !p.ask) || (q <= 3 && !p.hq) ? '<div class="timer">' + (e.end && !p.ask ? '<span>⏳ العرض بيخلص بعد <b data-end="' + esc(e.end) + '"></b></span>' : '') + (q <= 3 && !p.hq ? '<span class="tm-low">🔥 فاضل <span class="num">' + q + '</span> بس</span>' : '') + '</div>' : '')
      + (specs.length ? '<div class="feat">' + specs.map(function (s) { return '<span><em>' + s[0] + '</em>' + esc(s[1]) + '</span>'; }).join('') + '</div>' : '')
      + '<div class="feat">' + (p.w ? '<span><em>🛡</em>ضمان ' + esc(p.w) + '</span>' : '') + (p.sw ? '<span><em>🔁</em>تبديل ' + esc(p.sw) + ' أيام</span>' : '') + '<span><em>🚚</em>' + (delFreeTxt() || 'توصيل لحد البيت') + '</span>' + (C.del && C.del.pickup !== false ? '<span><em>🏪</em>أو استلم من المحل</span>' : '') + '</div>'
      + (p.d ? '<div class="desc">' + esc(p.d) + '</div>' : '') + revSection(p.id)
      + (!p.ask && !so && (p.add || []).length ? '<div class="addon"><b>➕ ضيف معاه</b>' + p.add.map(function (a, i) { return '<label><span><input type="checkbox" data-ai="' + i + '"><i class="ck">✓</i>' + esc(a.n) + '</span><span class="num">+ ' + fm(a.p) + '</span></label>'; }).join('') + '</div>' : '')
      + (!p.ask && !so ? '<div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0"><b style="font-weight:900">الكمية</b><span class="qty"><button data-q="-1">−</button><b class="num" id="pq">1</b><button data-q="1">+</button></span></div>' : '')
      + simHTML(p) + '</div>';
    var waTxt = 'السلام عليكم، عايز أسأل على: ' + p.n + ' — ' + location.href;
    html += '<div class="cta">' + (waLink() ? '<a class="btn bw" href="' + esc(waLink(waTxt)) + '" target="_blank" rel="noopener" aria-label="اسأل على واتساب">' + WA_SVG.replace('<svg', '<svg style="width:22px;height:22px"') + '</a>' : '')
      + (p.ask ? '<a class="btn b1" href="' + esc(waLink(waTxt)) + '" target="_blank" rel="noopener">💬 اسأل على السعر</a>' : so ? '<button class="btn b1" id="notify">🔔 بلّغني لما يتوفر</button>' : '<button class="btn bs" id="buy"><span>🛒 ضيف <span id="pn" class="num"></span>للسلة</span></button><button class="btn b1" id="buynow"><span>⚡ اشتري · <span id="ptot" class="num"></span></span></button>') + '</div>';
    shell(html, '', true);
    var upd = function () { var t = n * (e.pr + sel.reduce(function (a, i) { return a + (+p.add[i].p || 0); }, 0)); var el = document.getElementById('ptot'); if (el) el.textContent = fm(t); var pn = document.getElementById('pn'); if (pn) pn.textContent = n > 1 ? n + ' ' : ''; };   // "ضيف 2 للسلة · 12,820": المبلغ مايتلخبطش مع سعر القطعة (مراجعة 2026-11-21)
    upd();
    app.querySelectorAll('[data-ai]').forEach(function (c) { c.onchange = function () { var i = +c.dataset.ai; sel = c.checked ? sel.concat(i) : sel.filter(function (x) { return x !== i; }); upd(); }; });
    app.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { n = Math.max(1, Math.min(Math.min(20, q), n + +b.dataset.q)); document.getElementById('pq').textContent = n; upd(); }; });
    var buy = document.getElementById('buy'); if (buy) buy.onclick = function () { addToCart(p.id, n, sel); };
    // "اشتري" (خالد 2026-11-21: "للعميل اللي داخل عايز حاجة معينة، توفير خطوات"): على طول لإتمام الطلب. لو نفس الحاجة في السلة مابتتضافش تاني
    var bn = document.getElementById('buynow'); if (bn) bn.onclick = function () {
      // ذكي (خالد 2026-11-21): لو في السلة حاجات تانية بيفتح السلة يشوف كله، ولو الحاجة دي بس على طول لإتمام الطلب
      var k = p.id + '|' + sel.slice().sort().join(','), inC = cart().filter(function (x) { return x.k === k; })[0], others = cart().some(function (x) { return x.k !== k; });
      var to = others ? '#/cart' : '#/checkout';
      if (inC) { if (inC.q < n) { var c = cart(); c.forEach(function (x) { if (x.k === k) x.q = Math.min(n, avail(p)); }); setCart(c); } return go(to); }
      var a = sel.slice(); a.quiet = !others; if (addToCart(p.id, n, a)) go(to);
    };
    var nt = document.getElementById('notify'); if (nt) nt.onclick = function () { go('#/wish?p=' + encodeURIComponent(p.id)); };
    var tr = app.querySelector('.gal .track'), dots = app.querySelectorAll('.gal .dots i');
    if (tr && dots.length) tr.onscroll = function () { var i = Math.round(Math.abs(tr.scrollLeft) / tr.clientWidth); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); };
    var real = imgs.filter(Boolean);
    if (tr && real.length) tr.querySelectorAll('img').forEach(function (im, i) { im.style.cursor = 'zoom-in'; im.onclick = function () { viewer(real.map(img), i, p.n, galAt); }; });
    /* الصورة رقم k في المعرض (بعد ما المعرض يروح لها) علشان الصورة تطير منها وترجعلها */
    function galAt(k) { var ims = tr.querySelectorAll('img'), el = ims[k]; if (!el) return null; var a = tr.getBoundingClientRect(), b = el.parentNode.getBoundingClientRect(); if (Math.abs(b.left - a.left) > 1) tr.scrollBy({ left: b.left - a.left, behavior: 'instant' }); return el; }
    var rl = app.querySelector('[data-rev]'); if (rl) rl.onclick = function () { var el = document.getElementById('revs'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    var ra = document.getElementById('rv-all'); if (ra) ra.onclick = function () { document.getElementById('rv-more').hidden = false; ra.remove(); };
    var fb = app.querySelector('[data-fav]'); if (fb) fb.onclick = function () { var on = toggleFav(p.id); fb.classList.toggle('on', on); fb.textContent = on ? '❤️' : '🤍'; fb.animate && fb.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300 }); };
    app.querySelector('[data-share]').onclick = function () { var u = location.href; if (navigator.share) navigator.share({ title: p.n, text: p.n + ' — ' + C.shop.name, url: u }).catch(function () {}); else { copy(u); toast('اتنسخ اللينك', 'ok'); } };
  }
  /* عرض الصور كاملة (خالد 2026-11-16: "الصورة اللي جوه تفاصيل المنتج مش بتفتح"): شاشة سودا، سحب بين الصور، عدّاد،
     صور صغيرة تحت، أسهم وEsc على الكمبيوتر، دوستين = تكبير، وزرار الرجوع في الموبايل بيقفلها بس (pushState من غير تغيير اللينك) */
  /* حركة الصورة (خالد 2026-11-16: "الصورة تنط من مكانها بانميشن واما اخرج ترجع مكانها"): صورة طايرة فوق كل حاجة
     من مكان الصورة الحقيقي (جوه object-fit: contain) لمكانها الجديد، وبعدين الصورة الحقيقية بتظهر */
  var noMotion = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function picBox(im) {
    var r = im.getBoundingClientRect(), nw = im.naturalWidth, nh = im.naturalHeight;
    if (!nw || !nh || !r.width || !r.height) return null;
    var k = Math.min(r.width / nw, r.height / nh), w = nw * k, h = nh * k;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }
  /* host: لو اتدّى، الصورة بتطير جوه المعرض نفسه (تحت ورقة الزجاج) بدل ما تبقى فوق كل حاجة —
     خالد 2026-11-16: "الجزء اللي فيه اسم الجهاز والسعر بيختفي ويظهر فجأة وانا بقفل الصورة" (الصورة الطايرة كانت بتغطيه) */
  function flyPic(src, a, b, ms, done, host) {
    var f = document.createElement('img'); f.className = 'lbx-fly' + (host ? ' in-gal' : ''); f.src = src; f.alt = '';
    var o = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
    f.style.cssText = 'left:' + (b.left - o.left) + 'px;top:' + (b.top - o.top) + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
    (host || document.body).appendChild(f);
    var an = f.animate([{ transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')' }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.9,.25,1)' });
    var end = function () { if (!f.isConnected) return; f.remove(); if (done) done(); };
    an.onfinish = end; setTimeout(end, ms + 200);
  }
  function viewer(list, start, title, from) {
    if (!list.length || document.querySelector('.lbx')) return;
    var cur = start || 0, many = list.length > 1;
    var v = document.createElement('div'); v.className = 'lbx'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', title || 'الصور');
    v.innerHTML = '<div class="lbx-top"><span class="lbx-n num">' + (many ? (cur + 1) + ' / ' + list.length : '') + '</span><button class="lbx-x" aria-label="اقفل">✕</button></div>'
      + '<div class="lbx-t">' + list.map(function (u) { return '<div class="lbx-s"><img src="' + esc(u) + '" alt="" draggable="false"></div>'; }).join('') + '</div>'
      + (many ? '<button class="lbx-nav prev" aria-label="اللي قبلها">›</button><button class="lbx-nav next" aria-label="اللي بعدها">‹</button>'
        + '<div class="lbx-th">' + list.map(function (u, i) { return '<button data-i="' + i + '" aria-label="صورة ' + (i + 1) + '"><img src="' + esc(u) + '" alt=""></button>'; }).join('') + '</div>' : '');
    document.body.appendChild(v); document.documentElement.classList.add('lbx-on');
    var t = v.querySelector('.lbx-t'), sl = v.querySelectorAll('.lbx-s'), th = v.querySelectorAll('.lbx-th button'), n = v.querySelector('.lbx-n');
    // الحساب بالبكسل على الشاشة (scrollBy) علشان يشتغل مع الاتجاه العربي، ومن غير scrollIntoView اللي ممكن يحرّك الصفحة اللي ورا
    var center = function (box, el, smooth) { var a = box.getBoundingClientRect(), b = el.getBoundingClientRect(); box.scrollBy({ left: (b.left + b.width / 2) - (a.left + a.width / 2), behavior: smooth ? 'smooth' : 'instant' }); };
    var mark = function () { if (n && many) n.textContent = (cur + 1) + ' / ' + list.length; th.forEach(function (b, i) { b.classList.toggle('on', i === cur); if (i === cur) center(b.parentNode, b, true); }); };
    var to = function (i, smooth) { cur = (i + list.length) % list.length; sl.forEach(function (s) { s.classList.remove('z'); }); center(t, sl[cur], smooth); mark(); };
    markLoading(v);
    requestAnimationFrame(function () {
      to(cur, false); v.classList.add('in');
      // طيران من المعرض للشاشة الكاملة
      var src = from && from(cur), im = sl[cur].querySelector('img'), a = src && picBox(src), b = a && picBox(im);
      if (a && b && !noMotion()) { im.style.visibility = 'hidden'; src.style.visibility = 'hidden'; flyPic(list[cur], a, b, 380, function () { im.style.visibility = ''; src.style.visibility = ''; }); }
    });
    var st; t.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { var w = t.clientWidth || 1, i = Math.round(Math.abs(t.scrollLeft) / w); if (i !== cur && sl[i]) { sl[cur].classList.remove('z'); cur = i; mark(); } }, 80); }, { passive: true });
    var gone = false;
    var shut = function () {
      if (gone) return; gone = true;
      document.removeEventListener('keydown', key); window.removeEventListener('popstate', pop);
      var end = function () { document.documentElement.classList.remove('lbx-on'); v.remove(); };
      // الرجوع: الصورة بتطير لمكانها في المعرض (المعرض بيروح للصورة اللي كنت عليها)
      var s = sl[cur], im = s && !s.classList.contains('z') && s.querySelector('img'), a = im && picBox(im), dst = a && from && from(cur), b = dst && picBox(dst);
      v.classList.remove('in'); v.style.pointerEvents = 'none';
      if (a && b && !noMotion()) { v.classList.add('out'); im.style.visibility = 'hidden'; dst.style.visibility = 'hidden'; flyPic(list[cur], a, b, 380, function () { dst.style.visibility = ''; }, dst.closest('.gal')); setTimeout(end, 160); }
      else setTimeout(end, noMotion() ? 0 : 200);
    };
    var pop = function () { shut(); };
    var close = function () { if (history.state && history.state.lbx) history.back(); else shut(); };
    var key = function (e) { if (e.key === 'Escape') close(); else if (many && e.key === 'ArrowLeft') to(cur + 1, true); else if (many && e.key === 'ArrowRight') to(cur - 1, true); };
    try { history.pushState(Object.assign({}, history.state || {}, { lbx: 1 }), ''); window.addEventListener('popstate', pop); } catch (e) {}
    document.addEventListener('keydown', key);
    v.querySelector('.lbx-x').onclick = close;
    v.querySelectorAll('.lbx-nav').forEach(function (b) { b.onclick = function () { to(cur + (b.classList.contains('next') ? 1 : -1), true); }; });
    th.forEach(function (b) { b.onclick = function () { to(+b.dataset.i, true); }; });
    // دوسة على الفاضي حوالين الصورة بتقفل، ودوستين على الصورة بيكبّروها (والسحب جوه الصورة المكبّرة بيحرّكها)
    sl.forEach(function (s) {
      s.addEventListener('click', function (e) { if (e.target === s && !s.classList.contains('z')) close(); });
      s.addEventListener('dblclick', function (e) {
        var im = s.querySelector('img'), r = im.getBoundingClientRect(), fx = (e.clientX - r.left) / (r.width || 1), fy = (e.clientY - r.top) / (r.height || 1);
        s.classList.toggle('z');
        if (s.classList.contains('z')) requestAnimationFrame(function () { var a = s.getBoundingClientRect(), b = im.getBoundingClientRect(); s.scrollBy({ left: b.left + fx * b.width - (a.left + a.width / 2), top: b.top + fy * b.height - (a.top + a.height / 2), behavior: 'instant' }); });
      });
    });
  }
  function delFreeTxt() { var d = C.del || {}, z = (d.zones || [])[0]; if (z && !(+z.fee)) return 'توصيل ببلاش لحد ' + z.km + ' كم'; if (+d.freeOver) return 'ببلاش فوق ' + fm(d.freeOver); return ''; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } }

  /* عيب اتلقى 2026-11-17: لو الكمية قلّت أو المنتج خلص بعد ما العميل حطه في السلة، السلة كانت بتسيبه يكمّل والسيرفر يرفض الطلب في الآخر.
     دلوقتي السلة بتتظبط على المتاح لوحدها وبتقوله */
  function fitCart() {
    var c = ls('cart') || [], used = {}, changed = false;
    c = c.filter(function (x) {
      var p = P[x.id]; if (!p || p.ask) return true;   // cart() بيخبّيهم أصلًا
      var left = avail(p) - (used[x.id] || 0); if (left <= 0) { changed = true; return false; }
      if (x.q > left) { x.q = left; changed = true; } used[x.id] = (used[x.id] || 0) + x.q; return true;
    });
    if (changed) { setCart(c); FIT = true; } return changed;
  }
  var FIT = false;
  function cartPage() {
    fitCart(); var fixedQ = FIT; FIT = false;
    var c = cart();
    if (!c.length) return shell(barHTML('🛒 السلة') + '<div class="empty"><div class="e">🛒</div><b>السلة فاضية</b><p>شوف العروض والمنتجات وضيف اللي يعجبك.</p><button class="btn b1" data-go="#/">تسوّق دلوقتي</button></div>', '#/cart');
    var sub = c.reduce(function (a, x) { return a + lineTotal(x); }, 0);
    // .main / .side: على الكمبيوتر المنتجات يمين والحساب وزرار الطلب شمال (خالد 2026-11-13). على الموبايل display: contents (زي ما هي)
    var html = barHTML('🛒 السلة', '<span class="num">' + cartCount() + '</span> قطعة') + '<div class="main"><div class="box">' + c.map(function (x) {
      var p = P[x.id], adds = (x.add || []).map(function (i) { return (p.add || [])[i]; }).filter(Boolean);
      return '<div class="ci"><div class="im" data-p="' + esc(p.id) + '">' + pic(p) + '</div><div class="t"><b>' + esc(p.n) + '</b>' + (adds.length ? '<small>+ ' + esc(adds.map(function (a) { return a.n; }).join('، ')) + '</small>' : '') + '<strong>' + money(lineTotal(x)) + '</strong></div><span class="qty"><button data-k="' + esc(x.k) + '" data-d="-1">' + (x.q === 1 ? '🗑' : '−') + '</button><b class="num">' + x.q + '</b><button data-k="' + esc(x.k) + '" data-d="1">+</button></span></div>';
    }).join('') + '</div>';
    if (fixedQ) html += '<div class="banner warn">⚠ فيه حاجات خلصت أو الكمية المتاحة منها قلّت، فالسلة اتظبطت على المتاح.</div>';
    var d = C.del || {}; if (+d.freeOver && sub < +d.freeOver) html += '<div class="banner info">🚚 ضيف بـ ' + money(d.freeOver - sub) + ' كمان والتوصيل يبقى ببلاش</div>';
    html += '</div><div class="side"><div class="box sum"><div><span>المجموع</span><span>' + money(sub) + '</span></div><div><span>التوصيل</span><span>بيتحسب في الخطوة الجاية</span></div></div>';
    html += '<div class="cta"><button class="btn b1" data-go="#/checkout">كمّل الطلب · <span class="num">' + fm(sub) + '</span></button></div></div>';
    shell(html, '#/cart', true);
    app.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { var cc = cart(), x = cc.filter(function (y) { return y.k === b.dataset.k; })[0]; if (!x) return; var nq = x.q + +b.dataset.d; if (nq > 0 && nq + cc.filter(function (y) { return y.id === x.id && y !== x; }).reduce(function (a, y) { return a + y.q; }, 0) > avail(P[x.id])) return toast(limMsg(P[x.id]), 'bad'); if (nq <= 0) cc.splice(cc.indexOf(x), 1); else x.q = nq; setCart(cc); cartPage(); }; });
  }

  /* ---------- إتمام الطلب (منتجات / فاتورة / صيانة / مش لاقي / بدّل) ---------- */
  function me() { var m = ls('me') || {}, A = acct(); if (A) { if (!m.phone) m.phone = A.me.phone; if (!m.name && A.me.name) m.name = A.me.name; } return m; }
  function custBox(o) {
    var m = me(); o = o || {};
    var A = acct(), ad = A && !o.noAddr ? (A.me.addrs || []) : [];
    return '<div class="box"><h4>👤 بياناتك <small>' + (A ? '✓ داخل بحسابك' : 'مش محتاج حساب') + '</small></h4>'
      + (ad.length ? '<div class="pills ad-pick">' + ad.map(function (a, i) { return '<button type="button" data-ad="' + i + '">📍 ' + esc(a.label || 'عنوان') + '</button>'; }).join('') + '</div>' : '')
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
    var get = function () { return loc; }; get.set = function (ll) { set(ll, true); }; return get;
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
  /* تأكيد رقم العميل بواتساب (خالد 2026-11-13، فكرة 2: نافذة من تحت، memory phone-verify).
     بس لو المحل مشغّله (C.vf = رقم واتساب المحل المربوط بالكاشير)، وبس للطلب اللي الوهمي فيه بيكلّف: منتجات كاش، وصيانة من البيت.
     العميل بيبعت الكود من واتساب لرقم المحل، والكاشير بيأكد، والموبايل ده بياخد علامة 90 يوم. من غير تأكيد الطلب بيدخل عادي بعلامة "مش متأكد" */
  var digits10 = function (p) { return String(p || '').replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }).replace(/\D/g, '').slice(-10); };
  function needVf(body) { return !!C.vf && ((body.kind === 'order' && body.pay === 'cash') || (body.kind === 'repair' && body.repair && body.repair.mode === 'home')); }
  function vfSaved(phone) { var v = ls('vf'); return v && v.tok && digits10(v.phone) === digits10(phone) && Date.parse(v.until) > Date.now() ? v.tok : ''; }
  /* المحل هو اللي بيبعت الكود على واتساب والعميل بيكتبه (خالد 2026-11-21: "إحنا اللي نبعت الكود للعميل وهو يدخله").
     العميل الجديد اللي عمره ما كلّم المحل كان رقمه مابيبانش في رسالته فماكانش بيدخل. خانة لكل رقم (أفكار تطبيق وصلة): الأرقام العربي واللصق
     بيتوزّعوا لوحدهم، Backspace بيرجع، وآخر رقم بيأكد لوحده، وعدّاد قبل "ابعت تاني" */
  function verifyPhone(phone, opts) {
    opts = opts || {};
    return new Promise(function (done) {
      var finished = false, id = '', sheet = null, dim = null, cdT = null, skipT = null, busy = false;
      var end = function (tok) { if (finished) return; finished = true; clearInterval(cdT); clearTimeout(skipT); if (sheet) { sheet.classList.remove('on'); dim.classList.remove('on'); setTimeout(function () { sheet.remove(); dim.remove(); }, 260); } done(tok === null ? null : (tok || '')); };
      var B = function () { return sheet.querySelector('.vf-b'); };
      var skipBtn = function (show) { return '<button class="vf-skip" id="vf-skip"' + (show ? '' : ' hidden') + '>' + (opts.login ? 'مش دلوقتي' : 'الكود مش واصل؟ كمّل والمحل هيكلمك يأكد') + '</button>'; };
      var bindSkip = function () { var k = sheet.querySelector('#vf-skip'); if (k) k.onclick = function () { end(''); }; };
      var paintMsg = function (h, sub, again) {
        B().innerHTML = '<h3>' + h + '</h3><div class="vf-sub">' + sub + '</div>' + (again ? '<button class="btn bg" id="vf-again">🔄 ابعتلي كود جديد</button>' : '') + skipBtn(true);
        var a = sheet.querySelector('#vf-again'); if (a) a.onclick = start; bindSkip();
      };
      var paintOk = function () { B().innerHTML = '<div class="vf-ok">✓</div><h3>' + (opts.login ? 'دخلت ✓' : 'رقمك اتأكد') + '</h3><div class="vf-sub">مش هتحتاجها تاني من الموبايل ده</div>'; };
      var paintCode = function () {
        B().innerHTML = '<h3>' + (opts.login ? '📲 ادخل بكود واتساب' : '📲 خطوة أخيرة: أكّد رقمك') + '</h3>'
          + '<div class="vf-sub">بعتنالك كود على واتساب على رقم <b class="num" dir="ltr">' + esc(phone) + '</b></div>'
          + '<div class="vf-otp" dir="ltr">' + [0, 1, 2, 3].map(function (k) { return '<input class="num" inputmode="numeric" autocomplete="' + (k ? 'off' : 'one-time-code') + '" maxlength="4" aria-label="رقم ' + (k + 1) + '">'; }).join('') + '</div>'
          + '<div class="vf-err" id="vf-err" role="alert"></div>'
          + '<div class="vf-wait" id="vf-busy" hidden><span class="vf-sp"></span>بنتأكد...</div>'
          + '<button class="vf-re" id="vf-re" disabled>ابعت الكود تاني بعد <span class="num" id="vf-cd">0:45</span></button>'
          + skipBtn(false);
        var ins = [].slice.call(sheet.querySelectorAll('.vf-otp input')), err = sheet.querySelector('#vf-err');
        var digits = function (t) { return String(t || '').replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }).replace(/\D/g, ''); };
        var submit = function (c) {
          busy = true; sheet.querySelector('#vf-busy').hidden = false; ins.forEach(function (x) { x.disabled = true; });
          gw({ action: 'store-vtype', id: id, code: c }).then(function (r) {
            busy = false; if (finished) return;
            if (r && r.ok && r.tok) { clearInterval(cdT); ls('vf', { phone: r.phone || phone, tok: r.tok, until: r.until }); paintOk(); setTimeout(function () { end(r.tok); }, 900); return; }
            if (r && r.again) { clearInterval(cdT); return paintMsg('⏱ ' + esc(r.error || 'الكود خلص'), 'اطلب كود جديد، أو كمّل والمحل هيكلمك يأكد', true); }
            sheet.querySelector('#vf-busy').hidden = true; ins.forEach(function (x) { x.disabled = false; x.value = ''; }); ins[0].focus();
            var o = sheet.querySelector('.vf-otp'); o.classList.remove('bad'); void o.offsetWidth; o.classList.add('bad');
            err.textContent = (r && r.error ? r.error : 'مفيش نت. جرّب تاني') + (r && r.left != null ? ' · فاضلك ' + r.left + (r.left === 1 ? ' محاولة' : ' محاولات') : '');
          });
        };
        var check = function () { var c = ins.map(function (x) { return x.value; }).join(''); if (c.length === 4 && !busy) submit(c); };
        var fill = function (from, t) { var d = digits(t); for (var k = 0; k < d.length && from + k < 4; k++) ins[from + k].value = d[k]; ins[Math.min(3, from + d.length)].focus(); check(); };
        ins.forEach(function (x, k) {
          x.oninput = function () { var v = digits(x.value); if (v.length > 1) { x.value = ''; fill(k, v); return; } x.value = v; err.textContent = ''; sheet.querySelector('.vf-otp').classList.remove('bad'); if (v && k < 3) ins[k + 1].focus(); check(); };
          x.onkeydown = function (e) { if (e.key === 'Backspace' && !x.value && k > 0) { ins[k - 1].value = ''; ins[k - 1].focus(); e.preventDefault(); } };
          x.onpaste = function (e) { var t = (e.clipboardData || window.clipboardData).getData('text'); if (digits(t)) { e.preventDefault(); fill(k, t); } };
          x.onfocus = function () { x.select(); };
        });
        setTimeout(function () { if (!finished && ins[0]) ins[0].focus(); }, 300);
        // عدّاد "ابعت تاني" (45 ثانية)، وزرار "كمّل من غير تأكيد" بعد 25 ثانية
        var left = 45, re = sheet.querySelector('#vf-re');
        clearInterval(cdT); cdT = setInterval(function () { left--; var cd = sheet.querySelector('#vf-cd'); if (left <= 0) { clearInterval(cdT); re.disabled = false; re.textContent = '🔄 ابعت الكود تاني'; } else if (cd) cd.textContent = '0:' + String(left).padStart(2, '0'); }, 1000);
        re.onclick = function () { if (!re.disabled) start(); };
        clearTimeout(skipT); skipT = setTimeout(function () { var k = sheet.querySelector('#vf-skip'); if (k) k.hidden = false; }, window.__vfSkipMs || 25000);
        bindSkip();
      };
      var start = function () {
        clearInterval(cdT);
        B().innerHTML = '<div class="vf-wait"><span class="vf-sp"></span>بنبعتلك الكود على واتساب...</div>';
        gw({ action: 'store-vstart', slug: slug, phone: phone, send: true }).then(function (r) {
          if (finished) return;
          if (r && r.ok) { id = r.id; return paintCode(); }
          if (r && r.field === 'phone') { toast(r.error, 'bad'); return end(null); }
          if (r && r.closed) return paintMsg('🕘 المحل مقفول دلوقتي', esc(r.error) + (opts.login ? '' : ' تقدر تكمّل والمحل هيكلمك يأكد.'), false);
          if (r && r.error && /محاولات|ضغط/.test(r.error)) return paintMsg('⏳ استنى شوية', esc(r.error), false);
          end('');   // التأكيد مش متاح (السيرفر): الطلب يدخل بعلامة "مش متأكد"، مانوقفش العميل
        });
      };
      dim = document.createElement('div'); dim.className = 'vf-dim'; dim.onclick = function () { end(null); };
      sheet = document.createElement('div'); sheet.className = 'vf-sheet'; sheet.setAttribute('role', 'dialog');
      sheet.innerHTML = '<div class="vf-gr"></div><button class="vf-x" aria-label="اقفل">✕</button><div class="vf-b"></div>';
      sheet.querySelector('.vf-x').onclick = function () { end(null); };
      document.body.appendChild(dim); document.body.appendChild(sheet);
      requestAnimationFrame(function () { dim.classList.add('on'); sheet.classList.add('on'); });
      start();
    });
  }
  function submitOrder(body, btn) {
    var A = acct(); if (A && body.cust && digits10(body.cust.phone) === digits10(A.me.phone)) body.stok = A.stok;   // داخل بحسابه بنفس الرقم: الرقم متأكد
    if (needVf(body) && !body.vtok && !body.stok) {
      var saved = vfSaved(body.cust && body.cust.phone);
      if (saved) body.vtok = saved;
      else return verifyPhone(body.cust.phone).then(function (tok) { if (tok === null) return null; body.vtok = tok || undefined; return submitOrder(Object.assign(body, { vtok: tok || '-' }), btn); });   // null = قفل النافذة (مايبعتش)، '' = كمّل من غير تأكيد
    }
    if (body.vtok === '-') delete body.vtok;
    btn.disabled = true; var old = btn.innerHTML; btn.innerHTML = '⏳ بنبعت الطلب...';
    return gw(Object.assign({ action: 'store-order', slug: slug }, body)).then(function (r) {
      btn.disabled = false; btn.innerHTML = old;
      if (!r.ok) {
        toast(r.error || 'الطلب ماتبعتش، جرّب تاني', 'bad');
        var f = { addr: 'ca', loc: 'locw', coupon: 'cpn', dev: 'rd', acct: 'ba', text: 'wt' }[r.field]; var el = f && document.getElementById(f); if (el) { if (el.classList.contains('in')) { el.classList.add('bad'); el.focus(); } else el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (r.stale) loadCat(true);
        if (r.priceChanged) setTimeout(function () { go('#/cart'); }, 1200);   // يشوف الأسعار الجديدة في السلة
        return null;
      }
      var list = ls('orders') || []; list.unshift({ trk: r.trk, no: r.no, at: Date.now(), kind: body.kind, total: r.totals && r.totals.total }); ls('orders', list.slice(0, 40));
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
      if (body.pay === 'card') { return gw({ action: 'store-pay', trk: r.trk, back: location.href.split('#')[0] + '#/o/' + r.trk }).then(function (pr) { if (pr.url) location.href = pr.url; else { toast(pr.error || 'الدفع مش متاح دلوقتي', 'bad'); go('#/o/' + r.trk + '?new=1'); } return r; }); }
      go('#/o/' + r.trk + '?new=1'); return r;
    });
  }
  function checkout() {
    if (fitCart()) return go('#/cart');   // الكمية اتغيّرت: يرجع السلة ويشوف الرسالة
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
    adPick(function (a) { if (a.lat != null && getLoc.set) getLoc.set({ lat: a.lat, lng: a.lng }); });
    app.querySelectorAll('#mode [data-m]').forEach(function (b) { b.onclick = function () { pickup = b.dataset.m === 'pick'; var m = me(); m.pickup = pickup; ls('me', m); app.querySelectorAll('#mode [data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); paint(); }; });
    paint();
    document.getElementById('go').onclick = function () {
      var cu = readCust(!pickup); if (!cu) return;
      var q = delQuote(sub, loc, pickup);
      if (!pickup && q.need) { document.getElementById('locw').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('حدد مكانك على الخريطة علشان المندوب', 'bad'); }
      if (!pickup && q.out) return toast('مكانك برّه منطقة التوصيل. ممكن تستلم من المحل.', 'bad');
      submitOrder({ kind: 'order', pay: payVal(), coupon: document.getElementById('cpn').value.trim(), exp: Math.round(sub * 100) / 100, items: c.map(function (x) { return { id: x.id, q: x.q, add: x.add }; }),   // exp: السيرفر يرفض لو السعر زاد من غير ما يعرف
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

  /* ---------- حسابي (خالد 2026-11-16، memory store-login): اختياري، بكود واتساب بس، ولكل محل لوحده ----------
     الحساب = علامة تأكيد الرقم (نفس verifyPhone) → جلسة على السيرفر (store-login). المفضلة من غير حساب بتتحفظ على الموبايل وبتتضم للحساب لما يدخل.
     الشكل: فكرة 2 (تبويبات: طلباتي / العناوين / المفضلة / ⚙️) */
  function acct() { var a = ls('acct'); return a && a.stok && a.me ? a : null; }
  function setAcct(a) { ls('acct', a); }
  function favs() { var A = acct(); return (A ? A.me.favs : ls('favs')) || []; }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  var favT;
  function toggleFav(id) {
    var A = acct(), l = favs().slice(), i = l.indexOf(id), on = i < 0;
    if (on) l.unshift(id); else l.splice(i, 1);
    l = l.slice(0, 60);
    if (A) { A.me.favs = l; setAcct(A); clearTimeout(favT); favT = setTimeout(function () { meSet({ favs: acct() ? acct().me.favs : l }); }, 700); } else ls('favs', l);
    toast(on ? '❤ اتضاف للمفضلة' : 'اتشال من المفضلة', on ? 'ok' : '');
    return on;
  }
  function meSet(o) { var A = acct(); if (!A) return Promise.resolve(null); return gw(Object.assign({ action: 'store-me-set', slug: slug, stok: A.stok }, o)).then(function (r) { if (r.out) { setAcct(null); return null; } if (r.ok && r.me) { var B = acct(); if (B) { B.me = r.me; setAcct(B); } } return r; }); }
  // الدخول: رقم → (لو الموبايل ده أكّد الرقم قبل كده: على طول) وإلا كود واتساب → جلسة
  function login(after) {
    if (!C.vf) { toast('الدخول مش متاح دلوقتي في المحل ده', 'bad'); return; }
    var dim = document.createElement('div'), sh = document.createElement('div'), m = ls('me') || {};
    dim.className = 'vf-dim'; sh.className = 'vf-sheet'; sh.setAttribute('role', 'dialog');
    sh.innerHTML = '<div class="vf-gr"></div><button class="vf-x" aria-label="اقفل">✕</button><div class="vf-b"><h3>👤 ادخل برقمك</h3>'
      + '<div class="vf-sub">علشان طلباتك وعناوينك والمفضلة تبقى معاك على أي موبايل. مش لازم علشان تطلب.</div>'
      + '<input class="in num" id="lg-ph" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right;margin:4px 0 12px" placeholder="01xxxxxxxxx" value="' + esc(m.phone || ((ls('vf') || {}).phone) || '') + '">'
      + '<button class="btn vf-wa" id="lg-go">💬 كمّل بكود واتساب</button><button class="vf-skip" id="lg-no">مش دلوقتي</button>'
      + '<div class="vf-note">مابنبعتلكش رسايل غير لو انت وافقت. <a href="#/privacy" id="lg-pv">الخصوصية</a></div></div>';
    var close = function () { sh.classList.remove('on'); dim.classList.remove('on'); setTimeout(function () { sh.remove(); dim.remove(); }, 260); };
    dim.onclick = close; sh.querySelector('.vf-x').onclick = close; sh.querySelector('#lg-no').onclick = close; sh.querySelector('#lg-pv').onclick = close;
    document.body.appendChild(dim); document.body.appendChild(sh);
    requestAnimationFrame(function () { dim.classList.add('on'); sh.classList.add('on'); });
    var inp = sh.querySelector('#lg-ph'); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 300);
    sh.querySelector('#lg-go').onclick = function () {
      var ph = inp.value.trim().replace(/[\s-]/g, '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; });
      if (!/^(\+?20|0)?1[0125]\d{8}$/.test(ph)) { inp.classList.add('bad'); inp.focus(); return toast('اكتب رقم موبايل صح (01...)', 'bad'); }
      if (ph.length === 10) ph = '0' + ph; else if (ph.indexOf('+20') === 0) ph = '0' + ph.slice(3); else if (/^20\d{10}$/.test(ph)) ph = '0' + ph.slice(2);
      close();
      var saved = vfSaved(ph);
      (saved ? Promise.resolve(saved) : verifyPhone(ph, { login: true })).then(function (tok) {
        if (!tok) return;
        return gw({ action: 'store-login', slug: slug, vtok: tok, name: m.name || '' }).then(function (r) {
          if (!r.ok) { if (r.again) ls('vf', null); return toast(r.error || 'الدخول ماتمّش، جرّب تاني', 'bad'); }
          var local = ls('favs') || [], merged = (r.me.favs || []).concat(local.filter(function (x) { return (r.me.favs || []).indexOf(x) < 0; })).slice(0, 60);
          setAcct({ stok: r.stok, me: r.me }); ls('favs', null);
          if (merged.length !== (r.me.favs || []).length) meSet({ favs: merged });
          toast('أهلًا ' + (r.me.name || '') + ' ✓ دخلت', 'ok');
          if (after) after(); else go('#/me');
        });
      });
    };
  }
  function logout(all) { var A = acct(); setAcct(null); if (A) gw({ action: 'store-logout', slug: slug, stok: A.stok, all: !!all }); toast(all ? 'خرجت من كل الأجهزة' : 'خرجت من حسابك', 'ok'); go('#/me'); }
  var ME_TABS = [['orders', '📦 طلباتي'], ['addr', '📍 العناوين'], ['fav', '❤️ المفضلة'], ['set', '⚙️']];
  function meHead(A) {
    if (!A) return '<div class="me-top"><div class="me-av">👤</div><div class="me-nm"><b>انت مش داخل</b><small>تقدر تطلب عادي من غير حساب</small></div>'
      + (C.vf ? '<button class="me-in" id="me-login">ادخل برقمك</button>' : '') + '</div>';
    var nm = A.me.name || 'أهلًا بيك';
    return '<div class="me-top"><div class="me-av">' + esc(nm.trim().charAt(0) || '👤') + '</div><div class="me-nm"><b>' + esc(nm) + '</b><small class="num" dir="ltr">' + esc(A.me.phone) + '</small></div><span class="me-ok">✓ رقم متأكد</span></div>';
  }
  function mePage(tab) {
    var A = acct(); if (!ME_TABS.some(function (t) { return t[0] === tab; })) tab = 'orders';
    var html = '<div class="me">' + meHead(A) + '<div class="me-tabs" role="tablist">' + ME_TABS.map(function (t) { return '<button role="tab" data-go="#/me?t=' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '" aria-label="' + (t[0] === 'set' ? 'الإعدادات' : esc(t[1])) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="me-b"></div></div>';
    shell(html, '#/me');
    var lb = document.getElementById('me-login'); if (lb) lb.onclick = function () { login(); };
    var box = document.getElementById('me-b');
    if (tab === 'orders') return meOrders(box, A);
    if (tab === 'fav') { var l = favs().map(function (id) { return P[id]; }).filter(Boolean); box.innerHTML = l.length ? gridHTML(l) : '<div class="empty"><div class="e">❤️</div><b>مفيش حاجة في المفضلة</b><p>دوس ❤ على أي منتج علشان ترجعله بسهولة.</p><button class="btn b1" data-go="#/">تسوّق</button></div>'; markLoading(box); return; }
    if (tab === 'addr') return meAddrs(box, A);
    return meSettings(box, A);
  }
  function orderRow(o) { return '<div class="ol" data-go="#/o/' + esc(o.trk) + '"><span style="font-size:24px">' + ({ order: '🛒', bill: '🧾', repair: '🛠', wish: '🤔' }[o.kind] || '🛒') + '</span><div class="t"><b>' + (o.first ? esc(o.first) + (o.n > 1 ? ' <span class="ol-more">+' + (o.n - 1) + '</span>' : '') : '<span class="num">W-' + esc(o.no) + '</span>') + '</b><small>' + (o.first ? '<span class="num">W-' + esc(o.no) + '</span> · ' : '') + new Date(o.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' }) + (o.total ? ' · ' + fm(o.total) + ' ' + esc(cur()) : '') + '</small></div><span class="pill" data-st="' + esc(o.trk) + '">' + (o.status ? esc(lab(o.kind, false, o.status)) : '…') + '</span></div>'; }
  function pillCls(s) { return 'pill ' + (s === 'cancel' || s === 'ret' ? 'bad' : s === 'done' || s === 'paid' ? 'ok' : 'wait'); }
  function meOrders(box, A) {
    var local = ls('orders') || [];
    if (!A) {
      if (!local.length) { box.innerHTML = '<div class="empty"><div class="e">📦</div><b>لسه مفيش طلبات</b><p>طلباتك من الموبايل ده بتظهر هنا.' + (C.vf ? ' ولو دخلت برقمك هتشوفها من أي موبايل.' : '') + '</p><button class="btn b1" data-go="#/">تسوّق دلوقتي</button></div>'; return; }
      box.innerHTML = '<div class="box">' + local.map(orderRow).join('') + '</div>';
      local.slice(0, 5).forEach(function (o) { gw({ action: 'store-track', trk: o.trk }).then(function (r) { var el = box.querySelector('[data-st="' + o.trk + '"]'); if (!el) return; if (!r.ok) { el.textContent = '—'; return; } el.textContent = lab(r.order.kind, r.order.pickup, r.order.status); el.className = pillCls(r.order.status); }); });
      return;
    }
    box.innerHTML = '<div class="box"><div class="sk" style="height:56px;margin-bottom:8px"></div><div class="sk" style="height:56px"></div></div>';
    gw({ action: 'store-me', slug: slug, stok: A.stok }).then(function (r) {
      if (!box.isConnected) return;
      if (r.out) { setAcct(null); toast(r.error || 'خرجت من حسابك', 'bad'); return mePage('orders'); }
      if (!r.ok) { box.innerHTML = '<div class="empty"><div class="e">📡</div><b>' + esc(r.error || 'مش قادرين نجيب طلباتك دلوقتي') + '</b></div>'; return; }
      var B = acct(); if (B) { B.me = r.me; setAcct(B); }
      var l = r.orders || [];
      box.innerHTML = l.length ? '<div class="box">' + l.map(orderRow).join('') + '</div>' : '<div class="empty"><div class="e">📦</div><b>لسه مفيش طلبات</b><p>أي طلب برقمك هيظهر هنا من أي موبايل.</p><button class="btn b1" data-go="#/">تسوّق دلوقتي</button></div>';
      l.forEach(function (o) { var el = box.querySelector('[data-st="' + o.trk + '"]'); if (el) el.className = pillCls(o.status); });
    });
  }
  function meAddrs(box, A) {
    if (!A) { box.innerHTML = '<div class="empty"><div class="e">📍</div><b>احفظ عناوينك</b><p>ادخل برقمك وعناوينك (البيت، الشغل...) تبقى جاهزة بدوسة وانت بتطلب.</p>' + (C.vf ? '<button class="btn b1" id="me-login2">ادخل برقمك</button>' : '') + '</div>'; var b2 = document.getElementById('me-login2'); if (b2) b2.onclick = function () { login(function () { go('#/me?t=addr'); }); }; return; }
    var list = A.me.addrs || [];
    var paint = function () {
      list = (acct() || A).me.addrs || [];
      box.innerHTML = '<div class="box">' + (list.length ? list.map(function (a, i) { return '<div class="ad-row"><span class="ad-ic">' + (/شغل/.test(a.label) ? '🏢' : /بيت/.test(a.label) ? '🏠' : '📍') + '</span><div class="t"><b>' + esc(a.label || 'عنوان') + '</b><small>' + esc(a.addr || '') + (a.lat != null ? ' · 📌 على الخريطة' : '') + '</small></div><button class="ad-x" data-del="' + i + '" aria-label="امسح">✕</button></div>'; }).join('') : '<div class="hint">مفيش عناوين محفوظة لسه.</div>') + '</div>'
        + (list.length < 5 ? '<div class="box"><h4>➕ عنوان جديد</h4><div class="pills" id="ad-lb"><button type="button" class="on" data-l="البيت">🏠 البيت</button><button type="button" data-l="الشغل">🏢 الشغل</button><button type="button" data-l="تاني">📍 تاني</button></div>'
          + '<label class="f" style="margin-top:10px"><span>العنوان بالتفصيل</span><input class="in" id="ad-a" placeholder="الشارع، رقم العمارة، الدور، الشقة"></label><div class="locb" style="margin:6px 0 10px"><button type="button" id="ad-geo">📡 احفظ مكاني الحالي كمان</button></div><button class="btn bg" id="ad-save">احفظ العنوان</button></div>' : '');
      var lbl = 'البيت', ll = null;
      box.querySelectorAll('#ad-lb button').forEach(function (b) { b.onclick = function () { lbl = b.dataset.l; box.querySelectorAll('#ad-lb button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      box.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var l = list.slice(); l.splice(+b.dataset.del, 1); meSet({ addrs: l }).then(function () { paint(); }); }; });
      var g = document.getElementById('ad-geo'); if (g) g.onclick = function () { if (!navigator.geolocation) return toast('الموبايل مش بيدعم تحديد المكان', 'bad'); g.textContent = '⏳ بنحدد...'; navigator.geolocation.getCurrentPosition(function (pos) { ll = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }; g.textContent = '✓ مكانك اتحفظ مع العنوان'; }, function () { g.textContent = '📡 احفظ مكاني الحالي كمان'; toast('مقدرناش نحدد مكانك', 'bad'); }, { enableHighAccuracy: true, timeout: 15000 }); };
      var sv = document.getElementById('ad-save'); if (sv) sv.onclick = function () { var t = document.getElementById('ad-a'); if (t.value.trim().length < 5 && !ll) { t.classList.add('bad'); t.focus(); return toast('اكتب العنوان بالتفصيل', 'bad'); } sv.disabled = true; meSet({ addrs: list.concat([Object.assign({ label: lbl, addr: t.value.trim() }, ll || {})]) }).then(function (r) { sv.disabled = false; if (r && r.ok) { toast('✓ العنوان اتحفظ', 'ok'); paint(); } else toast((r && r.error) || 'ماتحفظش، جرّب تاني', 'bad'); }); };
    };
    paint();
  }
  function meSettings(box, A) {
    if (!A) { box.innerHTML = '<div class="box"><a class="me-row" href="#/privacy"><span>🔒</span><b>الخصوصية وبياناتك</b><i>‹</i></a><a class="me-row" href="#/info"><span>📜</span><b>الشروط والاسترجاع والضمان</b><i>‹</i></a></div>' + (C.vf ? '<div class="box"><button class="btn b1" id="me-login3" style="width:100%">👤 ادخل برقمك</button></div>' : ''); var b3 = document.getElementById('me-login3'); if (b3) b3.onclick = function () { login(); }; return; }
    box.innerHTML = '<div class="box"><h4>👤 اسمك</h4><div style="display:flex;gap:8px"><input class="in" id="me-n" value="' + esc(A.me.name || '') + '" placeholder="اسمك" style="flex:1"><button class="btn bs" id="me-ns" style="flex:none">احفظ</button></div></div>'
      + '<div class="box"><label class="me-sw"><span><b>🔔 عروض المحل على واتساب</b><small>مقفولة لحد ما توافق. تقدر تقفلها في أي وقت.</small></span><input type="checkbox" id="me-of"' + (A.me.offers ? ' checked' : '') + '><i></i></label></div>'
      + '<div class="box"><a class="me-row" href="#/privacy"><span>🔒</span><b>الخصوصية وبياناتك</b><i>‹</i></a><a class="me-row" href="#/info"><span>📜</span><b>الشروط والاسترجاع والضمان</b><i>‹</i></a>'
      + '<button class="me-row" id="me-out"><span>🚪</span><b>خروج من الموبايل ده</b><i>‹</i></button><button class="me-row" id="me-outall"><span>📵</span><b>خروج من كل الأجهزة</b><i>‹</i></button></div>'
      + '<div class="box"><button class="me-row del" id="me-del"><span>🗑</span><b>امسح حسابي وبياناتي</b><i>‹</i></button></div>';
    document.getElementById('me-ns').onclick = function () { var v = document.getElementById('me-n').value.trim(); meSet({ name: v }).then(function (r) { if (r && r.ok) { var m = ls('me') || {}; m.name = v; ls('me', m); toast('✓ اتحفظ', 'ok'); } }); };
    document.getElementById('me-of').onchange = function () { var on = this.checked; meSet({ offers: on }).then(function (r) { if (r && r.ok) toast(on ? '✓ هنبعتلك العروض' : 'مش هنبعتلك عروض', 'ok'); }); };
    document.getElementById('me-out').onclick = function () { logout(false); };
    document.getElementById('me-outall').onclick = function () { logout(true); };
    document.getElementById('me-del').onclick = function () {
      sheet('<h3 style="font-weight:900;margin-bottom:8px">🗑 تمسح حسابك؟</h3><div class="terms">هيتمسح: اسمك ورقمك وعناوينك والمفضلة، وهتخرج من كل الأجهزة.\nطلباتك اللي خلصت بتفضل عند المحل للحسابات من غير اسمك ورقمك وعنوانك.\nمينفعش ترجع فيها.</div><button class="btn" id="dl-yes" style="width:100%;margin-top:14px;background:#b42339;color:#fff">امسح حسابي</button><button class="btn bs" data-close style="width:100%;margin-top:8px">لأ، سيبه</button>');
      var y = document.getElementById('dl-yes'); y.onclick = function () { y.disabled = true; gw({ action: 'store-me-delete', slug: slug, stok: A.stok }).then(function (r) { y.disabled = false; if (r.ok || r.out) { document.querySelectorAll('.sheet,.sheet-bg').forEach(function (e) { e.remove(); }); setAcct(null); ls('me', null); ls('vf', null); ls('orders', null); toast('✓ حسابك اتمسح', 'ok'); go('#/'); } else toast(r.error || 'ماتمسحش، جرّب تاني', 'bad'); }); };
    };
  }
  // اختيار عنوان محفوظ في إتمام الطلب
  function adPick(onLoc) { var A = acct(); if (!A) return; app.querySelectorAll('[data-ad]').forEach(function (b) { b.onclick = function () { var a = (A.me.addrs || [])[+b.dataset.ad]; if (!a) return; var t = document.getElementById('ca'); if (t && a.addr) t.value = a.addr; app.querySelectorAll('[data-ad]').forEach(function (x) { x.classList.toggle('on', x === b); }); if (onLoc) onLoc(a); }; }); }
  // صفحة الخصوصية (خالد 2026-11-16: "راجع كل حاجة ليها علاقة بسياسة الاستخدام والخصوصية")
  function privacyPage() {
    var t = C.terms || {}, n = esc(C.shop.name || 'المحل');
    var blk = function (h, x) { return '<div class="box"><h4>' + h + '</h4><div class="terms">' + x + '</div></div>'; };
    shell(barHTML('🔒 الخصوصية') + (t.priv ? blk('📌 من ' + n, esc(t.priv)) : '')
      + blk('📋 بنحفظ إيه', 'لما تطلب: اسمك ورقمك وعنوانك ومكانك على الخريطة (لو التوصيل)، والطلب نفسه.\nلو دخلت بحسابك: كمان العناوين اللي حفظتها والمفضلة.\nعلى موبايلك بس: السلة وآخر بيانات كتبتها، علشان ماتكتبهاش تاني.')
      + blk('🎯 ليه', 'علشان نجهّز طلبك ونوصلهولك ونكلمك عنه بس. مابنبيعش بياناتك ولا بندّيها لحد، غير المندوب اللي بيوصل طلبك (الاسم والرقم والعنوان).')
      + blk('💬 الرسايل', 'مابنبعتلكش عروض غير لو انت وافقت من حسابك ← ⚙️، وتقدر تقفلها في أي وقت.\nتأكيد الرقم بيحصل بإنك انت اللي بتبعت كود لواتساب المحل، فالمحل مش بيبعتلك حاجة.')
      + blk('⏳ لحد إمتى', 'الدخول بيفضل 6 شهور على الموبايل وبعدين تدخل تاني. تأكيد الرقم بيفضل 3 شهور.\nالطلبات بتفضل عند المحل لأنها جزء من حساباته.')
      + blk('✋ حقك', 'تشوف وتعدّل اسمك وعناوينك من "حسابي".\nتخرج من الموبايل ده أو من كل الأجهزة.\nتمسح حسابك وبياناتك من حسابي ← ⚙️ ← امسح حسابي (الطلبات اللي خلصت بتفضل من غير اسمك ورقمك وعنوانك).\nأي سؤال: كلّم المحل' + (C.shop.phone ? ' على <span class="num">' + esc(C.shop.phone) + '</span>' : '') + '.')
      + legalBox() + footHTML(), '#/me');
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
  function rateBox(trk, o) {
    var box = document.getElementById('rvbox'); if (!box) return;
    gw({ action: 'store-review-get', trk: trk }).then(function (r) {
      if (!box.isConnected) return;
      if (!r.ok || (!r.can && !(r.mine || []).length)) { box.remove(); return; }
      var mine = {}; (r.mine || []).forEach(function (m) { mine[m.pid] = m; });
      var seen = {}, items = (o.items || []).filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true; });
      var pick = {}; items.forEach(function (x) { pick[x.id] = mine[x.id] ? { s: mine[x.id].stars, t: mine[x.id].text || '' } : { s: 0, t: '' }; });
      var done = items.every(function (x) { return mine[x.id]; }), edit = !done;
      var paint = function () {
        if (!edit) { box.innerHTML = '<div class="box rate-box"><h4>⭐ شكرًا على تقييمك</h4>' + items.map(function (x) { return '<div class="rt-row"><span class="rt-n">' + esc(x.n) + '</span>' + starsHTML(pick[x.id].s) + '</div>'; }).join('') + (r.can ? '<button type="button" class="btn bs" id="rt-edit" style="width:100%;margin-top:10px">✏️ عدّل تقييمك</button>' : '') + '</div>'; var e = document.getElementById('rt-edit'); if (e) e.onclick = function () { edit = true; paint(); }; return; }
        box.innerHTML = '<div class="box rate-box"><h4>⭐ قيّم اللي اشتريته <small>رأيك بيساعد غيرك</small></h4>' + items.map(function (x) {
          var v = pick[x.id];
          return '<div class="rt-item" data-pid="' + esc(x.id) + '"><div class="rt-top"><span class="rt-im">' + (x.img ? '<img src="' + esc(img(x.img)) + '" alt="">' : '📦') + '</span><b>' + esc(x.n) + '</b></div>'
            + '<div class="rt-stars" role="radiogroup" aria-label="عدد النجوم">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (v.s === n) + '" aria-label="' + n + ' من 5" data-s="' + n + '" class="' + (n <= v.s ? 'on' : '') + '">★</button>'; }).join('') + '<span class="rt-l">' + (['', 'وحش', 'مش أحسن حاجة', 'كويس', 'حلو', 'ممتاز'][v.s] || 'اختار') + '</span></div>'
            + (v.s ? '<textarea class="in rt-t" maxlength="400" rows="2" placeholder="اكتب رأيك (اختياري)">' + esc(v.t) + '</textarea>' : '') + '</div>';
        }).join('') + '<button type="button" class="btn bg" id="rt-send" style="width:100%;margin-top:6px"' + (items.some(function (x) { return pick[x.id].s; }) ? '' : ' disabled') + '>ابعت التقييم</button><div class="hint" style="margin-top:8px">بيظهر باسمك الأول بس، من غير رقمك.</div></div>';
        box.querySelectorAll('.rt-item').forEach(function (it) {
          var id = it.dataset.pid, ta = it.querySelector('.rt-t');
          if (ta) ta.oninput = function () { pick[id].t = ta.value; };
          it.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { if (ta) pick[id].t = ta.value; pick[id].s = +b.dataset.s; paint(); var t2 = box.querySelector('.rt-item[data-pid="' + id + '"] .rt-t'); if (t2 && !t2.value) t2.focus(); }; });
        });
        var sd = document.getElementById('rt-send');
        sd.onclick = function () {
          var list = items.filter(function (x) { return pick[x.id].s; }).map(function (x) { return { pid: x.id, s: pick[x.id].s, t: pick[x.id].t }; });
          sd.disabled = true; sd.textContent = '⏳ بنبعت...';
          gw({ action: 'store-review', trk: trk, items: list }).then(function (x) {
            if (!x.ok) { sd.disabled = false; sd.textContent = 'ابعت التقييم'; return toast(x.error || 'التقييم ماتبعتش، جرّب تاني', 'bad'); }
            list.forEach(function (l) { mine[l.pid] = { stars: l.s, text: l.t }; });
            done = true; edit = false; paint(); toast('⭐ شكرًا! تقييمك اتنشر', 'ok'); loadRev();
          });
        };
      };
      paint();
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
        var html = barHTML('📦 طلب <span class="num">W-' + esc(o.no) + '</span>', '', '#/me')
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
        if (o.kind === 'order' && s === 'done' && (o.items || []).length) html += '<div id="rvbox"></div>';   // قيّم اللي اشتريته (بعد ما وصل)
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
        shell(html, '#/me', true); if (QUIET) { QUIET = false; window.scrollTo({ top: y, behavior: 'instant' }); }
        if (document.getElementById('rvbox')) rateBox(trk, o);
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
  function desktopInstall() {
    var ua = navigator.userAgent || '';
    var ipadDesktop = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    return window.matchMedia('(min-width: 1100px)').matches && !isIOS() && !ipadDesktop && !/android/i.test(ua);
  }
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; }
  function installMaybe() {
    var onShop = /^(#\/?|#\/cats.*|#\/c\/.*)?$/.test(location.hash), old = document.querySelector('.install');
    if (!onShop) { if (old) old.remove(); return; }   // كان بيطلع فوق صفحة الطلب وزرار التأكيد (خالد 2026-11-09)
    if (!C || standalone() || old) return;
    var seen = +(ls('inst') || 0); if (Date.now() - seen < 7 * 864e5) return;
    var visits = +(ls('visits') || 0); if (visits < 2 && !(ls('orders') || []).length) return;
    if (!deferredInstall && !isIOS()) return;
    var desktop = desktopInstall(), target = desktop ? 'على الكمبيوتر' : 'على موبايلك';
    var detail = desktop ? 'يفتح كبرنامج مستقل من جهازك، ومعاه عروض المحل وطلباته.' : 'يفتح على طول من الشاشة الرئيسية، وتشوف العروض الجديدة أول بأول.';
    var button = desktop ? '🖥️ ثبّت على الكمبيوتر' : '📲 ثبّت';
    var d = document.createElement('div'); d.className = 'install'; d.dataset.target = desktop ? 'desktop' : 'mobile';
    d.innerHTML = '<button class="x" aria-label="إغلاق">✕</button><div class="logo">' + logoHTML() + '</div><div style="flex:1"><b>ثبّت "' + esc(C.shop.name) + '" ' + target + '</b><small>' + detail + '</small><button class="btn b1" style="margin-top:8px;padding:9px;font-size:13.5px;width:100%">' + button + '</button></div>';
    if (desktop) {
      var page = document.querySelector('#app > .page'), head = page && page.querySelector('.hd');
      if (page) head ? page.insertBefore(d, head.nextSibling) : page.appendChild(d); else document.body.appendChild(d);
    } else document.body.appendChild(d);
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
    /* خالد 2026-11-16: الرجوع من منتج بيرجّعك لنفس المكان. كل صفحة بتحفظ مكانها في history.state (saveY)؛
       الصفحة اللي اتزارت قبل كده (رجوع/قدام/ريفرش) بترجع لمكانها، والجديدة بتبدأ من فوق */
    var backY = !QUIET && history.state && typeof history.state.y === 'number' ? history.state.y : null;
    if (!QUIET) window.scrollTo({ top: 0, behavior: 'instant' });   // من غير الانزلاق الناعم (html: scroll-behavior smooth) علشان الصفحة الجديدة تبدأ من فوق على طول
    if (backY) restoreY(backY);
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
      case 'me': return mePage(q.get('t') || 'orders');
      case 'privacy': return privacyPage();
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
  /* مكان كل صفحة: بيتحفظ في history.state بعد ما السكرول يقف (Safari بيسمح بـ 100 replaceState كل 30 ثانية، فمش مع كل حركة) */
  function saveY() { try { var st = history.state && typeof history.state === 'object' ? history.state : {}; if (st.y === window.scrollY) return; history.replaceState(Object.assign({}, st, { y: window.scrollY }), ''); } catch (e) {} }
  var saveT; window.addEventListener('scroll', function () { clearTimeout(saveT); saveT = setTimeout(saveY, 250); }, { passive: true });
  /* الرجوع للمكان: الصفحة بتترسم كلها مرة واحدة، بس الصور ممكن تكبّر الطول بعدها؛ بنعيد المحاولة كام مرة لحد ما الطول يكفي أو المستخدم يحرّك */
  function restoreY(y) {
    var tries = 0, moved = false, stop = function () { moved = true; };
    window.addEventListener('touchstart', stop, { once: true, passive: true }); window.addEventListener('wheel', stop, { once: true, passive: true });
    (function again() {
      if (moved) return; window.scrollTo({ top: y, behavior: 'instant' });
      if (Math.abs(window.scrollY - y) > 2 && ++tries < 12) setTimeout(again, 60);
    })();
  }
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  window.addEventListener('hashchange', render);
  var fitT; window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(function () { fitDeal(document.querySelector('[data-deal-banner] b')); }, 120); });
  window.addEventListener('beforeunload', saveY);
  document.addEventListener('click', function () { clearTimeout(saveT); saveY(); }, true);   // قبل أي تنقّل: احفظ مكان الصفحة اللي انت فيها
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add]'); if (t) { e.stopPropagation(); return addToCart(t.dataset.add, 1, []); }
    var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(g.dataset.go); }
    var p = e.target.closest('[data-p]'); if (p && !e.target.closest('a')) return go('#/p/' + encodeURIComponent(p.dataset.p));
    var b = e.target.closest('[data-back]'); if (b) { if (history.length > 1 && !b.dataset.back) history.back(); else go(b.dataset.back || '#/'); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && /^#\/o\//.test(location.hash) && trackLoad) trackLoad(); if (!document.hidden && C && Date.now() - (loadCat.at || 0) > 45000) loadCat(true); });
  // الصفحة مفتوحة: الكتالوج بيتقري تاني كل 45 ثانية وهي قدامك، والشاشة بتتحدّث بس لو حاجة اتغيّرت (خالد 2026-11-20: "أي تعديل بياخد وقت عشان يظهر على الموقع")
  setInterval(function () { if (!document.hidden && C && slug && Date.now() - (loadCat.at || 0) > 44000) loadCat(true); }, 15000);

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
    // فروع: التثبيت بشكل الرئيسي ولينكه (ولينك الرئيسي بيفتح الفرع اللي العميل اختاره)
    document.getElementById('mf').href = ST + ((brCur() && BR.main) || slug) + '/manifest.json';
    // نفس PNG المربعة للمتجر المثبّت على iOS ولأيقونة التبويب؛ اللوجو الخام يفضل لواجهة المتجر فقط.
    var installIcon = C.shop._i192 ? ST + C.shop._i192.split('/').map(encodeURIComponent).join('/') : C.shop.i192 ? img(C.shop.i192) : ST + 'icon-192.png';
    var ati = document.getElementById('ati'), fav = document.getElementById('fav');
    if (ati && ati.href !== installIcon) ati.href = installIcon;
    if (fav && fav.href !== installIcon) fav.href = installIcon;
  }
  function loadCat(quiet) {
    loadCat.at = Date.now(); loadRev();
    return fetch(ST + encodeURIComponent(slug) + '/catalog.json?t=' + Math.floor(Date.now() / 5000), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); })
      .then(function (j) { var txt = JSON.stringify(j), same = txt === loadCat.sig; loadCat.sig = txt; set(j); try { localStorage.setItem('rds_cat_' + slug, txt); } catch (e) {} if (quiet && !same) refresh(); })
      .catch(function (st) { if (C) return; var old = null; try { old = JSON.parse(localStorage.getItem('rds_cat_' + slug)); } catch (e) {} if (old) { set(old); render(); toast('مفيش نت — بتشوف آخر نسخة', 'bad'); } else fail(st === 400 || st === 404 ? 'المتجر ده مش موجود' : 'مفيش نت. جرّب تاني.'); });
  }
  function set(j) { C = j; C.shop = C.shop || {}; P = {}; (C.p || []).forEach(function (p) { P[p.id] = p; }); brand(); theme(); }

  /* ---------- متجر واحد لكل الفروع (خالد 2026-11-18، فكرة 1) ----------
     branches.json جنب الكتالوج (السيرفر بيكتبه لو الفرع الرئيسي مشغّل "متجر واحد"): الفروع وشكل الرئيسي.
     الراس فيه "📍 فرع X ▾" والقايمة من تحت؛ أول زيارة بتفتح لوحدها، والفرع بيتفتكر لكل محل (rds_brpick_<الرئيسي>). كل فرع بمنتجاته وسلته وطلباته (نفس المفاتيح بالـ slug) */
  function brCur() { return BR && BR.list && BR.list.length > 1 ? BR.list.filter(function (x) { return x.s === slug; })[0] || null : null; }
  function brand() {
    if (!C || !brCur() || !BR.brand) return;
    var b = BR.brand;
    if (b.name) C.shop.name = b.name; if (b.ac) C.shop.ac = b.ac; if (b.ic) C.shop.ic = b.ic; if (b.tag) C.shop.tag = b.tag;
    C.shop._lg = b.logo || ''; C.shop._i192 = b.i192 || '';
  }
  var brKey = function () { return 'rds_brpick_' + (BR && BR.main || ''); };
  function brLoad() {
    var k = 'rds_br_' + slug, want = slug;
    try { var old = JSON.parse(localStorage.getItem(k) || 'null'); if (old && !BR) { BR = old; if (C) { brand(); theme(); refresh(); } } } catch (e) {}
    return fetch(ST + encodeURIComponent(slug) + '/branches.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return undefined; })
      .then(function (j) {
        if (want !== slug || j === undefined) return;   // من غير نت: آخر نسخة
        var before = JSON.stringify(BR); BR = j && j.list && j.list.length > 1 ? j : null;
        try { if (BR) localStorage.setItem(k, JSON.stringify(BR)); else localStorage.removeItem(k); } catch (e) {}
        if (JSON.stringify(BR) !== before && C) { var c0 = C; loadCat.sig = ''; set(JSON.parse(localStorage.getItem('rds_cat_' + slug) || 'null') || c0); refresh(); }
        if (!brCur()) return;
        var pick = null; try { pick = localStorage.getItem(brKey()); } catch (e) {}
        var inList = function (s) { return BR.list.some(function (x) { return x.s === s; }); };
        // فتح لينك الرئيسي وكان اختار فرع تاني قبل كده: نروح لفرعه على طول (مش في صفحة طلب)
        if (pick && pick !== slug && slug === BR.main && inList(pick) && !/^#\/(o|t|orders)\b/.test(location.hash)) return brGo(pick, true);
        // أول زيارة: القايمة بتفتح لوحدها في الرئيسية
        if (!pick && (!location.hash || location.hash === '#/' || location.hash === '#')) { try { localStorage.setItem(brKey(), slug); } catch (e) {} brSheet(); }
      });
  }
  function brSheet() {
    if (!brCur() || document.querySelector('.sheet')) return;
    var rows = BR.list.map(function (x) {
      var op = openNow(x.h || null), sub = [x.a, x.ad].filter(Boolean).join(' · ');
      return '<button type="button" class="brl' + (x.s === slug ? ' on' : '') + '" data-brs="' + esc(x.s) + '"><span class="bi">🏬</span><span class="bx"><b>' + esc(x.n) + (x.s === slug ? ' <i>✓</i>' : '') + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="bs' + (op ? '' : ' c') + '">' + (op ? 'مفتوح' : 'مقفول دلوقتي') + '</span></button>';
    }).join('');
    sheet('<h3 class="brh">اختار الفرع</h3><p class="brp">المنتجات والأسعار والتوصيل من الفرع اللي تختاره</p><div class="brls">' + rows + '</div>');
    document.querySelectorAll('.sheet [data-brs]').forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-brs'); var bg = document.querySelector('.sheet-bg'), sh = document.querySelector('.sheet'); if (bg) bg.remove(); if (sh) sh.remove(); brGo(s); }; });
  }
  function brGo(s, quiet) {
    s = String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    try { localStorage.setItem(brKey(), s); } catch (e) {}
    if (!s || s === slug) return;
    var name = ((BR && BR.list.filter(function (x) { return x.s === s; })[0]) || {}).n || '';
    slug = s;
    try { localStorage.setItem('rds_last', slug); var u = new URL(location.href); u.searchParams.set('s', slug); history.replaceState(history.state, '', u.pathname + u.search + (/^#\/(p|c|cat)\b/.test(location.hash) ? '#/' : location.hash)); } catch (e) {}
    loadCat.sig = ''; var cached = null; try { cached = JSON.parse(localStorage.getItem('rds_cat_' + slug)); } catch (e) {}
    if (cached) { set(cached); render(); loadCat(true); } else loadCat().then(function () { if (C) render(); });
    brLoad();
    if (!quiet && name) toast('اتنقلت لفرع ' + name);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-br]'); if (b) { e.preventDefault(); brSheet(); } });
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
      brLoad();
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  window.__store = { render: render, go: go, state: function () { return { slug: slug, C: C, cart: cart() }; }, reload: function () { return loadCat(true); }, poll: function () { if (trackLoad) trackLoad(); } };   // للاختبار
  boot();
})();
