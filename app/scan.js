/* قارئ الباركود بكاميرا الموبايل (خالد 2026-10-31: للفاتورة والجرد والصنف الجديد).
   OwnerScan.scan('عنوان') → Promise بالكود أو null لو اتقفل. BarcodeDetector لو الموبايل بيدعمه، وإلا ZXing (vendor/zxing.min.js، MIT).
   بيقرا: Code128 (استيكر البرنامج)، EAN/UPC (علب الإكسسوار)، Code39، QR. */
(function () {
  const FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code'];
  let cur = null;   // { stop } لو الكاميرا فاتحة
  async function detector() {
    try {
      if (!('BarcodeDetector' in window)) return null;
      const ok = await BarcodeDetector.getSupportedFormats();
      const f = FORMATS.filter(x => ok.includes(x)); if (!f.includes('code_128')) return null;
      const d = new BarcodeDetector({ formats: f });
      return async src => { const r = await d.detect(src); return r && r[0] ? r[0].rawValue : ''; };
    } catch (e) { return null; }
  }
  function zxing() {
    const Z = window.ZXing; if (!Z) return null;
    const hints = new Map();
    const F = Z.BarcodeFormat;
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.CODE_128, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_39, F.QR_CODE]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader(); reader.setHints(hints);
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    return async video => {
      const vw = video.videoWidth || video.width, vh = video.videoHeight || video.height; if (!vw) return '';   // فيديو الكاميرا (أو canvas في الاختبار)
      // الشريط اللي في النص بس (أسرع وأدق)، بعرض 720 بالكتير
      const sw = vw, sh = Math.round(vh * 0.45), sy = Math.round((vh - sh) / 2), k = Math.min(1, 720 / sw);
      cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
      cx.drawImage(video, 0, sy, sw, sh, 0, 0, cv.width, cv.height);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, lum = new Uint8ClampedArray(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) lum[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
      try {
        const src = new Z.RGBLuminanceSource(lum, cv.width, cv.height, cv.width, cv.height, 0, 0);
        return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src))).getText();
      } catch (e) { return ''; } finally { reader.reset(); }
    };
  }
  function scan(title) {
    if (cur) cur.stop(null);
    return new Promise(async resolve => {
      const box = document.createElement('div'); box.id = 'scan';
      box.innerHTML = `<video playsinline muted></video><div class="scan-frame"><i></i></div><div class="scan-top"><b>📷 ${String(title || 'وجّه الكاميرا على الباركود').replace(/</g, '&lt;')}</b><button class="x" id="scan-x">✕</button></div><div class="scan-msg" id="scan-msg"></div>`;
      document.body.appendChild(box);
      const video = box.querySelector('video'), msg = box.querySelector('#scan-msg');
      let stream = null, alive = true;
      const stop = val => {
        if (!alive) return; alive = false; cur = null;
        if (stream) stream.getTracks().forEach(t => t.stop());
        box.remove(); resolve(val);
      };
      cur = { stop };
      box.querySelector('#scan-x').onclick = () => stop(null);
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
      catch (e) { msg.textContent = 'مافيش إذن للكاميرا. افتح الإعدادات ← التطبيقات ← الصيانة ← الأذونات.'; return; }
      if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream; try { await video.play(); } catch (e) {}
      const read = (await detector()) || zxing();
      if (!read) { msg.textContent = 'قارئ الباركود مش متاح على الموبايل ده'; return; }
      let last = 0;
      const loop = async t => {
        if (!alive) return;
        if (t - last > 140 && video.readyState >= 2) {
          last = t;
          let code = '';
          try { code = await read(video); } catch (e) {}
          code = String(code || '').trim();
          if (code && alive) { try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} return stop(code); }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
  window.OwnerScan = { scan, open: () => !!cur, close: () => { if (cur) cur.stop(null); }, _zxing: zxing };
})();
