/* الاستلام والنقل وتعديل العميل من الموبايل (خالد، 2026-10-29).
   الموبايل مابيكتبش في البيانات بنفسه: بيبعت "طلب" للكاشير (OwnerLink.submit → gateway: op-submit)، والكاشير بيسجّله في ملفاته
   (رقم الإيصال والصلاحيات والسجل والدرج والواتساب زي أي تذكرة) ويرد. لحد ما يرد، الطلب بيبان فوق "⏳ مستني الكاشير".
   مفيش مسح ولا تعديل تذكرة خلصت من الموبايل. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
  const KIND = { intake: 'استلام', move: 'نقل', edit: 'تعديل' };

  /* ---------- فوق قايمة الصيانة: زرار الاستلام + الطلبات اللي لسه ماتسجلتش ---------- */
  function repairTop() {
    const P = window.OwnerLink ? OwnerLink.pending().filter(p => !['sell', 'stock', 'count'].includes(p.kind)) : [];   // المخزن والفاتورة في صفحة المخزن (stock.js)
    return `<button class="add-btn" id="a-new">➕ استلام جهاز جديد</button>${P.map(p => `<div class="pend ${p.status === 'failed' ? 'bad' : ''}"><span>${p.status === 'failed' ? '⚠' : '⏳'}</span><b>${esc(KIND[p.kind] || '')}: ${esc(p.label)}<small>${p.status === 'failed' ? esc(p.error || 'الكاشير رفض الطلب') : 'مستني الكاشير يسجّله'}</small></b>${p.status === 'failed' ? `<button data-pend-x="${esc(p.id)}">✕</button>` : ''}</div>`).join('')}`;
  }
  function ticketButtons(t) {
    if (!t.id) return '';   // بيانات #demo
    if (t.status === 'waiting') return `<div class="acts"><button class="act go" data-a="proc">🛠 نقل للصيانة</button><button class="act" data-a="edit">✏ تعديل</button></div>`;
    if (t.status === 'processing') return `<div class="acts"><button class="act ok" data-a="done">✅ خلص</button><button class="act" data-a="edit">✏ تعديل</button></div>`;
    return '';
  }

  /* ---------- الفورم ---------- */
  const field = (k, label, v, attrs) => `<label>${label}<input data-f="${k}" value="${esc(v)}" ${attrs || ''}></label>`;
  function intakeForm(t) {
    const e = !!t, x = t || {};
    return `<button class="x" id="sh-x">✕</button><h3>${e ? '✏ تعديل ' + esc(x.dev) + ' <span class="num lbl">#' + esc(x.no) + '</span>' : '➕ استلام جهاز جديد'}</h3>
      <div class="fm">
        ${e ? '' : field('dev', 'الجهاز *', '', 'maxlength="60" placeholder="Samsung A10"')}
        ${field('type', 'نوع الصيانة', x.type, 'maxlength="80" placeholder="تغيير شاشة"')}
        ${!e || x.status === 'waiting' ? `<div class="two">${field('price', 'سعر التصليح', e ? x.price || '' : '', 'type="number" inputmode="decimal" min="0"')}${e ? '' : field('deposit', 'العربون', '', 'type="number" inputmode="decimal" min="0"')}</div>` : ''}
        <div class="two">${field('customerName', 'اسم العميل', x.customer, 'maxlength="60"')}${field('customerPhone', 'تليفون العميل', x.phone, 'type="tel" inputmode="tel" maxlength="20" dir="ltr"')}</div>
        <div class="two">${field('imei1', 'IMEI', x.imei, 'inputmode="numeric" maxlength="20" dir="ltr"')}${field('expectedDate', 'ميعاد التسليم', x.expected, 'type="date"')}</div>
        <label>ملاحظات<textarea data-f="notes" maxlength="300">${esc(x.notes)}</textarea></label>
        <div class="err" id="f-err"></div>
        <button class="add-btn" id="f-go">${e ? '💾 حفظ' : '📥 استلام'}</button>
      </div>`;
  }
  const read = () => { const o = {}; document.querySelectorAll('#sheet [data-f]').forEach(i => { o[i.dataset.f] = i.value.trim(); }); return o; };
  async function send(op, label, btn) {
    btn.disabled = true;
    const r = await OwnerLink.submit(op, label);
    btn.disabled = false;
    if (r.error) { const e = $('#f-err'); if (e) e.textContent = r.error; else Owner.toast(r.error, true); return; }
    Owner.closeSheet(); Owner.toast('📤 اتبعت للكاشير'); Owner.go('repair', op.kind === 'intake' ? 'waiting' : undefined); Owner.repaint();
  }

  document.addEventListener('click', e => {
    const D = window.Owner && Owner.data();
    if (e.target.closest('#a-new')) {
      Owner.openSheet(intakeForm(null), e.target.closest('#a-new'));
      $('#f-go').onclick = ev => { const o = read(); if (!o.dev) { $('#f-err').textContent = 'اكتب اسم الجهاز'; return; } send({ kind: 'intake', ...o }, o.dev + (o.type ? ' · ' + o.type : ''), ev.currentTarget); };
      setTimeout(() => { const i = $('[data-f="dev"]'); if (i) i.focus(); }, 350);
      return;
    }
    const ap = e.target.closest('[data-apr],[data-apn]');
    if (ap && D) {   // طلب موظف: الموافقة بتتبعت للكاشير زي أي طلب، وهو اللي بيسجّل
      const ok = !!ap.dataset.apr, id = ap.dataset.apr || ap.dataset.apn, a = (D.approvals || []).find(x => x.id === id); if (!a) return;
      if (!ok && !confirm('ترفض: ' + a.title + '؟')) return;
      ap.disabled = true;
      OwnerLink.submit({ kind: 'approve', rid: id, ok }, (ok ? '✓ موافقة: ' : '✕ رفض: ') + a.title).then(r => {
        if (r.error) { ap.disabled = false; Owner.toast(r.error, true); return; }
        (window.__aprSent = window.__aprSent || {})[id] = 1; Owner.toast(ok ? '📤 الموافقة اتبعتت للكاشير' : '📤 الرفض اتبعت'); Owner.repaint();
      });
      return;
    }
    const wa = e.target.closest('[data-wa]');
    if (wa && D) {   // تحويل ماتسجلش: القرار بيتبعت للكاشير، وهو اللي بيسجّل في الوردية (زي زرار "سجّلها" عنده)
      const act = wa.dataset.wa, id = wa.dataset.wid, w = (D.watch || []).find(x => x.id === id); if (!w) return;
      const what = `${w.dir === 'in' ? 'دخل' : 'خرج'} ${w.amt} ${w.name}`;
      // المحفظة عليها أكتر من خط ومش واضح أنهي: اختار الخط الأول (خالد 2026-10-30)
      if (act === 'record' && w.lines && w.lines.length > 1) {
        Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>📶 على أنهي خط؟</h3><div class="lbl">${esc(what)} — ${w.dir === 'in' ? 'سحب من المحفظة' : 'إيداع / تحويل'}</div>
          <div class="card" style="margin-top:12px">${w.lines.map(l => `<button class="tk" data-wline="${esc(l.id)}" data-wid2="${esc(id)}">📶 <span class="t"><b>${esc(l.name || 'خط')}</b>${l.n4 ? `<small><bdi dir="ltr">…${esc(l.n4)}</bdi></small>` : ''}</span></button>`).join('')}</div>`, wa);
        return;
      }
      if (act === 'record' && !confirm(`تسجّل ${w.dir === 'in' ? 'سحب من المحفظة' : 'إيداع / تحويل'} ${w.amt} على ${w.name}${w.line4 ? ' (خط …' + w.line4 + ')' : ''} في الوردية؟
العمولة بتتحسب زي إعدادات الوردية.`)) return;
      if (act === 'ignore' && !confirm('تتجاهل التحويل ده؟ (' + what + ')')) return;
      wa.disabled = true;
      OwnerLink.submit({ kind: 'watch', id, act }, ({ record: '➕ سجّل: ', done: '✓ اتسجلت: ', ignore: 'تجاهل: ' }[act] || '') + what).then(r => {
        if (r.error) { wa.disabled = false; Owner.toast(r.error, true); return; }
        (window.__waSent = window.__waSent || {})[id] = 1; Owner.toast('📤 اتبعت للكاشير'); Owner.repaint();
      });
      return;
    }
    const wl = e.target.closest('[data-wline]');
    if (wl && D) {   // اختار الخط: الطلب بيروح للكاشير بالخط
      const id = wl.dataset.wid2, w = (D.watch || []).find(x => x.id === id); if (!w) return;
      wl.disabled = true;
      OwnerLink.submit({ kind: 'watch', id, act: 'record', line: wl.dataset.wline }, '➕ سجّل: ' + (w.dir === 'in' ? 'دخل ' : 'خرج ') + w.amt + ' ' + w.name).then(r => {
        if (r.error) { wl.disabled = false; Owner.toast(r.error, true); return; }
        (window.__waSent = window.__waSent || {})[id] = 1; Owner.closeSheet(); Owner.toast('📤 اتبعت للكاشير'); Owner.repaint();
      });
      return;
    }
    const px = e.target.closest('[data-pend-x]'); if (px) { OwnerLink.dropPending(px.dataset.pendX); Owner.repaint(); return; }
    const a = e.target.closest('#sheet [data-a]'); if (!a || !D) return;
    const h3 = $('#sheet h3'), no = h3 && (h3.textContent.match(/#(\d+)/) || [])[1];
    const t = D.tickets.find(x => String(x.no) === String(no) && x.id); if (!t) return;
    const label = `${t.dev} #${t.no}`;
    if (a.dataset.a === 'proc') return send({ kind: 'move', id: t.id, to: 'processing' }, label, a);
    if (a.dataset.a === 'done') {
      const rem = Math.max(0, (t.price || 0) - (t.paid || 0));
      Owner.openSheet(`<button class="x" id="sh-x">✕</button><h3>✅ خلص ${esc(t.dev)} <span class="num lbl">#${esc(t.no)}</span></h3>
        <div class="fm"><div class="card"><div class="row"><span>⏳ الباقي على العميل</span><b class="o">${fmt(rem)}</b></div></div>
        <label>استلمت قد إيه دلوقتي؟<input data-f="paid" type="number" inputmode="decimal" min="0" value="${rem}"></label>
        <div class="err" id="f-err"></div><button class="add-btn" id="f-go">✅ خلص</button></div>`);
      $('#f-go').onclick = ev => send({ kind: 'move', id: t.id, to: 'done', paid: read().paid }, label, ev.currentTarget);
      return;
    }
    if (a.dataset.a === 'edit') {
      Owner.openSheet(intakeForm(t));
      $('#f-go').onclick = ev => { const o = read(); send({ kind: 'edit', id: t.id, ...o }, label, ev.currentTarget); };
    }
  });
  window.OwnerActions = { repairTop, ticketButtons };
})();
