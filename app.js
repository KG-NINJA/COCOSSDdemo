(() => {
  const $ = (sel) => document.querySelector(sel);
  const video = $('#video');
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  const btn = $('#toggle');
  const statusEl = $('#status');
  const clockEl = $('#clock');
  const th = $('#threshold');
  const thVal = $('#thVal');
  const cooldown = $('#cooldown');
  const testSpeak = $('#testSpeak');
  const voiceModeSel = $('#voiceMode');
  const zone = $('#zone');
  const zoneVal = $('#zoneVal');
  const minArea = $('#minArea');
  const minVal = $('#minVal');
  const warningTextInput = $('#warningText');

  let running = false;
  let lastWarnAt = 0;
  let model = null;
  const targetSet = new Set(['person', 'cat', 'dog']);
  const labelMap = {

  };

  const beep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 1800;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.42);
    } catch (_) {}
  };

  const speak = (text) => {
    try {
      const now = Date.now();
      const cooldownMs = Math.max(1000, Number(cooldown.value) * 1000);
      if (now - lastWarnAt < cooldownMs) return;
      if (voiceModeSel.value === 'tts') {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP';
        u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } else {
        beep();
      }
      lastWarnAt = now;
    } catch (e) {}
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await new Promise((r) => (video.onloadedmetadata = () => r()));
    await video.play();
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  };

  const draw = (preds) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    preds.forEach((p) => {
      const [x, y, w, h] = p.bbox;
      ctx.lineWidth = 2;
      ctx.strokeStyle = p.class === 'person' ? '#ff4136' : '#2ecc40';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.strokeRect(x, y, w, h);
      const tag = `${p.class} ${(p.score * 100).toFixed(0)}%`;
      ctx.font = '16px sans-serif';
      const tw = ctx.measureText(tag).width + 8;
      ctx.globalAlpha = 0.7; ctx.fillRect(x, Math.max(0, y - 20), tw, 20); ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.fillText(tag, x + 4, Math.max(14, y - 6));
    });
    // inner zone guide
    const cw = canvas.width, ch = canvas.height;
    const m = (Number(zone.value) / 100);
    const ix = m * cw, iy = m * ch, iw = cw - ix * 2, ih = ch - iy * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(ix, iy, iw, ih);
    ctx.setLineDash([]);

    // timestamp overlay (top-right)
    const d = new Date();
    const fmt2 = (n) => (n < 10 ? '0' + n : '' + n);
    const ts = `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())}`;
    ctx.font = '16px sans-serif';
    const pad = 6;
    const boxW = ctx.measureText(ts).width + pad * 2;
    const boxH = 22;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(cw - boxW - 10, 10, boxW, boxH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillText(ts, cw - boxW - 10 + pad, 10 + boxH - 6);
  };

  const loop = async () => {
    if (!running || !model) return;
    try {
      const detections = await model.detect(video);
      const cw = canvas.width || 1, ch = canvas.height || 1;
      const margin = Number(zone.value) / 100;
      const ix = margin * cw, iy = margin * ch, iw = cw - ix * 2, ih = ch - iy * 2;
      const minAreaPx = (Number(minArea.value) / 100) * cw * ch;

      const filtered = detections.filter((d) => {
        if (d.score < Number(th.value)) return false;
        if (!targetSet.has(d.class)) return false;
        const [x, y, w, h] = d.bbox;
        if (w * h < minAreaPx) return false;
        const cx = x + w / 2, cy = y + h / 2;
        if (!(cx >= ix && cx <= ix + iw && cy >= iy && cy <= iy + ih)) return false;
        return true;
      });

      draw(detections);
      if (filtered.length > 0) {
        const msg = (() => {
          const base = (warningTextInput.value || '警告：ここは立入禁止です。直ちに立ち去ってください。').trim();
          const counts = new Map();
          filtered.forEach((d) => {
            const label = labelMap[d.class] || d.class;
            counts.set(label, (counts.get(label) || 0) + 1);
          });
          if (counts.size === 0) return base;
          const parts = Array.from(counts.entries()).map(([label, count]) => (count > 1 ? `${label} ${count}件` : label));

        })();
        speak(msg);
        statusEl.textContent = `検知: ${filtered.length}件 / しきい値 ${Math.round(Number(th.value) * 100)}%`;
      } else {
        statusEl.textContent = `検知なし / しきい値 ${Math.round(Number(th.value) * 100)}%`;
      }
    } catch (e) {}
    requestAnimationFrame(loop);
  };

  // UI bindings
  th.addEventListener('input', () => (thVal.textContent = `${Math.round(Number(th.value) * 100)}%`));
  zone.addEventListener('input', () => (zoneVal.textContent = `${Number(zone.value)}`));
  minArea.addEventListener('input', () => (minVal.textContent = `${Number(minArea.value)}`));
  testSpeak.addEventListener('click', () => speak('テスト: 警告ボイスの確認です'));

  // clock (1s interval)
  const fmt = (n) => (n < 10 ? '0' + n : '' + n);
  const tick = () => {
    const d = new Date();
    const s = `${d.getFullYear()}-${fmt(d.getMonth()+1)}-${fmt(d.getDate())} ${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`;
    if (clockEl) clockEl.textContent = s;
  };
  tick();
  setInterval(tick, 1000);

  document.querySelectorAll('.targets input[type="checkbox"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      const c = e.target.value;
      if (e.target.checked) targetSet.add(c); else targetSet.delete(c);
    });
  });

  btn.addEventListener('click', async () => {
    if (!running) {
      try {
        statusEl.textContent = 'モデル読込中...';
        // ローカルのモデルを明示指定
        model = await cocoSsd.load({ modelUrl: './models/coco-ssd/model.json' });
        statusEl.textContent = 'カメラ初期化中...';
        await startCamera();
        running = true;
        btn.textContent = '停止';
        statusEl.textContent = '稼働中';
        requestAnimationFrame(loop);
      } catch (e) {
        statusEl.textContent = `エラー: ${e?.message || e}`;
        running = false; btn.textContent = '開始';
      }
    } else {
      running = false;
      btn.textContent = '開始';
      const tracks = (video.srcObject && video.srcObject.getTracks && video.srcObject.getTracks()) || [];
      tracks.forEach((t) => t.stop());
      video.srcObject = null;
    }
  });
})();
