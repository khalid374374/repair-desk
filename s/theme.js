/* ثيمات المتجر (خالد 2026-11-22: "ثيمات لموقع المتجر... فول كاستمايز... وثيم رمضان احتياطي"). ES5 (الآيفونات القديمة).
   C.th (من الكاشير، store.js setCfg بنفس قواعد clean):
     id: base | lux | clean | neon | glass | warm | ramadan        m: auto (زي موبايل العميل) | light | dark
     c:  ألوان من عند المحل فوق الثيم { bg, bg2, card, ink, hd1, hd2, ac, deal1, deal2 } (كلها اختيارية #rrggbb)
     bgk: plain | grad | pat     pat: dots | grid | waves | islamic | stars      r: استدارة الكروت 4..32      sh: الظل 0..3
     f:  الخط cairo | tajawal | almarai | plex | messiri | changa | readex       fx: الحركة والزينة (true افتراضي)
     dv: { m: موبايل, d: كمبيوتر (1100+) } كل واحد { cols, hd: big|slim, fs: 90..115, ord: [أقسام الرئيسية بالترتيب], hide: [أقسام مستخبية] }
     rm: رمضان { greet, sub, ift: عد تنازلي للفطار, city, lanterns }
   الأساسي (base) من غير أي تغيير = شكل المتجر زي ما هو بالظبط (store.css). الباقي طبقة فوقه في theme.css تحت html[data-th]. */
(function (W) {
  var HEX = /^#[0-9a-f]{6}$/i;
  var SECS = ['cats', 'deal', 'cart', 'seen', 'new', 'rows', 'rev', 'svc', 'wish'];   // أقسام الرئيسية اللي بتترتب
  var SEC_N = { cats: 'الأقسام', deal: 'البانر والعروض', cart: 'سلتك مستنياك', seen: 'شوفته قبل كده', 'new': 'لسه واصل', rows: 'صفوف المنتجات', rev: 'آراء الزباين', svc: 'الخدمات', wish: 'مش لاقي اللي عايزه؟' };
  var FONTS = { cairo: ['Cairo', 'Cairo:wght@400;600;700;800;900'], tajawal: ['Tajawal', 'Tajawal:wght@400;500;700;800;900'], almarai: ['Almarai', 'Almarai:wght@400;700;800'],
    plex: ['IBM Plex Sans Arabic', 'IBM+Plex+Sans+Arabic:wght@400;500;600;700'], messiri: ['El Messiri', 'El+Messiri:wght@400;500;600;700'], changa: ['Changa', 'Changa:wght@400;500;600;700;800'], readex: ['Readex Pro', 'Readex+Pro:wght@400;500;600;700'] };
  // كل ثيم: اسم، الوضع الافتراضي، وألوان فاتح (L) و/أو غامق (D). hd = خلفية الراس، deal = عرض اليوم القديم، body = خلفية الصفحة
  var PRESETS = {
    base: { n: 'الأساسي', d: 'الكحلي والكروت الهادية (شكل المتجر الحالي)', m: 'auto', f: 'cairo' },
    lux: { n: 'فخم ذهبي', d: 'أسود وذهبي، لمحلات الموبايلات الغالية', m: 'dark', f: 'readex', r: 20, sh: 2, bgk: 'grad',
      D: { bg: '#0b0a0d', bg2: '#17130c', card: '#16141a', ink: '#f6efe0', mut: '#bfb196', line: '#2d2830', soft: '#1d1a21', inp: '#121015', inl: '#3a3440', pimg: '#201c24', hd1: '#2a2214', hd2: '#0b0a0d', hdink: '#f6efe0', hdsub: '#d9c79c', ac: '#d4a843', deal1: '#3a2b10', deal2: '#120f0a' } },
    clean: { n: 'فاتح بسيط', d: 'أبيض ونظيف، المنتجات هي اللي بتبان', m: 'light', f: 'plex', r: 14, sh: 1, bgk: 'plain',
      L: { bg: '#f3f4f6', bg2: '#ffffff', card: '#ffffff', ink: '#111827', mut: '#5b6472', line: '#e5e7eb', soft: '#f3f4f6', inp: '#ffffff', inl: '#d1d5db', pimg: '#f6f7f9', hd1: '#ffffff', hd2: '#ffffff', hdink: '#111827', hdsub: '#5b6472', deal1: '#111827', deal2: '#374151' } },
    neon: { n: 'نيون جيمنج', d: 'غامق ببنفسجي وسماوي منوّر، للإكسسوار والجيمنج', m: 'dark', f: 'changa', r: 18, sh: 3, bgk: 'pat', pat: 'grid',
      D: { bg: '#07060f', bg2: '#140a2e', card: '#120f24', ink: '#eef0ff', mut: '#a7a2d6', line: '#2b2552', soft: '#181333', inp: '#0d0b1c', inl: '#3a3270', pimg: '#1a1536', hd1: '#2a0f5c', hd2: '#07060f', hdink: '#ffffff', hdsub: '#b9b3ff', ac: '#a855f7', deal1: '#3b0f7a', deal2: '#0b2a4a', glow: '#22d3ee' } },
    glass: { n: 'زجاجي', d: 'خلفية متدرّجة وكروت شفافة زي الزجاج', m: 'auto', f: 'tajawal', r: 24, sh: 2, bgk: 'grad',
      L: { bg: '#dde7ff', bg2: '#f6dcff', card: 'rgba(255,255,255,.72)', ink: '#14213d', mut: '#4b5875', line: 'rgba(255,255,255,.8)', soft: 'rgba(255,255,255,.55)', inp: 'rgba(255,255,255,.85)', inl: '#c7d2ee', pimg: 'rgba(255,255,255,.6)', hd1: '#4559d4', hd2: '#7434e0', hdink: '#ffffff', hdsub: '#ffffff', deal1: '#4f46e5', deal2: '#be185d' },
      D: { bg: '#0d1030', bg2: '#2a0d3a', card: 'rgba(255,255,255,.08)', ink: '#eef1ff', mut: '#a9b1d6', line: 'rgba(255,255,255,.14)', soft: 'rgba(255,255,255,.06)', inp: 'rgba(255,255,255,.08)', inl: 'rgba(255,255,255,.22)', pimg: 'rgba(255,255,255,.06)', hd1: '#3b3fb8', hd2: '#7a2a9c', hdink: '#ffffff', hdsub: '#d7d9ff', deal1: '#4338ca', deal2: '#9d174d' } },
    warm: { n: 'دافي', d: 'كريمي وبرتقالي محروق، هادي ومريح', m: 'light', f: 'almarai', r: 22, sh: 1, bgk: 'pat', pat: 'dots',
      L: { bg: '#fbf5ec', bg2: '#f6e7d3', card: '#fffdf9', ink: '#3b2414', mut: '#7a5a45', line: '#efdfcc', soft: '#f8ecdd', inp: '#fffdf9', inl: '#e3cdb4', pimg: '#f7ebdc', hd1: '#a94a12', hd2: '#7a2e0e', hdink: '#fffaf3', hdsub: '#fff1e2', ac: '#b8500f', deal1: '#b44a12', deal2: '#7a2e0e' },
      D: { bg: '#1a120c', bg2: '#2a1a10', card: '#261a12', ink: '#f6e9dc', mut: '#cdb29a', line: '#3b2a1e', soft: '#2e2016', inp: '#1f150e', inl: '#4a3527', pimg: '#2e2016', hd1: '#8a3a12', hd2: '#1a120c', hdink: '#fff6ec', hdsub: '#f3d2b4', ac: '#e07a3a', deal1: '#9a3d10', deal2: '#4a1d08' } },
    ramadan: { n: 'رمضان كريم', d: 'فوانيس متحركة وهلال ونجوم ونقشة إسلامية، وعدّ للفطار', m: 'dark', f: 'messiri', r: 22, sh: 2, bgk: 'pat', pat: 'islamic',
      D: { bg: '#071427', bg2: '#0c2b24', card: '#0f2038', ink: '#fbf3dc', mut: '#c9b98f', line: '#233a5c', soft: '#132845', inp: '#0b1a30', inl: '#2e4a72', pimg: '#142b4a', hd1: '#0f3d2e', hd2: '#071427', hdink: '#fbf3dc', hdsub: '#e9d6a0', ac: '#e9b949', deal1: '#7a1f3d', deal2: '#0f3d2e', glow: '#ffd77a' },
      L: { bg: '#fbf6e9', bg2: '#f1ead3', card: '#ffffff', ink: '#1d2b25', mut: '#56655a', line: '#e6dcc0', soft: '#f6efdc', inp: '#ffffff', inl: '#d9cba3', pimg: '#f6efdc', hd1: '#0f5a43', hd2: '#0b2a4a', hdink: '#fbf3dc', hdsub: '#f1dfa8', ac: '#0f6e50', deal1: '#7a1f3d', deal2: '#0f3d2e' } },
  };
  var ORDER = ['base', 'lux', 'clean', 'neon', 'glass', 'warm', 'ramadan'];
  // مدن للعدّ للفطار (لو مكان المحل مش متحدد في التوصيل)
  var CITIES = { cairo: ['القاهرة', 30.0444, 31.2357], giza: ['الجيزة', 30.0131, 31.2089], alex: ['الإسكندرية', 31.2001, 29.9187], qalyub: ['بنها', 30.4659, 31.1848], mansoura: ['المنصورة', 31.0409, 31.3785],
    tanta: ['طنطا', 30.7865, 31.0004], zagazig: ['الزقازيق', 30.5877, 31.502], ismailia: ['الإسماعيلية', 30.5965, 32.2715], portsaid: ['بورسعيد', 31.2653, 32.3019], suez: ['السويس', 29.9668, 32.5498],
    damietta: ['دمياط', 31.4165, 31.8133], kafr: ['كفر الشيخ', 31.1107, 30.9388], menof: ['شبين الكوم', 30.5585, 31.0118], damanhur: ['دمنهور', 31.0341, 30.4682], fayoum: ['الفيوم', 29.3084, 30.8428],
    bsuef: ['بني سويف', 29.0661, 31.0994], minya: ['المنيا', 28.1099, 30.7503], asyut: ['أسيوط', 27.1809, 31.1837], sohag: ['سوهاج', 26.5591, 31.6948], qena: ['قنا', 26.1551, 32.716],
    luxor: ['الأقصر', 25.6872, 32.6396], aswan: ['أسوان', 24.0889, 32.8998], hurghada: ['الغردقة', 27.2579, 33.8116], matrouh: ['مرسى مطروح', 31.3543, 27.2373], arish: ['العريش', 31.1316, 33.7984],
    dubai: ['دبي', 25.2048, 55.2708], abudhabi: ['أبوظبي', 24.4539, 54.3773], riyadh: ['الرياض', 24.7136, 46.6753], jeddah: ['جدة', 21.4858, 39.1925], kuwait: ['الكويت', 29.3759, 47.9774], doha: ['الدوحة', 25.2854, 51.531] };

  function one(v, l, d) { return l.indexOf(v) >= 0 ? v : d; }
  function num(v, a, b, d) { v = Math.round(+v); return v >= a && v <= b ? v : d; }
  function txt(v, n) { return String(v == null ? '' : v).replace(/[<>]/g, '').slice(0, n); }
  function arr(v, list) { var o = []; (Object.prototype.toString.call(v) === '[object Array]' ? v : []).forEach(function (x) { if (list.indexOf(x) >= 0 && o.indexOf(x) < 0) o.push(x); }); return o; }
  // نفس القواعد في store.js (الكاشير) قبل الحفظ
  function clean(th) {
    th = th && typeof th === 'object' ? th : {};
    var id = one(th.id, ORDER, 'base'), P = PRESETS[id], c = {}, cs = th.c && typeof th.c === 'object' ? th.c : {};
    ['bg', 'bg2', 'card', 'ink', 'hd1', 'hd2', 'ac', 'deal1', 'deal2'].forEach(function (k) { if (HEX.test(cs[k] || '')) c[k] = cs[k].toLowerCase(); });
    var dv = {}, src = th.dv && typeof th.dv === 'object' ? th.dv : {};
    ['m', 'd'].forEach(function (k) { var s = src[k] && typeof src[k] === 'object' ? src[k] : {};
      dv[k] = { cols: num(s.cols, k === 'm' ? 1 : 3, k === 'm' ? 3 : 6, 0), hd: one(s.hd, ['big', 'slim'], 'big'), fs: num(s.fs, 90, 115, 100), ord: arr(s.ord, SECS), hide: arr(s.hide, SECS) }; });
    var r = th.rm && typeof th.rm === 'object' ? th.rm : {};
    var m = one(th.m, ['auto', 'light', 'dark'], P.m); if (id !== 'base') { if (!P.L) m = 'dark'; else if (!P.D) m = 'light'; }   // الثيم اللي ليه شكل واحد (فخم، نيون، فاتح) بيفضل عليه
    return { id: id, m: m, c: c, bgk: one(th.bgk, ['plain', 'grad', 'pat'], P.bgk || 'plain'), pat: one(th.pat, ['dots', 'grid', 'waves', 'islamic', 'stars'], P.pat || 'dots'),
      r: num(th.r, 4, 32, P.r || 0), sh: num(th.sh, 0, 3, P.sh == null ? 1 : P.sh), f: one(th.f, Object.keys(FONTS), P.f || 'cairo'), fx: th.fx !== false, dv: dv,
      rm: { greet: txt(r.greet, 40), sub: txt(r.sub, 80), ift: r.ift !== false, city: one(r.city, Object.keys(CITIES), 'cairo'), lan: r.lan !== false } };
  }

  /* ===== شروق/غروب الشمس (معادلة الشروق، الدقة حوالي دقيقة): المغرب = الغروب + دقيقة احتياط ===== */
  function sunset(lat, lng, day) {   // day: Date (أي وقت في اليوم ده بتوقيت UTC)
    var R = Math.PI / 180, JD = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12) / 864e5 + 2440587.5;
    var n = Math.round(JD - 2451545.0 + 0.0008), Js = n - lng / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360, Cc = 1.9148 * Math.sin(M * R) + 0.02 * Math.sin(2 * M * R) + 0.0003 * Math.sin(3 * M * R);
    var L = (M + Cc + 180 + 102.9372) % 360, Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * R) - 0.0069 * Math.sin(2 * L * R);
    var sd = Math.sin(L * R) * Math.sin(23.4397 * R), cd = Math.cos(Math.asin(sd));
    var cw = (Math.sin(-0.833 * R) - Math.sin(lat * R) * sd) / (Math.cos(lat * R) * cd); if (cw < -1 || cw > 1) return null;
    var w0 = Math.acos(cw) / R; return new Date((Jt + w0 / 360 - 2440587.5) * 864e5);
  }
  function maghrib(lat, lng, now) {
    now = now || new Date();
    var t = sunset(lat, lng, now); if (!t) return null; t = new Date(t.getTime() + 60e3);
    if (t.getTime() < now.getTime() - 6 * 36e5) t = new Date(sunset(lat, lng, new Date(now.getTime() + 864e5)).getTime() + 60e3);   // الغروب ده بتاع امبارح بتوقيت UTC
    return t;
  }

  var CUR = clean(null), MQ = W.matchMedia ? W.matchMedia('(prefers-color-scheme: dark)') : null, fontsOn = {}, ticker = 0;
  function mode() { return CUR.m; }
  // خلفيات الثيم الحالي (hex بس) علشان لون المحل يتظبط عليها ويفضل مقروء (store.js accentVars)
  function bgs() {
    var P = PRESETS[CUR.id], T = (isDark() ? P.D || P.L : P.L || P.D) || {}, out = [], base = CUR.c.bg || T.bg;
    [CUR.c.bg || T.bg, CUR.c.bg2 || T.bg2, CUR.c.card || T.card, T.soft].forEach(function (x) {
      if (HEX.test(x || '')) return out.push(x);
      // كروت شفافة (الزجاجي): اللون اللي بيبان فعلًا = الكارت فوق الخلفية
      var m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(String(x || '')); if (!m || !HEX.test(base || '')) return;
      var a = +m[4], b = parseInt(base.slice(1), 16), mix = function (c, bc) { return Math.round(c * a + bc * (1 - a)); };
      out.push('#' + ((1 << 24) + (mix(+m[1], b >> 16 & 255) << 16) + (mix(+m[2], b >> 8 & 255) << 8) + mix(+m[3], b & 255)).toString(16).slice(1));
    });
    return out;
  }
  function isDark() { return CUR.m === 'dark' || (CUR.m === 'auto' && !!(MQ && MQ.matches)); }
  function patURL(pat, col) {
    var c = encodeURIComponent(col), svg = {
      dots: "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><circle cx='3' cy='3' r='1.6' fill='" + c + "'/></svg>",
      grid: "<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34'><path d='M34 0H0V34' fill='none' stroke='" + c + "' stroke-width='1'/></svg>",
      waves: "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='20'><path d='M0 10 Q15 0 30 10 T60 10' fill='none' stroke='" + c + "' stroke-width='1.4'/></svg>",
      stars: "<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><path d='M14 10l1.6 3.4 3.7.4-2.8 2.5.8 3.7L14 18l-3.3 2 .8-3.7-2.8-2.5 3.7-.4z M52 44l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.3-2.1 1.3.5-2.4-1.8-1.6 2.4-.3z' fill='" + c + "'/></svg>",
      // نجمة ثُمانية (نقشة إسلامية) بتتكرر
      islamic: "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><g fill='none' stroke='" + c + "' stroke-width='1.2'><path d='M32 6l7.5 18.5L58 32l-18.5 7.5L32 58l-7.5-18.5L6 32l18.5-7.5z'/><path d='M32 14l12.7 5.3L50 32l-5.3 12.7L32 50l-12.7-5.3L14 32l5.3-12.7z'/><path d='M0 0l6 6M64 0l-6 6M0 64l6-6M64 64l-6-6'/></g></svg>"
    }[pat] || '';
    return svg ? "url(\"data:image/svg+xml," + svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'").replace(/#/g, '%23') + "\")" : 'none';
  }
  function loadFont(k) {
    if (k === 'cairo' || fontsOn[k] || !FONTS[k]) return; fontsOn[k] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + FONTS[k][1] + '&display=swap'; document.head.appendChild(l);
  }
  var VARS = ['--bg', '--card', '--ink', '--mut', '--line', '--soft', '--inp', '--inl', '--pimg', '--th-hd', '--th-hdink', '--th-hdsub', '--th-deal', '--th-body', '--th-glow', '--th-font', '--th-r', '--th-cardsh',
    '--mcols', '--dcols', '--mfs', '--dfs'].concat(SECS.map(function (s) { return '--mo-' + s; })).concat(SECS.map(function (s) { return '--do-' + s; }));
  // الألوان: الثيم (فاتح/غامق) وفوقه ألوان المحل. بيرجّع لون الزرار (ac) لو الثيم أو المحل غيّره، وإلا '' (لون المحل)
  function apply(th) {
    CUR = clean(th); var d = document.documentElement, P = PRESETS[CUR.id], dk = isDark();
    d.classList.toggle('dk', dk);
    VARS.forEach(function (k) { d.style.removeProperty(k); });
    var cls = (d.className || '').split(/\s+/).filter(function (x) { return x && x !== 'dk' && !/^(th-|hm-|hd-|dv-)/.test(x); });
    if (CUR.id === 'base' && !Object.keys(CUR.c).length && CUR.bgk === 'plain' && !CUR.r && CUR.f === 'cairo') { d.removeAttribute('data-th'); }
    else d.setAttribute('data-th', CUR.id);
    var T = (dk ? P.D || P.L : P.L || P.D) || {}, c = CUR.c, set = function (k, v) { if (v) d.style.setProperty(k, v); };
    if (CUR.id !== 'base') ['bg', 'card', 'ink', 'mut', 'line', 'soft', 'inp', 'inl', 'pimg'].forEach(function (k) { set('--' + k, T[k]); });
    if (c.bg) set('--bg', c.bg); if (c.card) { set('--card', c.card); set('--pimg', c.card); } if (c.ink) set('--ink', c.ink);
    var hd1 = c.hd1 || T.hd1, hd2 = c.hd2 || T.hd2; if (hd1 && hd2) set('--th-hd', 'radial-gradient(130% 120% at 100% 0%, ' + hd1 + ', transparent 62%), linear-gradient(160deg, ' + hd2 + ', ' + hd1 + ')');
    if (T.hdink) set('--th-hdink', T.hdink); if (T.hdsub) set('--th-hdsub', T.hdsub);
    if (c.deal1 || T.deal1) set('--th-deal', 'linear-gradient(120deg, ' + (c.deal1 || T.deal1) + ', ' + (c.deal2 || T.deal2 || c.deal1 || T.deal1) + ')');
    if (T.glow) set('--th-glow', T.glow);
    // الخلفية
    var bg = c.bg || T.bg || (dk ? '#070b14' : '#f7f8fb'), bg2 = c.bg2 || T.bg2 || bg, pc = (c.ink || T.ink || (dk ? '#ffffff' : '#0b1f4d'));
    if (CUR.bgk === 'grad') set('--th-body', 'linear-gradient(160deg, ' + bg + ', ' + bg2 + ') fixed');
    else if (CUR.bgk === 'pat') set('--th-body', patURL(CUR.pat, pc + (dk ? '17' : '12')) + ', linear-gradient(160deg, ' + bg + ', ' + bg2 + ') fixed');
    if (CUR.r) set('--th-r', CUR.r + 'px');
    set('--th-cardsh', ['none', '0 2px 10px #0a1a4410', '0 8px 24px #0a1a441c', '0 14px 34px #0a1a4430'][CUR.sh] + (dk && CUR.sh ? ', 0 0 0 1px #ffffff0a' : ''));
    if (CUR.f !== 'cairo') { loadFont(CUR.f); set('--th-font', "'" + FONTS[CUR.f][0] + "', 'Cairo', system-ui, Tahoma, sans-serif"); }
    // لكل جهاز: الأعمدة والحجم والترتيب والمستخبي وشكل الراس
    ['m', 'd'].forEach(function (k) { var v = CUR.dv[k];
      if (v.cols) set('--' + k + 'cols', String(v.cols)); if (v.fs !== 100) set('--' + k + 'fs', String(v.fs / 100));
      v.ord.forEach(function (s, i) { set('--' + k + 'o-' + s, String(10 + i)); });
      v.hide.forEach(function (s) { cls.push('hm-' + k + '-' + s); }); if (v.hd === 'slim') cls.push('hd-' + k + '-slim'); if (v.cols) cls.push('dv-' + k + 'cols'); if (v.fs !== 100) cls.push('dv-' + k + 'fs'); });
    if (!CUR.fx) cls.push('th-still');
    d.className = cls.concat(dk ? ['dk'] : []).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' ');
    try { var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = (CUR.id === 'base' && !c.hd2) ? '#0a1a44' : (hd2 || T.bg || '#0a1a44'); } catch (e) {}
    deco();
    return c.ac || T.ac || '';
  }
  /* ===== زينة رمضان: فوانيس متعلّقة بتتهز، هلال ونجوم (مرسومين SVG، من غير صور) ===== */
  function lantern(col, glass, h) {
    return '<svg viewBox="0 0 40 90" width="' + Math.round(h * 40 / 90) + '" height="' + h + '"><line x1="20" y1="0" x2="20" y2="14" stroke="' + col + '" stroke-width="1.4"/><circle cx="20" cy="16" r="3" fill="none" stroke="' + col + '" stroke-width="1.6"/>'
      + '<path d="M10 24 Q20 15 30 24 L28 27 H12 Z" fill="' + col + '"/><path d="M12 27 H28 L33 52 Q20 60 7 52 Z" fill="' + glass + '" stroke="' + col + '" stroke-width="1.6"/>'
      + '<path d="M20 27 V58 M12 27 L10 54 M28 27 L30 54" stroke="' + col + '" stroke-width="1" opacity=".8"/><ellipse cx="20" cy="42" rx="5" ry="8" fill="#fff6c9" opacity=".75"/>'
      + '<path d="M8 53 Q20 62 32 53 L28 62 H12 Z" fill="' + col + '"/><path d="M15 62 H25 L20 72 Z" fill="' + col + '"/><circle cx="20" cy="76" r="2.4" fill="' + col + '"/></svg>';
  }
  function deco() {
    var old = document.getElementById('rd-deco'); if (old) old.remove();
    if (CUR.id !== 'ramadan' || !CUR.rm.lan) return;
    var gold = '#e9b949', L = [[70, '#c2185b55', 0], [52, '#0f9d5855', .7], [58, '#1e88e555', .35], [74, '#c2185b55', 1.1]];   // المكان لكل جهاز في theme.css (rd-l1..4)
    var el = document.createElement('div'); el.id = 'rd-deco'; el.className = 'rd-deco'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = L.map(function (x, i) { return '<i class="rd-lan rd-l' + (i + 1) + '" style="animation-delay:-' + x[2] + 's">' + lantern(gold, x[1], x[0]) + '</i>'; }).join('')
      + [12, 30, 48, 66, 78].map(function (x, i) { return '<b class="rd-star" style="left:' + x + '%;top:' + (8 + (i % 3) * 9) + 'px;animation-delay:-' + (i * .6) + 's">✦</b>'; }).join('');
    document.body.appendChild(el);
  }
  /* ===== شريط رمضان في الرئيسية: تهنئة + عدّ للفطار ===== */
  function coords(C) { var ct = C && C.del && C.del.center; if (ct && isFinite(+ct.lat) && isFinite(+ct.lng)) return [+ct.lat, +ct.lng, '']; var c = CITIES[CUR.rm.city] || CITIES.cairo; return [c[1], c[2], c[0]]; }
  function homeTop(C) {
    if (CUR.id !== 'ramadan') return '';
    var g = CUR.rm.greet || 'رمضان كريم', s = CUR.rm.sub, h = '<div class="rd-greet" data-s="rm"><b>🌙 ' + esc(g) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '');
    if (CUR.rm.ift) { var xy = coords(C); h += '<span class="rd-ift" data-ift="' + xy[0] + ',' + xy[1] + '"' + (xy[2] ? ' title="' + esc(xy[2]) + '"' : '') + '></span>'; }
    return h + '</div>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tick() {
    var els = document.querySelectorAll('[data-ift]'); if (!els.length) return;
    var now = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    for (var i = 0; i < els.length; i++) {
      var xy = els[i].getAttribute('data-ift').split(','), t = maghrib(+xy[0], +xy[1], now); if (!t) continue;
      var left = t.getTime() - now.getTime(), at = t.toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
      if (left > 0 && left < 18 * 36e5) { var hh = Math.floor(left / 36e5), mm = Math.floor(left / 6e4) % 60, ss = Math.floor(left / 1e3) % 60;
        els[i].innerHTML = '<em>فاضل على الفطار</em><b class="num">' + p2(hh) + ':' + p2(mm) + ':' + p2(ss) + '</b><small>المغرب ' + at + '</small>'; }
      else els[i].innerHTML = '<em>تقبّل الله صيامكم</em><b>🤲</b><small>المغرب ' + at + '</small>';
    }
  }
  function startTick() { if (!ticker) ticker = setInterval(tick, 1000); tick(); }
  if (MQ) { var onMq = function () { if (CUR.m === 'auto') { document.documentElement.classList.toggle('dk', MQ.matches); if (W.RdTheme && W.RdTheme.onChange) W.RdTheme.onChange(); } }; if (MQ.addEventListener) MQ.addEventListener('change', onMq); else if (MQ.addListener) MQ.addListener(onMq); }
  // معاينة من صفحة "شكل المتجر" في الكاشير (iframe): الكاشير بيبعت الثيم اللي بيتعدّل، والمتجر بيتلبسه على طول من غير حفظ
  W.addEventListener('message', function (e) {
    if (W.parent === W || e.source !== W.parent || !e.data || e.data.rd !== 'theme') return;
    W.RdTheme.preview = true; if (W.RdTheme.onPreview) W.RdTheme.onPreview(e.data.th);
  });
  W.RdTheme = { PRESETS: PRESETS, ORDER: ORDER, FONTS: FONTS, CITIES: CITIES, SECS: SECS, SEC_N: SEC_N, clean: clean, apply: apply, mode: mode, bgs: bgs, isDark: isDark, homeTop: homeTop, startTick: startTick, maghrib: maghrib, sunset: sunset, cur: function () { return CUR; } };
})(window);
