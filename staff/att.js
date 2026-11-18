/* تطبيق الموظف — الحضور (خالد 2026-11-18، tests/ui/employee-app-mockups.html). البيانات D.att من الكاشير (attendance.js phoneView):
   { on, phone, wifi: [BSSID], gps, wins: [{ name, ic, from, to, start, end }], st, rec, counts, list, leaves }
   - الحضور بيتسجّل لوحده لما الموبايل يلقط واي فاي المحل (الجزء اللي في الخلفية: AttService.java)، والزرار "📍 وصلت" احتياطي:
     بياخد الواي فاي اللي الموبايل عليه دلوقتي والموقع (وأندرويد بيقول لو الموقع مزيّف)، والكاشير هو اللي بيقرر.
   - الوقت = وقت وصول الطلب للسيرفر (مش ساعة الموبايل). الموظف مايشوفش أي طلبات توصيل (السيرفر نفسه مابيبعتهاش له). */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const N = () => (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.RdAtt) || null;
  const pad = n => String(n).padStart(2, '0');
  const t12 = ts => { const d = new Date(ts), h = d.getHours(); return (h % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'ص' : 'م'); };
  const hm12 = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h % 12 || 12) + ':' + pad(m || 0) + ' ' + (h < 12 ? 'ص' : 'م'); };
  const DAYS = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
  const dlabel = d => { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(y, m - 1, dd); return DAYS[x.getDay()] + ' ' + dd + '/' + m; };
  const KIND = { green: ['🟢', 'بدري'], late: ['🔴', 'متأخر'], absent: ['⚫', 'غياب'], leave: ['🌴', 'إجازة'], ok: ['✓', 'في ميعاده'], closed: ['🔒', 'المحل مقفول'] };
  const VIA = { wifi: 'من واي فاي المحل', gps: 'من الموقع', btn: 'من الموبايل', pin: 'من الكاشير' };
  let busy = '', here = null, st = null, hereAt = 0;

  // الشغال دلوقتي: الوردية اللي فيها الوقت ده (أو الجاية النهارده)
  const curWin = A => { const t = Date.now(), w = (A.wins || []).filter(x => t <= x.end); return w.find(x => t >= x.start - 4 * 3600e3) || w[0] || null; };
  function html(D) {
    const A = D && D.att;
    if (!A || !A.on) return `<div class="empty"><div class="e">⏰</div>${A && A.on === false ? 'الحضور مش متشغّل في المحل، أو صاحب المحل لسه ماحددلكش وردية.' : 'مستني بيانات الحضور من الكاشير…'}</div>`;
    if (!A.phone) return `<div class="empty"><div class="e">📱</div>صاحب المحل لسه ماشغّلش الحضور من الموبايل.<br>سجّل حضورك بالـ PIN على الكاشير.</div>`;
    const w = curWin(A), r = A.rec && A.rec.in ? A.rec : null, out = r && r.out;
    let top;
    if (r && !out) {
      const k = KIND[r.kind] || KIND.ok;
      top = `<div class="att-done"><div class="a"><i>${r.flag ? '⚠' : k[0]}</i><div><b>اتسجّلت ${t12(r.in)}</b><small>${r.kind === 'green' ? `قبل ميعادك بـ ${r.min} دقيقة` : r.kind === 'late' ? `متأخر ${r.min} دقيقة` : 'في ميعادك'} · ${VIA[r.via] || ''}</small>${r.flag ? `<small class="fl">⚠ ${esc(r.flag)}</small>` : ''}</div></div>
        <div class="two">${busy ? `<div class="wait"><span class="spin"></span> اتبعت…</div>` : `<button data-att="break">☕ بريك</button><button data-att="out">🏁 مشيت</button>`}</div></div>`;
    } else {
      const back = r && out;   // كان في بريك
      top = `<div class="att-shift"><small>${w ? 'ورديتك ' + (new Date(w.start).toDateString() === new Date().toDateString() ? 'النهارده' : dlabel(w.d)) : 'مفيش وردية النهارده'}</small><div class="t">${w ? `${esc(w.ic || '')} ${hm12(w.from)} – ${hm12(w.to)}` : '—'}</div>
        ${busy ? `<div class="big wait"><span class="spin"></span> اتبعت للمحل…</div>` : `<button class="big" data-att="${back ? 'back' : 'in'}">${back ? '↩ رجعت من البريك' : '📍 وصلت'}</button>`}
        <div class="where">${whereChips(A)}</div>
        ${back ? `<small class="hint">خرجت ${t12(out)}</small>` : `<small class="hint">${!N() ? 'دوس "وصلت" أول ما توصل المحل (على الآيفون مابيسجّلش لوحده). محتاج الموقع شغال.' : A.wifi && A.wifi.length ? 'بيتسجّل لوحده أول ما موبايلك يلقط واي فاي المحل.' : 'صاحب المحل لسه ماحددش واي فاي المحل، فسجّل بالزرار.'}</small>`}</div>`;
    }
    const c = A.counts || {};
    const pts = `<div class="att-pts"><div><b>🟢 ${c.green || 0}</b><small>بدري</small></div><div><b>🔴 ${c.redOpen || 0}</b><small>متأخر</small></div><div><b>⚫ ${c.blackOpen || 0}</b><small>غياب</small></div></div>`;
    const nx = A.next ? `<div class="att-next">${A.next.kind === 'late' ? '🔴' : '⚫'} بتتشال بعد ${A.next.need - A.next.have} يوم بدري</div>` : '';
    const list = (A.list || []).length ? `<div class="att-lst">${A.list.map(x => { const k = KIND[x.kind] || KIND.ok; return `<div><i>${k[0]}</i><span>${dlabel(x.d)} · ${k[1]}${x.min ? ' ' + x.min + ' د' : ''}${x.state === 'cleared' ? ' (اتشالت)' : ''}</span><em>${esc(x.reason || '')}</em></div>`; }).join('')}</div>` : '';
    const lv = `<div class="att-lst"><div class="lvb" role="button" data-att="leave"><i>🌴</i><span>اطلب إجازة</span><em>‹</em></div>${(A.leaves || []).map(l => `<div><i>${l.status === 'ok' ? '✓' : l.status === 'no' ? '✕' : '⏳'}</i><span>${dlabel(l.d)} · ${esc(l.reason)}</span><em>${l.status === 'ok' ? 'اتوافق' : l.status === 'no' ? 'اترفض' : 'مستني'}</em></div>`).join('')}</div>`;
    return permCard() + top + pts + nx + list + lv;
  }
  function whereChips(A) {
    if (!N()) return '<span>📍 بالموقع وقت ما تدوس</span>';   // الآيفون / المتصفح: من غير واي فاي (المتصفح مابيدّيش رقم الراوتر)
    if (!here) return '<span>📶 بيدوّر…</span>';
    const onShop = here.bssid && (A.wifi || []).includes(String(here.bssid).toLowerCase());
    const w = onShop ? '<span class="ok">📶 واي فاي المحل ✓</span>' : here.bssid ? '<span class="bad">📶 مش على واي فاي المحل</span>' : '<span class="bad">📶 مش على واي فاي</span>';
    // الموقع: شغال/مقفول من حالة أندرويد (مش من آخر قراية، الموقع بيتقري وقت الزرار بس)
    const l = here.mock ? '<span class="bad">📍 الموقع مزيّف</span>' : here.lat != null || (st && st.locOn) ? '<span class="ok">📍 الموقع شغال</span>' : st ? '<span class="bad">📍 الموقع مقفول</span>' : '';
    return w + l;
  }
  // الإذونات: من غيرها أندرويد مابيدّيش رقم الراوتر، والتسجيل اللوحده مابيشتغلش في الخلفية
  function permCard() {
    if (!N() || !st) return '';
    const miss = [];
    if (!st.fine) miss.push(['fine', '📍 الموقع', 'علشان نعرف واي فاي المحل']);
    else if (!st.bg) miss.push(['bg', '📍 الموقع "طول الوقت"', 'علشان يسجّل لوحده والتطبيق مقفول']);
    if (!st.locOn) miss.push(['loc', '📍 شغّل الموقع (GPS)', 'أندرويد بيخبّي الواي فاي من غيره']);
    if (!st.notif) miss.push(['notif', '🔔 الإشعارات', 'علشان تعرف إن حضورك اتسجّل']);
    if (!st.battery) miss.push(['battery', '🔋 البطارية من غير قيود', 'علشان أندرويد مايقفلش التطبيق']);
    if (!miss.length) return '';
    return `<div class="att-perm"><b>⚠ محتاج ${miss.length === 1 ? 'حاجة واحدة' : miss.length + ' حاجات'} علشان الحضور يتسجّل لوحده</b>${miss.map(([k, t, s]) => `<button data-perm="${k}"><span>${t}</span><small>${s}</small></button>`).join('')}</div>`;
  }
  async function refreshHere(force) {
    if (!force && Date.now() - hereAt < 15000) return;
    hereAt = Date.now();
    try {
      if (N()) { st = await N().status(); here = await N().here({ loc: false }); }
      else here = { bssid: '', ssid: '' };
    } catch (e) { here = { bssid: '' }; }
    if (window.Courier) Courier.paint();
  }
  // الموقع وقت الزرار بس (مش طول اليوم)
  async function locate() {
    if (N()) { try { return await N().here({ loc: true }); } catch (e) { return {}; } }
    return new Promise(res => { if (!navigator.geolocation) return res({}); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, mock: false }), () => res({}), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }); });
  }
  const toast = (t, bad) => { const e = document.createElement('div'); e.className = 'toast' + (bad ? ' bad' : ''); e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 3200); };
  async function send(a, extra) {
    busy = a; Courier.paint();
    if (/demo/.test(location.hash + location.search)) { setTimeout(() => demo(a), window.__fast ? 30 : 900); return; }
    const r = await window.CourierLink.att(a, extra || {});
    if (r.error) { busy = ''; Courier.paint(); toast('⚠ ' + r.error, true); }
  }
  async function arrive(a) {
    if (/demo/.test(location.hash + location.search)) return send(a, {});   // نسخة الشكل
    busy = a; Courier.paint();
    const h = await locate(); here = { ...(here || {}), ...h };
    const op = { via: h.bssid ? 'wifi' : 'gps', bssid: h.bssid || '', ssid: h.ssid || '', lat: h.lat != null ? +(+h.lat).toFixed(6) : null, lng: h.lng != null ? +(+h.lng).toFixed(6) : null, acc: Math.round(+h.acc || 0), mock: !!h.mock };
    if (!op.bssid && op.lat == null) { busy = ''; Courier.paint(); return toast('⚠ شغّل الموقع أو اتوصّل بواي فاي المحل الأول', true); }
    return send(a, op);
  }
  // رد الكاشير على طلب حضور (link.js)
  function done(p, err, res) {
    busy = '';
    if (err) toast('⚠ ' + err, true);
    else toast(p.a === 'out' ? '✓ اتسجّل انصرافك' : p.a === 'break' ? '☕ بريك سعيد' : p.a === 'leave' ? '✓ الطلب اتبعت لصاحب المحل' : res && res.flag ? '⚠ اتسجّلت بس صاحب المحل هيشوف: ' + res.flag : '✓ حضورك اتسجّل');
    if (window.CourierLink) CourierLink.refresh();
    Courier.paint();
  }
  function leaveSheet() {
    const tm = new Date(Date.now() + 864e5), v = tm.getFullYear() + '-' + pad(tm.getMonth() + 1) + '-' + pad(tm.getDate());
    $s(`<h3>🌴 اطلب إجازة</h3><div class="lbl">الطلب بيروح لصاحب المحل، ولو وافق اليوم مابيتخصمش</div>
      <label class="fld"><span>اليوم</span><input type="date" id="lv-d" value="${v}"></label>
      <label class="fld"><span>السبب</span><input type="text" id="lv-r" maxlength="160" placeholder="مثلًا: فرح أخويا"></label>
      <button class="btn ok" data-lvsend="1">ابعت الطلب</button><button class="btn ghost" data-x="1">رجوع</button>`);
  }
  const $s = h => { const s = document.getElementById('sheet'); s.innerHTML = h; s.hidden = false; document.getElementById('sheet-bg').hidden = false; };
  const closeS = () => { document.getElementById('sheet').hidden = true; document.getElementById('sheet-bg').hidden = true; };
  function demo(a) {
    const D = Courier.data(), A = D.att, t = Date.now();
    if (a === 'in') A.rec = { in: t, out: 0, kind: 'green', min: 8, via: here && here.bssid ? 'wifi' : 'gps', flag: '' };
    if (a === 'back' && A.rec) A.rec.out = 0;
    if ((a === 'out' || a === 'break') && A.rec) A.rec.out = t;
    done({ a }, null, {});
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-att],[data-perm],[data-lvsend]'); if (!b) return;
    if (b.dataset.perm) { try { await N().ask({ which: b.dataset.perm }); } catch (er) {} setTimeout(() => refreshHere(true), 1500); return; }
    if (b.dataset.lvsend) { const d = document.getElementById('lv-d').value, r = document.getElementById('lv-r').value.trim(); if (!d || !r) return toast('⚠ اكتب اليوم والسبب', true); closeS(); return send('leave', { d, reason: r }); }
    const a = b.dataset.att;
    if (a === 'leave') return leaveSheet();
    if (a === 'in' || a === 'back') return arrive(a);
    if (a === 'out' || a === 'break') return send(a, {});
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshHere(true); });
  window.Att = { html, done, refreshHere, busy: () => busy };
})();
