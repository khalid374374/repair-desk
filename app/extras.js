/* إضافات تطبيق الصاحب (خالد 2026-11-08: "لو ناقصه حاجة ظبطها"):
   - "📋 النهارده" في الرئيسية: الأجهزة المتأخرة، القطع اللي ميعادها جه، واللي خلص ومحدش استلمه (زي الكاشير)
   - "👤 فلوس عند الناس": اللي عليهم فلوس في الوردية + الأجهزة اللي اتسلّمت وعليها باقي
   - 🔍 بحث في الصيانة بالإيصال أو الاسم أو التليفون أو الـ IMEI أو الجهاز */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const D = () => (window.Owner && Owner.data()) || {};
  const today = () => new Date().toLocaleDateString('sv');
  const daysSince = d => (d ? Math.max(0, Math.round((Date.parse(today()) - Date.parse(d)) / 864e5)) : 0);
  let q = '';
  function todayItems() {
    const d = D(), T = d.tickets || [], aging = d.aging || 3, out = [];
    for (const t of T) {
      if (t.status === 'processing' && t.days >= aging) out.push([t, 'late', '⏰ متأخر ' + t.days + ' يوم']);
      if (t.pw && t.pd && t.pd <= today()) out.push([t, 'parts', '📦 القطعة ميعادها ' + (t.pd === today() ? 'النهارده' : 'عدّى')]);
      if (t.status === 'done' && t.np && daysSince(t.dd) >= 1) out.push([t, 'pick', '⏳ خلص من ' + daysSince(t.dd) + ' يوم ومحدش استلمه']);
    }
    return out;
  }
  function todayCard() {
    const it = todayItems(); if (!it.length) return '';
    return `<div class="card ex-today"><div class="lbl">📋 النهارده <i class="ex-n">${it.length}</i></div>${it.slice(0, 6).map(([t, k, why]) => `<button class="ex-r ${k}" data-tk="${esc(t.id || t.no)}"><b>${esc(t.dev)} <span class="num lbl">#${esc(t.no)}</span></b><small>${esc(why)}${t.customer ? ' · ' + esc(t.customer) : ''}</small></button>`).join('')}${it.length > 6 ? `<div class="lbl" style="margin-top:6px">+ ${it.length - 6} كمان</div>` : ''}</div>`;
  }
  function owesCard() {
    const d = D(), p = d.owes || [], t = d.tickOwe || [];
    if (!p.length && !t.length) return '';
    const tot = p.reduce((a, x) => a + x.amt, 0) + t.reduce((a, x) => a + x.rem, 0);
    return `<div class="card ex-owe"><div class="lbl">👤 فلوس عند الناس · <b class="num o">${fmt(tot)}</b></div>
      ${p.map(x => `<div class="row"><span>👤 ${esc(x.name)}</span><b class="o">${fmt(x.amt)}</b></div>`).join('')}
      ${t.map(x => `<button class="row ex-tr" data-tk="${esc(x.id)}"><span>🛠 ${esc(x.dev)} <small class="lbl">#${esc(x.no)}${x.customer ? ' · ' + esc(x.customer) : ''}</small></span><b class="o">${fmt(x.rem)}</b></button>`).join('')}</div>`;
  }
  // بحث الصيانة: فوق القايمة، بيدوّر في كل التذاكر اللي في الملخص
  const norm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/\s+/g, ' ').trim();
  function searchBox() { return `<div class="ex-sr"><span>🔍</span><input id="ex-q" type="search" placeholder="دوّر بالإيصال أو الاسم أو التليفون أو IMEI" value="${esc(q)}" autocomplete="off"></div><div id="ex-res"></div>`; }
  function results() {
    const box = document.getElementById('ex-res'); if (!box) return;
    const w = norm(q).split(' ').filter(Boolean);
    if (!w.length) { box.innerHTML = ''; document.querySelectorAll('.view[data-v="repair"] .seg, .view[data-v="repair"] .tk').forEach(e => { e.hidden = false; }); return; }
    const L = (D().tickets || []).filter(t => { const s = norm([t.no, t.dev, t.type, t.customer, t.phone, t.imei].join(' ')); return w.every(x => s.includes(x)); });
    document.querySelectorAll('.view[data-v="repair"] .seg, .view[data-v="repair"] .tk').forEach(e => { if (!e.closest('#ex-res')) e.hidden = true; });
    const ST = { waiting: 'استلمت', processing: 'في الصيانة', done: 'خلص' };
    // + "الكل" (آخر 60 يوم من الملخص) من غير اللي ظاهر فوق، وتحت: "دوّر في الأقدم" بطلب للكاشير
    const seen = new Set(L.map(t => String(t.id)));
    const H = hist().filter(h => !seen.has(h.id) && w.every(x => norm([h.no, h.dev, h.type, h.cust].join(' ')).includes(x)));
    const nq = norm(q), F = found[nq];
    const old = F && F.rows ? F.rows.map(rowObj).filter(h => !seen.has(h.id) && !H.some(x => x.id === h.id)) : [];
    const more = Array.isArray(D().hist) && nq.length >= 2 ? (F && F.wait ? `<div class="ex-old wait"><span class="ex-spin"></span> بيدوّر على الكاشير في الأقدم من 60 يوم…</div>`
      : F && F.err ? `<button class="ex-old bad" data-find="1">⚠ ${esc(F.err)} — جرّب تاني</button>`
      : F && F.rows ? `<div class="ex-old done">${F.n ? `🗂 ${F.n > old.length ? 'أول ' + old.length + ' من ' + F.n : F.n} في الأقدم من 60 يوم` : 'مفيش حاجة أقدم بالبحث ده'}</div>`
      : `<button class="ex-old" data-find="1">🔎 دوّر في الأقدم من 60 يوم <small>(من الكاشير)</small></button>`) : '';
    const tot = L.length + H.length + old.length;
    box.innerHTML = (tot ? L.slice(0, 30).map(t => `<button class="tk" data-tk="${esc(t.id || t.no)}"><span class="no num">#${esc(t.no)}</span><span class="t"><b>${esc(t.dev)}</b><small>${esc(t.type)}${t.customer ? ' · ' + esc(t.customer) : ''} · ${ST[t.status] || ''}</small></span></button>`).join('')
      + H.slice(0, 40).concat(old).map(h => histBtn(h, true)).join('') : '<div class="empty" style="padding:20px">مفيش حاجة بالبحث ده</div>') + more;
  }
  /* ---------- "الكل": اللي خلص آخر 60 يوم (snap.hist، سطر مختصر لكل جهاز) متقسم بالأيام ---------- */
  // [id, إيصال, الجهاز, العطل, العميل, الصافي, يوم التسليم, الباقي]
  const rowObj = a => ({ id: String(a[0]), no: a[1], dev: a[2], type: a[3], cust: a[4], net: +a[5] || 0, dd: a[6] || '', rem: +a[7] || 0 });
  const hist = () => (Array.isArray(D().hist) ? D().hist : []).map(rowObj);
  const DAYN = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
  function dayName(d) {
    const n = daysSince(d); if (n === 0) return 'النهارده'; if (n === 1) return 'امبارح';
    const t = new Date(d + 'T12:00:00'); return isNaN(t) ? d : `${DAYN[t.getDay()]} ${t.getDate()}/${t.getMonth() + 1}`;
  }
  function histBtn(h, day) {   // day: في البحث (من غير عناوين الأيام) اليوم بيتكتب جنب العطل
    return `<button class="tk hk" data-hk="${esc(h.id)}"><span class="no num">#${esc(h.no)}</span><span class="t"><b>${esc(h.dev) || '—'}</b><small>${esc(h.type)}${h.cust ? ' · ' + esc(h.cust) : ''}${day === true && h.dd ? ' · ' + esc(dayName(h.dd)) : ''}</small></span><span class="hv"><b class="num ${h.net < 0 ? 'r' : 'g'}">${h.net < 0 ? '−' : ''}${fmt(Math.abs(h.net))}</b>${h.rem > 0 ? `<i class="chip owe">باقي ${fmt(h.rem)}</i>` : ''}</span></button>`;
  }
  let shown = 60;
  function allTab() {
    const L = hist();
    if (!L.length) return '<div class="empty">🗂<br>مفيش أجهزة خلصت في آخر 60 يوم</div>';
    const tot = L.reduce((a, h) => a + h.net, 0), owe = L.filter(h => h.rem > 0);
    let html = `<div class="card ex-allsum"><div><span class="lbl">آخر 60 يوم</span><b class="num">${L.length}</b><small>جهاز</small></div><div><span class="lbl">الصافي</span><b class="num g">${fmt(tot)}</b></div>${owe.length ? `<div><span class="lbl">لسه عليهم</span><b class="num o">${fmt(owe.reduce((a, h) => a + h.rem, 0))}</b><small>${owe.length} جهاز</small></div>` : ''}</div>`;
    let day = null;
    const days = {}; for (const h of L) { const k = h.dd || ''; days[k] = days[k] || { n: 0, net: 0 }; days[k].n++; days[k].net += h.net; }
    for (const h of L.slice(0, shown)) {
      if (h.dd !== day) { day = h.dd; const g = days[day] || { n: 0, net: 0 }; html += `<div class="ex-day"><b>${esc(day ? dayName(day) : 'من غير تاريخ')}</b><span><span class="num">${g.n}</span> جهاز · صافي <b class="num">${fmt(g.net)}</b></span></div>`; }
      html += histBtn(h);
    }
    if (L.length > shown) html += `<button class="ex-old" data-more="1">⬇ اعرض ${Math.min(60, L.length - shown)} كمان <small>(فاضل ${L.length - shown})</small></button>`;
    html += '<div class="lbl ex-hint">🔍 الأقدم من 60 يوم: دوّر فوق، وبعدين "دوّر في الأقدم"</div>';
    return html;
  }
  // تفاصيل سطر من "الكل" أو من البحث في الأقدم (اللي في الملخص بس: من غير تليفون العميل)
  function openHist(btn) {
    const id = btn.dataset.hk, F = Object.values(found).flatMap(f => (f && f.rows) || []).map(rowObj);
    const h = hist().concat(F).find(x => x.id === id); if (!h || !window.Owner) return;
    Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>${esc(h.dev) || '—'} <span class="num lbl">#${esc(h.no)}</span></h3><div class="lbl">${esc(h.type)}</div>
      <div class="card" style="margin-top:12px">
        ${h.cust ? `<div class="row"><span>👤 العميل</span><b class="tx">${esc(h.cust)}</b></div>` : ''}
        <div class="row"><span>📅 اتسلّم</span><b class="tx">${esc(h.dd ? dayName(h.dd) : '—')} <small class="lbl num">${esc(h.dd)}</small></b></div>
        <div class="row"><span>💰 الصافي</span><b class="${h.net < 0 ? 'r' : 'g'}">${h.net < 0 ? '−' : ''}${fmt(Math.abs(h.net))}</b></div>
        <div class="row"><span>⏳ الباقي</span><b class="${h.rem > 0 ? 'o' : 'g'}">${h.rem > 0 ? fmt(h.rem) : 'خالص ✓'}</b></div>
      </div><div class="lbl" style="margin-top:8px;text-align:center">التفاصيل كاملة على الكاشير (Ctrl+K برقم الإيصال)</div>`, btn);
    const x = document.getElementById('sh-x'); if (x) x.onclick = () => history.back();
  }
  /* الأقدم من 60 يوم: طلب "find" للكاشير (OwnerLink.submit)، والرد بييجي من op-status (link.js بينادي OwnerExtras.found) */
  const found = {};
  async function findOld() {
    const nq = norm(q); if (nq.length < 2 || !window.OwnerLink) return;
    found[nq] = { wait: true }; results();
    const r = await OwnerLink.submit({ kind: 'find', q: q.trim().slice(0, 60) }, '🔎 ' + q.trim().slice(0, 40));
    if (r && r.error) { found[nq] = { err: /طلب غلط/.test(r.error) ? 'السيرفر لسه ماتحدّثش للبحث ده' : r.error }; results(); return; }
    let k = 0; const tick = () => { if (!found[nq] || !found[nq].wait) return; if (++k > 20) { found[nq] = { err: 'الكاشير مارّدش (مقفول؟)' }; results(); return; } OwnerLink.checkOps(); setTimeout(tick, 2500); };
    setTimeout(tick, 1500);
  }
  function gotFind(label, res) {
    const nq = norm(res && res.q != null ? res.q : String(label || '').replace(/^🔎\s*/, ''));
    found[nq] = res && res.ok ? { rows: res.rows || [], n: res.n || 0 } : { err: (res && res.error) || 'الكاشير رفض' };
    results();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-find]')) { e.stopPropagation(); return findOld(); }
    if (e.target.closest('[data-more]')) { shown += 60; if (window.Owner) Owner.repaint(); }
  });
  document.addEventListener('input', e => { if (e.target && e.target.id === 'ex-q') { q = e.target.value; results(); } });
  window.addEventListener('owner:data', () => setTimeout(results, 0));
  window.OwnerExtras = { todayCard, owesCard, searchBox, results, allTab, openHist, found: gotFind };
})();
