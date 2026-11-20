/* المتجر على موبايل الصاحب "زي الكاشير" (خالد 2026-11-14، فكرة 1: تبويب جديد): الطلبات حسب الحالة + السجل، المنتجات (يظهر/يستخبى، السعر،
   العرض، التعديل بالصور)، وإعدادات المتجر (مفتوح/مقفول واللينك). البيانات من جزء "store" المتشفّر (fulldata.js) وإلا من الملخص،
   وأي تغيير = طلب للكاشير (op store: item / open) وهو اللي بينشر في المتجر، زي باقي التطبيق. الصور بتترفع من الموبايل على طول (store-img-m). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const IMG = (slug, n) => `https://sgqscttmkhmiqyjsuvio.supabase.co/storage/v1/object/public/store/${encodeURIComponent(slug || '')}/i/${encodeURIComponent(n)}`;
  const GRP = { ph: '📱 موبايلات', prot: '🛡 حماية', power: '⚡ شحن', audio: '🎧 صوت', wear: '⌚ ساعات', pc: '💻 كمبيوتر', misc: '💾 وحدات تخزين', adp: '🔀 محولات', batt: '🔋 بطاريات', other: '📦 أخرى', part: '🔩 قطع غيار' };
  let tab = 'orders', col = 'new', pf = 'all', pq = '';
  const sent = window.__spSent = window.__spSent || {};   // تعديل منتج اتبعت ومستني الكاشير
  const sentOp = {}, doneP = {}, sentW = {};   // رقم الطلب ← المنتج، والمنتجات اللي الكاشير سجّلها ومستنية البيانات الجديدة
  const P = () => { const f = window.Owner && Owner.full && Owner.full(); return f && f.store ? f.store : null; };
  const S = () => (window.OwnerStore ? OwnerStore.S() : null);
  const offOn = w => !!(w && w.off && w.off.pr > 0 && (!w.off.to || (/^\d{4}-\d{2}-\d{2}$/.test(w.off.to) ? new Date(w.off.to + 'T23:59:59').getTime() : Date.parse(w.off.to)) >= Date.now()) && (!w.off.from || Date.parse(w.off.from) <= Date.now()));
  const grp = x => (x.web && x.web.c) || x.auto || (x.cat === 'dev' ? 'ph' : 'misc');
  const catName = (p, id) => { const c = ((p && p.cats) || []).find(x => x.id === id); return c ? `${c.ic || ''} ${c.n}` : GRP[id] || ''; };
  const today = () => new Date().toLocaleDateString('sv');
  const noImg = x => !!(x.web && x.web.on) && !((x.web.img || []).length);   // ظاهر في المتجر ومالوش صورة (2026-11-16)

  function view() {
    const s = S(), p = P();
    if (!s && !p) return '<div class="card"><div class="empty">المتجر مش متفعّل على الكاشير (الإعدادات ← 🛒 المتجر الإلكتروني)</div></div>';
    const open = s && s.orders ? s.orders.filter(o => OwnerStore.COL(o) !== 'end').length : 0;
    const seg = `<div class="seg"><button class="${tab === 'orders' ? 'on' : ''}" data-stt="orders">🛒 الطلبات${open ? ` <span class="num">${open}</span>` : ''}</button><button class="${tab === 'prods' ? 'on' : ''}" data-stt="prods">🛍 المنتجات</button><button class="${tab === 'revs' ? 'on' : ''}" data-stt="revs">⭐</button><button class="${tab === 'set' ? 'on' : ''}" data-stt="set">⚙️ المتجر</button></div>`;
    return seg + (tab === 'prods' ? prods(p) : tab === 'set' ? settings(p, s) : tab === 'revs' ? revs(p) : orders(s));
  }
  /* ---------- الطلبات: نفس أعمدة الكاشير (جديد / بيتجهز / جاهز / مع المندوب / خلص النهارده) + السجل ---------- */
  function orders(s) {
    if (!s || !s.orders) return '<div class="card"><div class="empty">مفيش طلبات لسه</div></div>';
    const os = s.orders, end = o => OwnerStore.COL(o) === 'end', upDay = o => new Date(o.up || o.at).toLocaleDateString('sv');
    const lists = { new: os.filter(o => OwnerStore.COL(o) === 'new'), prep: os.filter(o => OwnerStore.COL(o) === 'prep'), ready: os.filter(o => OwnerStore.COL(o) === 'ready'), out: os.filter(o => OwnerStore.COL(o) === 'out'),
      end: os.filter(o => end(o) && upDay(o) === today()), log: os.filter(o => end(o) && upDay(o) !== today()) };
    const C = [['new', '🆕 جديد'], ['prep', '📦 بيتجهز'], ['ready', '✅ جاهز'], ['out', '🛵 مع المندوب'], ['end', '💰 خلص النهارده'], ['log', '📜 السجل']];
    if (!lists[col].length && col !== 'log') { const f = C.find(([k]) => lists[k].length && k !== 'log'); if (f) col = f[0]; }
    const c = s.counts || {};
    return `<div class="sh-chips">${C.map(([k, n]) => `<button class="${col === k ? 'on' : ''}" data-stc="${k}">${n}${lists[k].length ? ` <i class="${k === 'new' ? 'hot' : ''}">${lists[k].length}</i>` : ''}</button>`).join('')}</div>
      <div class="so-kp card"><span><b class="num">${c.open || 0}</b><small>شغالين</small></span><span><b class="num o">${fmt(c.courierCash || 0)}</b><small>مع المناديب</small></span><span><b class="num">${c.instaWait || 0}</b><small>انستا مستنية</small></span></div>
      <div class="card">${lists[col].length ? lists[col].slice(0, 120).map(OwnerStore.row).join('') : `<div class="empty">${col === 'log' ? 'مفيش طلبات قديمة في آخر 30 يوم' : 'مفيش طلبات هنا'}</div>`}</div>`;
  }
  /* ---------- المنتجات: زي "المنتجات" على الكاشير ---------- */
  function prods(p) {
    if (!p) return '<div class="card"><div class="empty">المنتجات هتظهر بعد ما الموبايل يتربط بالـ QR الجديد والكاشير يبعت المتجر</div></div>';
    const xs = p.prods || [], nOn = xs.filter(x => x.web && x.web.on).length, groups = [...new Set(xs.map(grp))];
    const F = [['all', '📋 الكل', xs.length], ['on', '👁 ظاهر', nOn], ['off', '🙈 مش ظاهر', xs.length - nOn], ['deal', '🔥 عليه عرض', xs.filter(x => offOn(x.web)).length], ...(xs.some(noImg) ? [['noimg', '📷 من غير صورة', xs.filter(noImg).length]] : []), ...groups.map(g => [g, catName(p, g), xs.filter(x => grp(x) === g).length])];
    const q = pq.trim().toLowerCase();
    const list = xs.filter(x => (!q || String((x.web && x.web.n) || x.name).toLowerCase().includes(q)) && (pf === 'all' || (pf === 'on' ? x.web && x.web.on : pf === 'off' ? !(x.web && x.web.on) : pf === 'deal' ? offOn(x.web) : pf === 'noimg' ? noImg(x) : grp(x) === pf)));
    return `<div class="sh-chips">${F.map(([k, n, c]) => `<button class="${pf === k ? 'on' : ''}" data-spf="${esc(k)}">${esc(n)} ${c}</button>`).join('')}</div>
      <input class="sh-q" id="sp-q" type="search" placeholder="🔍 دوّر على منتج" value="${esc(pq)}">
      ${list.length ? list.slice(0, 200).map(x => card(p, x)).join('') : '<div class="card"><div class="empty">مفيش منتجات هنا</div></div>'}`;
  }
  function card(p, x) {
    const w = x.web || {}, pr = w.pr || x.price, on = offOn(w), wait = sent[x.id];
    return `<div class="sp-c${w.on ? ' on' : ''}" data-spid="${esc(x.id)}">
      <div class="sp-th">${w.img && w.img[0] ? `<img src="${IMG(p.slug, w.img[0])}" alt="" loading="lazy">` : x.cat === 'dev' ? '📱' : '📦'}</div>
      <div class="sp-m"><b>${esc(w.n || x.name)}</b><small>${esc(catName(p, grp(x)))}${x.cat === 'dev' ? ' · ' + (w.st === 'new' ? 'جديد' : 'مستعمل') : ' · المخزن ' + fmt(x.qty)}${x.res ? ' · محجوز ' + x.res : ''}</small>
        <div class="sp-pr"><input type="number" inputmode="decimal" min="0" data-spp="${esc(x.id)}" value="${pr ? esc(pr) : ''}" placeholder="${w.ask ? 'اسأل' : 'السعر'}" ${wait ? 'disabled' : ''}><span>ج</span>${on ? `<s>${fmt(pr)}</s><b class="sp-off">🔥 ${fmt(w.off.pr)}</b>` : ''}</div>
        ${wait ? '<div class="sp-wait">⏳ مستني الكاشير</div>' : ''}</div>
      <div class="sp-side"><button class="sp-sw ${w.on ? 'on' : ''}" data-spt="${esc(x.id)}" aria-label="${w.on ? 'ظاهر في المتجر' : 'مش ظاهر'}" ${wait ? 'disabled' : ''}><i></i></button><button class="sp-b${on ? ' hot' : ''}" data-spd="${esc(x.id)}" aria-label="عرض">🔥</button><button class="sp-b" data-spe="${esc(x.id)}" aria-label="تعديل">✏️</button></div></div>`;
  }
  function settings(p, s) {
    const url = p && p.slug ? 'https://khalid374374.github.io/repair-desk/s/?s=' + encodeURIComponent(p.slug) : '';
    const open = p ? p.open : true;
    return `<div class="card"><div class="row"><span>🟢 المتجر مفتوح للطلبات<small class="mut" style="display:block">لو قفلته العملا بيشوفوا "المتجر مقفول مؤقتًا"</small></span><button class="sp-sw ${open ? 'on' : ''}" data-sopen="${open ? 0 : 1}" ${!p ? 'disabled' : ''}><i></i></button></div></div>
      ${url ? `<div class="card"><div class="lbl">🔗 لينك المتجر</div><div class="sp-url num">${esc(url)}</div><div class="call2"><button class="act" data-surl="copy">📋 انسخ</button><button class="act wa" data-surl="share">📤 ابعته</button></div></div>` : ''}
      <div class="lbl sh-note">باقي إعدادات المتجر (الدفع، التوصيل، الكوبونات، الشكل) من الكاشير: الإعدادات ← 🛒 المتجر الإلكتروني.</div>`;
  }
  /* ---------- ⭐ التقييمات (خالد 2026-11-16): زي الكاشير — تشوف كل الآراء، تخبّي/تظهر، وترد. من السيرفر على طول بمفتاح الموبايل (حتى والكاشير مقفول) ---------- */
  let RV = null, rvF = 'all', rvAt = 0, rvBusy = false;
  async function loadRevs(force) {
    if (rvBusy || (!force && RV && Date.now() - rvAt < 60000)) return;
    rvBusy = true;
    try { const r = await OwnerLink.call({ action: 'store-rev-list-m' }); if (r && r.ok) { RV = r.reviews || []; rvAt = Date.now(); } else if (r && r.error) Owner.toast(r.error, true); } catch (e) {}
    rvBusy = false; if (tab === 'revs') Owner.repaint();
  }
  const stars = n => `<span class="rv-st">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  function revs(p) {
    if (!RV) { loadRevs(); return '<div class="card"><div class="empty">⏳ بنجيب التقييمات...</div></div>'; }
    const nm = pid => { const x = ((p && p.prods) || []).find(y => y.id === pid || y.id === 'dev-' + pid); return x ? ((x.web && x.web.n) || x.name) : ''; };
    const vis = RV.filter(x => !x.hidden), avg = vis.length ? Math.round(vis.reduce((a, x) => a + x.stars, 0) / vis.length * 10) / 10 : 0;
    const F = [['all', 'الكل', RV.length], ['noreply', 'من غير رد', RV.filter(x => !x.reply).length], ['low', '1–2 نجوم', RV.filter(x => x.stars <= 2).length], ['hidden', 'مخفية', RV.filter(x => x.hidden).length]];
    const list = RV.filter(x => rvF === 'all' || (rvF === 'noreply' ? !x.reply : rvF === 'low' ? x.stars <= 2 : x.hidden));
    return `<div class="card rv-sum"><b class="num">${avg || '—'}</b><span>${stars(Math.round(avg))}<small>${vis.length} تقييم ظاهر في المتجر</small></span></div>
      <div class="sh-chips">${F.map(([k, n, c]) => `<button class="${rvF === k ? 'on' : ''}" data-rvf="${k}">${n} ${c}</button>`).join('')}</div>
      ${list.length ? list.map(x => `<div class="card rv${x.hidden ? ' hid' : ''}"><div class="rv-h">${stars(x.stars)}<b>${esc(nm(x.pid) || 'منتج')}</b></div>
        <div class="rv-m">${esc(x.name || '')} · <span class="num">W-${esc(x.no || '')}</span> · ${new Date(x.created_at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' })}${x.hidden ? ' · 🙈 مخفي' : ''}</div>
        ${x.text ? `<p>${esc(x.text)}</p>` : '<p class="mut">من غير كلام</p>'}
        ${x.reply ? `<div class="rv-rp"><b>💬 ردّك</b>${esc(x.reply)}</div>` : ''}
        <div class="call2"><button class="act" data-rvr="${esc(x.id)}">💬 ${x.reply ? 'عدّل الرد' : 'رد'}</button><button class="act" data-rvh="${esc(x.id)}">${x.hidden ? '👁 أظهره' : '🙈 خبّيه'}</button></div></div>`).join('')
        : `<div class="card"><div class="empty">${RV.length ? 'مفيش تقييمات هنا' : 'لسه مفيش تقييمات. العملا بيقيّموا من صفحة طلبهم بعد ما يوصلهم.'}</div></div>`}`;
  }
  async function revSet(id, o) { const r = await OwnerLink.call({ action: 'store-rev-set-m', id, ...o }); if (!r || r.error) { Owner.toast((r && r.error) || 'ماتمّش، جرّب تاني', true); return false; } return true; }
  function replySheet(x) {
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>💬 رد على ${esc(x.name || 'العميل')}</h3>${x.text ? `<div class="lbl">${stars(x.stars)} ${esc(x.text)}</div>` : ''}
      <div class="card fm" style="margin-top:12px"><label>ردّك<textarea id="rv-t" maxlength="400" rows="4" placeholder="مثلًا: شكرًا لذوقك، ومستنيينك تاني 🙏">${esc(x.reply || '')}</textarea></label>
        <div class="lbl">الرد بيظهر تحت رأيه في المتجر.</div>
        <button class="pair-btn" id="rv-ok">احفظ الرد</button>${x.reply ? '<button class="act no" id="rv-rm" style="margin-top:8px;width:100%">امسح الرد</button>' : ''}</div>`);
    $('#rv-ok').onclick = async () => { const v = $('#rv-t').value.trim(); if (!v) return $('#rv-t').focus(); if (await revSet(x.id, { reply: v })) { x.reply = v; Owner.closeSheet(); Owner.toast('✓ الرد اتنشر'); Owner.repaint(); } };
    const rm = $('#rv-rm'); if (rm) rm.onclick = async () => { if (await revSet(x.id, { reply: '' })) { x.reply = null; Owner.closeSheet(); Owner.toast('الرد اتشال'); Owner.repaint(); } };
  }
  /* ---------- التعديل والعرض ---------- */
  const prodOf = id => ((P() || {}).prods || []).find(x => x.id === id);
  async function submit(x, w, label) {
    const r = await OwnerLink.submit({ kind: 'store', act: 'item', id: x.id, w }, label || ('🛍 ' + ((x.web && x.web.n) || x.name)));
    if (r.error) { Owner.toast(r.error, true); return false; }
    sent[x.id] = Date.now(); if (r.id) sentOp[r.id] = x.id; sentW[x.id] = w; Owner.toast('📤 اتبعت للكاشير'); Owner.repaint(); return true;
  }
  function dealSheet(x) {
    const w = x.web || {}, pr = w.pr || x.price || 0, on = offOn(w);
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>🔥 عرض على ${esc(w.n || x.name)}</h3><div class="lbl">السعر دلوقتي ${fmt(pr)} ج، هيتشطب في المتجر وجنبه سعر العرض</div>
      <div class="card fm" style="margin-top:12px"><label>سعر العرض<input id="dl-pr" type="number" inputmode="decimal" min="1" value="${on ? esc(w.off.pr) : ''}"></label>
        <label>لحد إمتى <small class="mut">(فاضي = لحد ما تشيله)</small><input id="dl-to" type="date" value="${on && w.off.to ? new Date(w.off.to).toLocaleDateString('sv') : ''}"></label>
        <div class="lbl" id="dl-h"></div>
        <button class="pair-btn" id="dl-ok">🔥 شغّل العرض</button>${on ? '<button class="act no" id="dl-rm" style="margin-top:8px;width:100%">شيل العرض</button>' : ''}</div>`);
    const h = () => { const v = +$('#dl-pr').value || 0; $('#dl-h').textContent = v && pr && v < pr ? `خصم ${Math.round((1 - v / pr) * 100)}% · العميل بيوفّر ${fmt(pr - v)}` : ''; };
    $('#dl-pr').oninput = h; h();
    $('#dl-ok').onclick = async () => { const v = +$('#dl-pr').value || 0; if (!(v > 0) || v >= pr) return Owner.toast('سعر العرض لازم يبقى أقل من ' + fmt(pr), true); const to = $('#dl-to').value; if (await submit(x, { ...w, off: { pr: v, to: to ? to + 'T23:59:59' : '' } }, '🔥 عرض: ' + (w.n || x.name))) Owner.closeSheet(); };
    const rm = $('#dl-rm'); if (rm) rm.onclick = async () => { if (await submit(x, { ...w, off: null }, 'شيل العرض: ' + (w.n || x.name))) Owner.closeSheet(); };
  }
  let EDIT = null;   // { x, img: [...] } النافذة المفتوحة
  function editSheet(x) {
    const p = P(), w = x.web || {}; EDIT = { x, img: (w.img || []).slice() };
    const cats = (p.cats || []).length ? p.cats : Object.entries(GRP).map(([id, n]) => ({ id, n, ic: '' }));
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>✏️ ${esc(w.n || x.name)}</h3>
      <div class="card fm" style="margin-top:12px">
        <label>الصور <small class="mut">(لحد 4، من الكاميرا أو المعرض)</small><div class="sp-imgs" id="ed-imgs"></div><input type="file" id="ed-file" accept="image/*" hidden></label>
        <label>الاسم في المتجر<input id="ed-n" maxlength="80" value="${esc(w.n || x.name)}"></label>
        <div class="two"><label>السعر<input id="ed-pr" type="number" inputmode="decimal" min="0" value="${esc(w.pr || x.price || '')}"></label>
          <label>القسم<select id="ed-c"><option value="">${esc(GRP[x.auto] || 'تلقائي')}</option>${cats.map(c => `<option value="${esc(c.id)}"${w.c === c.id ? ' selected' : ''}>${esc((c.ic ? c.ic + ' ' : '') + c.n)}</option>`).join('')}</select></label></div>
        ${x.cat === 'dev' ? `<label>الحالة<select id="ed-st"><option value="new"${w.st === 'new' ? ' selected' : ''}>جديد متبرشم</option><option value="used"${w.st !== 'new' ? ' selected' : ''}>مستعمل</option></select></label>` : ''}
        <label>الضمان<input id="ed-w" maxlength="30" value="${esc(w.w || '')}" placeholder="مثلًا: سنة وكيل"></label>
        <label>الوصف<textarea id="ed-d" rows="3" maxlength="800">${esc(w.d || '')}</textarea></label>
        <div class="row"><span>💬 "اسأل على السعر" بدل السعر</span><button class="sp-sw ${w.ask ? 'on' : ''}" id="ed-ask" type="button"><i></i></button></div>
        <div class="row"><span>🔢 اعرض الكمية للعميل<small class="mut" style="display:block">لو قفلتها العميل مش هيشوف "فاضل كام"</small></span><button class="sp-sw ${w.hq ? '' : 'on'}" id="ed-sq" type="button"><i></i></button></div>
        <div class="err" id="ed-err"></div>
        <button class="pair-btn" id="ed-ok">💾 احفظ (بيتنشر في المتجر)</button></div>`);
    paintImgs();
    $('#ed-ask').onclick = () => $('#ed-ask').classList.toggle('on');
    $('#ed-sq').onclick = () => $('#ed-sq').classList.toggle('on');   // "اعرض الكمية" زي الكاشير (2026-11-17): مقفول = hq
    $('#ed-file').onchange = () => { const f = $('#ed-file').files[0]; $('#ed-file').value = ''; if (f) addImg(f); };
    $('#ed-ok').onclick = async () => {
      const n = $('#ed-n').value.trim(), pr = +$('#ed-pr').value || 0, ask = $('#ed-ask').classList.contains('on');
      if (!n) return ($('#ed-err').textContent = 'اكتب الاسم');
      if (w.on && !pr && !ask) return ($('#ed-err').textContent = 'حط سعر أو "اسأل على السعر"');
      if (w.off && w.off.pr && pr && w.off.pr >= pr) return ($('#ed-err').textContent = 'السعر لازم يبقى أكبر من سعر العرض (' + fmt(w.off.pr) + ')');
      const nw = { ...w, n, pr, ask, hq: !$('#ed-sq').classList.contains('on'), c: $('#ed-c').value, w: $('#ed-w').value.trim(), d: $('#ed-d').value.trim(), img: EDIT.img.slice(0, 4), ...(x.cat === 'dev' ? { st: $('#ed-st').value } : {}) };
      $('#ed-ok').disabled = true;
      if (await submit(x, nw, '✏️ ' + n)) Owner.closeSheet(); else $('#ed-ok').disabled = false;
    };
  }
  function paintImgs() {
    const box = $('#ed-imgs'); if (!box || !EDIT) return; const p = P();
    box.innerHTML = EDIT.img.map((n, i) => `<span class="sp-im"><img src="${IMG(p.slug, n)}" alt=""><button type="button" data-imx="${i}" aria-label="شيل">✕</button>${i === 0 ? '<em>الغلاف</em>' : ''}</span>`).join('')
      + (EDIT.img.length < 4 ? `<button type="button" class="sp-add" data-imadd>${EDIT.busy ? '⏳' : '📷'}</button>` : '');
  }
  // الصورة بتصغر على الموبايل (أطول ضلع 1000، webp لو متاح) لحد ~200KB، وبعدين بتترفع على طول (store-img-m)
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      let side = 1000, q = 0.82, out = null;
      for (let k = 0; k < 6; k++) {
        const r = Math.min(1, side / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * r); cv.height = Math.round(im.height * r);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        let d = cv.toDataURL('image/webp', q); let type = 'image/webp'; if (!/^data:image\/webp/.test(d)) { d = cv.toDataURL('image/jpeg', q); type = 'image/jpeg'; }
        out = { b64: d.split(',')[1], type }; if (out.b64.length * 0.75 <= 200000) break;
        side = Math.round(side * 0.8); q = Math.max(0.5, q - 0.08);
      }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  async function addImg(file) {
    if (!EDIT || EDIT.busy) return; EDIT.busy = true; paintImgs();
    try {
      const s = await shrink(file); if (!s) throw new Error('img');
      const base = String(EDIT.x.id).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'p';
      const name = `${base}-${Date.now().toString(36)}.${s.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const r = await OwnerLink.call({ action: 'store-img-m', name, type: s.type, b64: s.b64 });
      if (!r || r.error) { Owner.toast((r && r.error) || 'الصورة ماترفعتش', true); return; }
      EDIT.img.push(r.name || name);
    } catch (e) { Owner.toast('الصورة دي مش مفهومة، جرّب صورة تانية', true); }
    finally { if (EDIT) { EDIT.busy = false; paintImgs(); } }
  }
  /* ---------- الأحداث ---------- */
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-stt]'); if (t) { tab = t.dataset.stt; if (tab === 'revs') loadRevs(true); return Owner.repaint(); }
    const rf = e.target.closest('[data-rvf]'); if (rf) { rvF = rf.dataset.rvf; return Owner.repaint(); }
    const rh = e.target.closest('[data-rvh]'); if (rh && RV) { const x = RV.find(y => y.id === rh.dataset.rvh); if (!x) return; rh.disabled = true; if (await revSet(x.id, { hidden: !x.hidden })) { x.hidden = !x.hidden; Owner.toast(x.hidden ? '🙈 اتخبّى من المتجر' : '👁 ظاهر في المتجر'); } return Owner.repaint(); }
    const rr = e.target.closest('[data-rvr]'); if (rr && RV) { const x = RV.find(y => y.id === rr.dataset.rvr); if (x) replySheet(x); return; }
    const c = e.target.closest('[data-stc]'); if (c) { col = c.dataset.stc; return Owner.repaint(); }
    const f = e.target.closest('[data-spf]'); if (f) { pf = f.dataset.spf; return Owner.repaint(); }
    const sw = e.target.closest('[data-spt]'); if (sw && !sw.disabled) { const x = prodOf(sw.dataset.spt); if (!x) return; const w = x.web || {}; if (!w.on && !(w.pr || x.price) && !w.ask && !(P() || {}).ask) return Owner.toast('حط سعر الأول، أو "اسأل على السعر" من ✏️', true); return submit(x, { ...w, on: !w.on }, (w.on ? '🙈 خبّي: ' : '👁 اعرض: ') + (w.n || x.name)); }
    const d = e.target.closest('[data-spd]'); if (d) { const x = prodOf(d.dataset.spd); if (x) dealSheet(x); return; }
    const ed = e.target.closest('[data-spe]'); if (ed) { const x = prodOf(ed.dataset.spe); if (x) editSheet(x); return; }
    const ix = e.target.closest('[data-imx]'); if (ix && EDIT) { EDIT.img.splice(+ix.dataset.imx, 1); return paintImgs(); }
    if (e.target.closest('[data-imadd]') && EDIT && !EDIT.busy) return $('#ed-file').click();
    const op = e.target.closest('[data-sopen]'); if (op && !op.disabled) { const on = op.dataset.sopen === '1'; const r = await OwnerLink.submit({ kind: 'store', act: 'open', on }, on ? '🟢 افتح المتجر' : '🔴 اقفل المتجر'); if (r.error) Owner.toast(r.error, true); else Owner.toast('📤 اتبعت للكاشير'); return; }
    const u = e.target.closest('[data-surl]'); if (u) { const p = P(), url = 'https://khalid374374.github.io/repair-desk/s/?s=' + encodeURIComponent(p.slug);
      // "ابعته": قايمة المشاركة بتاعة أندرويد (RdNative.share، من 1.15.x) وإلا navigator.share (الآيفون/الويب)، والنسخ آخر حل (كان بينسخ بس على أندرويد)
      if (u.dataset.surl === 'share') {
        const N = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdNative;
        if (N && N.share) { try { await N.share({ title: 'المتجر', text: (p.name ? p.name + '\n' : '') + url }); return; } catch (er) {} }
        if (navigator.share) { try { await navigator.share({ title: 'المتجر', url }); } catch (er) {} return; }
      }
      try { await navigator.clipboard.writeText(url); Owner.toast('📋 اتنسخ'); } catch (er) { Owner.toast(url); } return; }
  });
  // السعر: بيتبعت لما تخلّص كتابة (change)، والسعر لازم يبقى أكبر من سعر العرض
  document.addEventListener('change', e => {
    const i = e.target.closest && e.target.closest('[data-spp]'); if (!i) return;
    const x = prodOf(i.dataset.spp); if (!x) return; const w = x.web || {}, v = +i.value || 0;
    if (v === (+w.pr || +x.price || 0)) return;
    if (w.off && w.off.pr && v && w.off.pr >= v) { Owner.toast('السعر لازم يبقى أكبر من سعر العرض (' + fmt(w.off.pr) + ')', true); i.value = w.pr || x.price || ''; return; }
    if (w.on && !v && !w.ask) { Owner.toast('المنتج ظاهر في المتجر: لازم سعر', true); i.value = w.pr || x.price || ''; return; }
    submit(x, { ...w, pr: v }, '💰 ' + (w.n || x.name) + ': ' + fmt(v));
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'sp-q') { pq = e.target.value; Owner.repaint(); } });
  // الكاشير نفّذ: المنتج اتغيّر في البيانات الجاية، فنشيل "مستني" بعد ما الجزء الجديد يوصل
  // الكاشير خلّص: الفشل بيشيل "مستني" على طول (والسعر بيرجع زي ما كان)، والنجاح بيشيلها أول ما البيانات الجديدة توصل
  window.addEventListener('owner:op', e => { const d = e.detail || {}, pid = sentOp[d.id]; if (!pid) return; delete sentOp[d.id]; if (d.status === 'done') doneP[pid] = 1; else { delete sent[pid]; Owner.repaint(); } });
  // البيانات الكاملة (جزء المتجر) هي اللي فيها التعديل، والملخص لوحده مش كفاية (اتقاس على تليفون خالد: "مستني" فضلت لحد الملخص اللي بعده)
  const clearSent = () => { for (const k of Object.keys(sent)) if ((doneP[k] && landed(k)) || Date.now() - sent[k] > 60000) { delete sent[k]; delete doneP[k]; delete sentW[k]; } };
  window.addEventListener('owner:data', clearSent); window.addEventListener('owner:full', clearSent);
  window.addEventListener('owner:op', () => setTimeout(() => { const n = Object.keys(sent).length; clearSent(); if (Object.keys(sent).length !== n) Owner.repaint(); }, 0));   // البيانات الجديدة ممكن تكون وصلت قبل رد الكاشير
  // البيانات اللي وصلت فيها التعديل فعلًا (الملخص ممكن يوصل قبل جزء المتجر بثانية: من غيرها السعر القديم كان هيبان لحظة)
  function landed(id) { const x = prodOf(id), w = sentW[id]; if (!x || !w) return true; const cur = x.web || {}, v = (o, k) => k === 'off' ? ((o.off && +o.off.pr) || 0) : k === 'pr' ? (+o.pr || 0) : k === 'n' ? String(o.n || '').trim() : !!o[k]; return ['pr', 'on', 'n', 'ask', 'hq', 'off'].every(k => !(k in w) || v(cur, k) === v(w, k)); }   // الحاجات اللي بتبان بس (الكاشير بينضّف الباقي)
  window.OwnerStoreTab = { view, _sent: sent, _revs: () => RV };
})();
