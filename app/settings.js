/* الإعدادات (زرار ⋮) — خالد 2026-10-29: "كل حاجة في الإعدادات تقدر تحطها بس يبقى ليها لازمة".
   المظهر (زي الكاشير / الثيم / فاتح-غامق-أسود / Liquid Glass / وقّف الحركة)، الإشعارات (كل نوع لوحده، السيرفر مابيبعتش المقفول)،
   الأمان (قفل البصمة وبعد كام دقيقة)، الصفحة اللي التطبيق يفتح عليها، التحديث، والفصل من الكاشير. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const NOTIF = [['store', '🛒 طلب جديد من المتجر', 'أول ما عميل يطلب من متجر المحل'], ['close', '🔒 تقفيل الوردية وملخص اليوم', 'المفروض واتعد والزيادة أو العجز، وملخص النهارده الساعة 11 بالليل'], ['tx', '📲 تحويل ماتسجلش', 'تليفون المحافظ لقى تحويل مش في الوردية'], ['watchdown', '⚠ تليفون المحافظ واقف', 'مابعتش حاجة من نص ساعة'],
    ['appr', '🙋 طلبات الموظفين', 'سحب أو مرتجع أو مسح محتاج موافقتك'], ['low', '📦 صنف قرب يخلص', 'وصل للحد اللي حاطه في المخزن'], ['ops', '✅ نتيجة طلباتك', 'الكاشير سجّل أو رفض استلام / نقل / تعديل']];
  const TABS = [['home', '🏠 الرئيسية'], ['shift', '🏪 الوردية'], ['repair', '🛠 الصيانة'], ['reports', '📊 التقارير']];
  const LOCK_MIN = [[1, 'دقيقة'], [5, '5 دقايق'], [15, '15 دقيقة'], [0, 'كل مرة']];
  const sw = (id, on) => `<button type="button" class="sw${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i></i></button>`;
  const row = (label, sub, ctl) => `<div class="st-row"><div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;

  function html() {
    const o = window.Look ? Look.own() : {}, c = window.Look ? Look.current() : {}, f = o.follow !== false;
    const np = read('rdo_nprefs', {}), lockOn = window.AppLock && AppLock.on(), lm = read('rdo_lock_min', 1);
    return `<button class="x" id="sh-x">✕</button><h3>⋮ الإعدادات</h3>
      <div class="st-sec">🎨 المظهر</div>
      <div class="card">${row('زي الكاشير', 'الثيم والوضع والزجاج من إعدادات البرنامج على الكمبيوتر', sw('s-follow', f))}
        <div id="s-own"${f ? ' class="dim"' : ''}>
        <div class="st-row col"><b>الوضع</b><div class="seg st-seg" id="s-mode">${[['light', '☀️ فاتح'], ['dark', '🌙 غامق'], ['black', '⚫ أسود']].map(([v, l]) => `<button type="button" data-v="${v}" class="${c.mode === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="st-row col"><b>لون الثيم</b><div class="st-themes" id="s-theme">${(window.Look ? Look.THEMES : []).map(t => { const p = Look.palette(t[0], 'dark'); return `<button type="button" data-v="${t[0]}" class="${c.theme === t[0] ? 'on' : ''}" title="${esc(t[1])}"><i style="background:linear-gradient(135deg,${p.g1},${p.g2})"></i><small>${esc(t[1])}</small></button>`; }).join('')}</div></div>
        ${row('Liquid Glass', 'كروت زجاجية شفافة فوق خلفية متدرجة', sw('s-glass', !!c.glass))}
        ${row('وقّف الحركة', 'من غير أنيميشن: الأرقام والنوافذ بتظهر على طول', sw('s-still', !!c.still))}</div></div>
      <div class="st-sec">🔔 الإشعارات</div>
      <div class="card" id="s-notif">${window.RD_WEB ? `<button class="tk" id="s-wpush">🔔 <span class="t"><b>${window.Notification && Notification.permission === 'granted' ? 'الإشعارات شغالة على الآيفون ✓' : 'شغّل الإشعارات على الآيفون'}</b><small>محتاج iOS 16.4 أو أحدث، والتطبيق متضاف للشاشة الرئيسية ومفتوح منها</small></span></button>` : ''}${NOTIF.map(([k, l, s]) => row(l, s, sw('n-' + k, np[k] !== false))).join('')}<div class="st-err" id="n-err"></div></div>
      <div class="st-sec">🔒 الأمان</div>
      <div class="card">${window.AppLock ? row('قفل بالبصمة', 'لما تفتح التطبيق أو ترجعله', `<span id="s-lockw">${sw('s-lock', !!lockOn)}</span>`) : ''}
        <div class="st-row col" id="s-lmrow"${lockOn ? '' : ' hidden'}><b>يقفل لو رجعتله بعد</b><div class="seg st-seg" id="s-lm">${LOCK_MIN.map(([v, l]) => `<button type="button" data-v="${v}" class="${+lm === v ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>
      ${(() => { const L = window.Branches ? Branches.list() : [], c = window.Branches ? Branches.cur() : 0; return `<div class="st-sec">🏬 الفروع</div>
      <div class="card">${L.length > 1 ? L.map((x, i) => `<div class="st-row"><div><b>${esc(x.name || ('فرع ' + (i + 1)))}</b><small>${i === c ? 'مفتوح دلوقتي' : 'مربوط'}</small></div>${i === c ? '<span class="st-on">✓</span>' : `<button type="button" class="tk sm" data-brgo="${i}">افتحه</button>`}</div>`).join('') : `<div class="st-row"><div><b>فرع واحد مربوط</b><small>لو عندك فرع تاني: اربطه من هنا بكود من الكاشير بتاعه، وهتشوف الفرعين مع بعض.</small></div></div>`}
        <button class="tk" id="m-bradd">➕ <span class="t"><b>اربط فرع تاني</b><small>بالـ QR من الإعدادات ← 📱 في كاشير الفرع التاني</small></span></button>
        ${L.length > 1 ? '<button class="tk" id="m-brrm">➖ <span class="t"><b>شيل الفرع ده من الموبايل</b><small>الفروع التانية بتفضل مربوطة</small></span></button>' : ''}</div>`; })()}
      <div class="st-sec">📱 التطبيق</div>
      <div class="card"><div class="st-row col"><b>يفتح على</b><div class="seg st-seg" id="s-tab">${TABS.map(([v, l]) => `<button type="button" data-v="${v}" class="${read('rdo_tab', 'home') === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <button class="tk" id="m-refresh">🔄 <span class="t"><b>حدّث البيانات دلوقتي</b></span></button>
        <button class="tk" id="m-upd">⬆ <span class="t"><b>دوّر على تحديث</b><small id="m-upd-s">النسخة ${esc(window.APP_VER || '')}</small></span></button>
        <button class="tk" id="m-unlink">🔓 <span class="t"><b>افصل الموبايل ده</b><small>علشان تربطه تاني: كود من الكاشير، أو ادخل بحساب المحل</small></span></button></div>`;
  }
  function open() {
    const sh = $('#sheet'); if (!sh) return;
    Owner.openSheet(html(), $('#h-menu'), { full: true });
    bind();
  }
  function seg(id, fn) { const el = $(id); if (!el) return; el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v); }; }
  function toggle(id, fn) { const el = $(id); if (!el) return; el.onclick = async () => { const on = !el.classList.contains('on'); const ok = await fn(on); if (ok === false) return; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); }; }
  function bind() {
    $('#sh-x').onclick = () => history.back();
    const ownOn = () => { const f = Look.own().follow; $('#s-own').classList.toggle('dim', f !== false); };
    if (window.Look) {
      toggle('#s-follow', on => { const cur = Look.current(); Look.setOwn(on ? { follow: true } : { follow: false, theme: cur.theme, mode: cur.mode, glass: cur.glass, still: cur.still }); ownOn(); });
      seg('#s-mode', v => { Look.setOwn({ follow: false, mode: v }); $('#s-follow').classList.remove('on'); ownOn(); });
      seg('#s-theme', v => { Look.setOwn({ follow: false, theme: v }); $('#s-follow').classList.remove('on'); ownOn(); });
      toggle('#s-glass', on => { Look.setOwn({ follow: false, glass: on }); $('#s-follow').classList.remove('on'); ownOn(); });
      toggle('#s-still', on => { Look.setOwn({ follow: false, still: on }); $('#s-follow').classList.remove('on'); ownOn(); });
    }
    NOTIF.forEach(([k]) => toggle('#n-' + k, async on => {
      const np = Object.assign(read('rdo_nprefs', {}), { [k]: on });
      const r = window.OwnerLink && OwnerLink.pushPrefs ? await OwnerLink.pushPrefs(np) : { ok: true };
      if (r && r.error) { $('#n-err').textContent = r.error; return false; }
      $('#n-err').textContent = ''; write('rdo_nprefs', np); return true;
    }));
    // الآيفون: تشغيل الإشعارات (محتاج دوسة، Safari بيسأل وقتها بس)
    const wp = $('#s-wpush'); if (wp) wp.onclick = async () => { const b = wp.querySelector('b'); b.textContent = 'بيشغّل…'; const r = window.OwnerLink && OwnerLink.webPush ? await OwnerLink.webPush() : { error: 'مش متاح' }; b.textContent = r && r.ok ? 'الإشعارات شغالة على الآيفون ✓' : 'شغّل الإشعارات على الآيفون'; $('#n-err').textContent = r && r.error ? r.error : ''; };
    toggle('#s-lock', async on => { const r = await AppLock.toggle(); if (r.error) { alert(r.error); return false; } $('#s-lmrow').hidden = !r.on; return r.on === on; });
    seg('#s-lm', v => write('rdo_lock_min', +v));
    seg('#s-tab', v => write('rdo_tab', v));
    $('#m-refresh').onclick = () => { history.back(); if (window.OwnerLink) OwnerLink.refresh(); };
    document.querySelectorAll('[data-brgo]').forEach(b => b.onclick = () => window.Branches && Branches.switchTo(+b.dataset.brgo));
    $('#m-bradd').onclick = () => window.Branches && Branches.startAdd();
    const brrm = $('#m-brrm'); if (brrm) brrm.onclick = async () => { if (!confirm('تشيل الفرع ده من الموبايل؟')) return; if (window.AppLock && !(await AppLock.confirm('علشان تشيل الفرع'))) return; Branches.removeCurrent(); };
    if (window.RD_WEB) { const b = $('#m-upd'); b.querySelector('b').textContent = 'حدّث للنسخة الأخيرة'; $('#m-upd-s').textContent = 'نسخة الآيفون بتتحدّث لوحدها، والزرار ده بيجيبها دلوقتي'; b.onclick = async () => { $('#m-upd-s').textContent = 'بيحمّل...'; try { const g = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (g) await g.update(); } catch (e) {} location.reload(); }; } else
    $('#m-upd').onclick = async () => { const s = $('#m-upd-s'); s.textContent = 'بيدوّر...'; const r = window.OwnerLink ? await OwnerLink.checkUpdate(true) : {}; s.textContent = r.update ? `فيه نسخة جديدة ${r.update}: زرار التحديث فوق` : r.latest ? `عندك آخر نسخة (${window.APP_VER})` : (r.error || ''); };
    $('#m-unlink').onclick = async () => { if (!confirm('تفصل الموبايل ده من الكاشير؟')) return; if (window.AppLock && !(await AppLock.confirm('علشان تفصل الموبايل'))) return; history.back(); if (window.OwnerLink) OwnerLink.forget(); };   // البصمة الأول علشان مايتفصلش بالغلط
  }
  // أول فتح للإعدادات كان بياخد ~0.6 ثانية على موبايل متوسط (الإيموجي والستايل بيتحمّلوا أول مرة)، والمرة التانية 0.06.
  // فبنرسمها مرة مستخبية بعد ما التطبيق يفتح بشوية، علشان لما تدوس ⋮ تبقى جاهزة (خالد 2026-10-30: "فيه لاج")
  function warm() {
    const sh = $('#sheet'); if (!sh || !sh.hidden || document.visibilityState !== 'visible') return;
    const w = document.createElement('div'); w.className = 'sheet full'; w.setAttribute('aria-hidden', 'true');
    w.style.cssText = 'visibility:hidden;pointer-events:none;z-index:-1';
    w.innerHTML = html().replace(/ id="[^"]*"/g, '');   // من غير ids علشان مايتلخبطوش مع الحقيقية
    document.body.appendChild(w); void w.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => w.remove()));
  }
  setTimeout(() => { if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 3000 }); else warm(); }, 2500);
  // الصفحة اللي التطبيق يفتح عليها
  const startTab = read('rdo_tab', 'home');
  if (startTab !== 'home' && window.Owner && Owner.go) setTimeout(() => Owner.go(startTab), 0);
  window.AppSettings = { open };
})();
