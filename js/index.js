/* ═══════════════ ابزارها ═══════════════ */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ═══════════════ موتور شبکه‌ی عصبی پرتراکم ═══════════════ */
const NET_THEMES = {
  light: {
    nodeRGBs: [['18,59,74',.74], ['32,178,170',.15], ['201,162,39',.11]],
    nodeAlpha:.55, lineMax:.13,
    mouseRGB:'18,59,74', mouseMax:.42,
    density:4100, maxNodes:640, minNodes:26, linkDist:104
  },
  dark: {
    nodeRGBs: [['32,178,170',.42], ['255,255,255',.30], ['232,197,71',.16], ['168,208,141',.12]],
    nodeAlpha:.85, lineMax:.22,
    mouseRGB:'232,197,71', mouseMax:.55,
    density:4400, maxNodes:600, minNodes:24, linkDist:116
  }
};

class Neural {
  constructor(canvas, theme = 'light') {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({}, NET_THEMES[theme] || NET_THEMES.light, {
      speed:.3, repel:100, mouseDist:165, hub:.1,
      pulseMin:200, pulseMax:620, pulseDur:[420,950], maxPulses:16
    });
    this.host = canvas.parentElement;
    this.nodes = []; this.pulses = []; this.cells = [];
    this.mouse = { x:-1e4, y:-1e4 };
    this.running = true; this.lastPulse = 0; this._next = 0;

    this.resize();
    addEventListener('resize', () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.resize(), 180); });

    this.host.addEventListener('mousemove', e => {
      const r = this.c.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
    }, { passive:true });
    this.host.addEventListener('mouseleave', () => { this.mouse.x = -1e4; this.mouse.y = -1e4; });

    new IntersectionObserver(es => es.forEach(en => this.running = en.isIntersecting))
      .observe(this.host);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    const mobile = innerWidth < 640;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.3 : 1.6);
    this.w = r.width; this.h = r.height;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dens = mobile ? this.o.density * 1.6 : this.o.density;
    const cap  = mobile ? Math.min(this.o.maxNodes, 300) : this.o.maxNodes;
    const n = Math.max(this.o.minNodes, Math.min(cap, Math.round(this.w * this.h / dens)));
    this.LD = this.o.linkDist * (mobile ? .92 : 1);
    this.nodes = Array.from({ length: n }, () => this.makeNode());
    this.pulses = [];
  }
  makeNode() {
    const r = Math.random();
    let acc = 0, col = this.o.nodeRGBs[0][0];
    for (const [rgb, w] of this.o.nodeRGBs) { acc += w; if (r <= acc) { col = rgb; break; } }
    return {
      x: Math.random() * this.w, y: Math.random() * this.h,
      vx: (Math.random() - .5) * this.o.speed * 2,
      vy: (Math.random() - .5) * this.o.speed * 2,
      r: 1 + Math.random() * 1.5, col,
      hub: Math.random() < this.o.hub
    };
  }
  step(dt) {
    const { repel } = this.o;
    for (const n of this.nodes) {
      const dx = n.x - this.mouse.x, dy = n.y - this.mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < repel * repel) {
        const d = Math.sqrt(d2) || 1, f = (repel - d) / repel * .5;
        n.vx += dx / d * f * .12; n.vy += dy / d * f * .12;
      }
      n.vx *= .995; n.vy *= .995;
      const sp = Math.hypot(n.vx, n.vy) || .001;
      if (sp < .1) { n.vx = n.vx / sp * .12; n.vy = n.vy / sp * .12; }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -12) n.x = this.w + 12; if (n.x > this.w + 12) n.x = -12;
      if (n.y < -12) n.y = this.h + 12; if (n.y > this.h + 12) n.y = -12;
    }
  }
  buildGrid() {
    const cs = this.LD;
    this.gw = Math.max(1, Math.ceil(this.w / cs));
    this.gh = Math.max(1, Math.ceil(this.h / cs));
    this.cells = new Array(this.gw * this.gh);
    for (const n of this.nodes) {
      let gx = n.x / cs | 0; if (gx < 0) gx = 0; if (gx >= this.gw) gx = this.gw - 1;
      let gy = n.y / cs | 0; if (gy < 0) gy = 0; if (gy >= this.gh) gy = this.gh - 1;
      n.gx = gx; n.gy = gy;
      const idx = gy * this.gw + gx;
      (this.cells[idx] || (this.cells[idx] = [])).push(n);
    }
  }
  edge(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > this.LD * this.LD) return;
    const al = (1 - Math.sqrt(d2) / this.LD) * this.o.lineMax;
    if (al < .015) return;
    this.ctx.strokeStyle = `rgba(${a.col},${al})`;
    this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
  }
  draw(now, dt) {
    const { ctx } = this, o = this.o;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.lineWidth = 1;
    for (let gy = 0; gy < this.gh; gy++) {
      for (let gx = 0; gx < this.gw; gx++) {
        const cell = this.cells[gy * this.gw + gx];
        if (!cell) continue;
        for (const a of cell) {
          for (let oy = 0; oy <= 1; oy++) {
            for (let ox = (oy === 0 ? 0 : -1); ox <= 1; ox++) {
              if (oy === 0 && ox === 0) {
                const arr = cell, i = arr.indexOf(a);
                for (let j = i + 1; j < arr.length; j++) this.edge(a, arr[j]);
              } else {
                const nb = this.cells[(gy + oy) * this.gw + (gx + ox)];
                if (nb) for (const b of nb) this.edge(a, b);
              }
            }
          }
        }
      }
    }
    if (finePointer) {
      ctx.lineWidth = 1.2;
      for (const n of this.nodes) {
        const d = Math.hypot(n.x - this.mouse.x, n.y - this.mouse.y);
        if (d < o.mouseDist) {
          const al = (1 - d / o.mouseDist) * o.mouseMax;
          ctx.strokeStyle = `rgba(${o.mouseRGB},${al})`;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(this.mouse.x, this.mouse.y); ctx.stroke();
        }
      }
    }
    for (const n of this.nodes) {
      ctx.fillStyle = `rgba(${n.col},${o.nodeAlpha})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
      if (n.hub) {
        ctx.strokeStyle = `rgba(${n.col},.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3.5, 0, 7); ctx.stroke();
      }
    }
    this.spawnPulse(now);
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.t += dt * 16;
      const k = p.t / p.dur;
      if (k >= 1) { this.pulses.splice(i, 1); continue; }
      const x = p.a.x + (p.b.x - p.a.x) * k;
      const y = p.a.y + (p.b.y - p.a.y) * k;
      const fade = Math.sin(k * Math.PI);
      ctx.fillStyle = `rgba(${p.col},${.95 * fade})`;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(${p.col},${.22 * fade})`;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
    }
  }
  spawnPulse(now) {
    if (now - this.lastPulse < this._next || this.pulses.length >= this.o.maxPulses) return;
    this._next = this.o.pulseMin + Math.random() * (this.o.pulseMax - this.o.pulseMin);
    this.lastPulse = now;
    const a = this.nodes[Math.random() * this.nodes.length | 0];
    if (!a) return;
    let best = null, bd = 1e9;
    for (let oy = -1; oy <= 1 && !best; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cell = this.cells[(a.gy + oy) * this.gw + (a.gx + ox)];
        if (!cell) continue;
        for (const b of cell) {
          if (b === a) continue;
          const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d < bd) { bd = d; best = b; }
        }
      }
    }
    if (best && bd < (this.LD * 1.5) ** 2)
      this.pulses.push({ a, b: best, t: 0, dur: this.o.pulseDur[0] + Math.random() * (this.o.pulseDur[1] - this.o.pulseDur[0]), col: a.col });
  }
  loop(now) {
    if (!this.running || document.hidden) { this._pt = now; requestAnimationFrame(this.loop); return; }
    const dt = Math.min(2.5, (now - (this._pt || now)) / 16.7);
    this._pt = now;
    this.step(dt);
    this.buildGrid();
    this.draw(now, dt);
    requestAnimationFrame(this.loop);
  }
}

/* ═══════════════ ۱) لودر: بوت شبکه‌ای ═══════════════ */
(function () {
  const cvs = $('#ldNet'), ctx = cvs.getContext('2d');
  const count = $('#ldCount'), statusEl = $('#ldStatus');
  const S = 300, dpr = Math.min(devicePixelRatio || 1, 2);
  cvs.width = S * dpr; cvs.height = S * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = S / 2, cy = S / 2, N = 34;
  const nodes = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2 + (Math.random() - .5) * .15;
    const rr = 112 + (Math.random() - .5) * 30;
    return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  });
  const edges = [];
  for (let i = 0; i < N; i++) {
    edges.push([i, (i + 1) % N]);
    if (i % 2 === 0) edges.push([i, (i + 5) % N]);
    if (i % 3 === 0) edges.push([i, (i + 9) % N]);
    if (i % 5 === 0) edges.push([i, (i + 16) % N]);
  }

  const STATUS = [[0,'اتصال نورون‌ها…'],[30,'راه‌اندازی لایه‌ها…'],[60,'همگام‌سازی سیگنال‌ها…'],[85,'آماده‌سازی تجربه…']];
  const DUR = 2350, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  let rot = 0;

  (function tick(now) {
    const p = Math.min(1, (now - t0) / DUR), v = ease(p);
    const pct = Math.round(v * 100);
    count.textContent = toFa(pct) + '٪';
    for (const [th, txt] of STATUS) if (pct >= th) statusEl.textContent = txt;

    rot += .0032;
    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    const shown = Math.floor(v * edges.length);
    edges.forEach(([a, b], i) => {
      const local = Math.max(0, Math.min(1, v * edges.length - i));
      if (local <= 0) return;
      const fade = i === shown - 1 ? 1 : .5 + local * .4;
      const long = Math.abs(a - b) > 6 || Math.abs(a - b) > N - 6;
      ctx.strokeStyle = long ? `rgba(232,197,71,${.5 * fade})` : `rgba(32,178,170,${.42 * fade})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
    });
    nodes.forEach((n, i) => {
      const on = i / N <= v * 1.15;
      ctx.fillStyle = on ? (i % 5 === 0 ? 'rgba(232,197,71,.95)' : 'rgba(32,178,170,.9)') : 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.arc(n.x, n.y, i % 5 === 0 ? 2.8 : 2, 0, 7); ctx.fill();
    });
    ctx.restore();

    if (p < 1) requestAnimationFrame(tick);
    else setTimeout(done, 400);
  })(t0);

  function done() {
    $('#ldMain').classList.add('done');
    $('#ldAccent').classList.add('done');
    document.body.classList.add('is-loaded');
    document.body.classList.remove('locked');
    startTypewriter();
    setTimeout(() => { $('#ldMain').remove(); $('#ldAccent').remove(); }, 1600);
  }
})();

/* ═══════════════ ۲) شبکه‌ها در همه‌ی بخش‌ها ═══════════════ */
if (!reduced) {
window.AF_NETS = [];
 $$('canvas.net').forEach(c => window.AF_NETS.push(new Neural(c, c.dataset.net || 'light')));
}

/* ═══════════════ ۳) کرسر کشسان + موج کلیک ═══════════════ */
(function () {
  if (!finePointer) return;
  const dot = $('#cursorDot'), ring = $('#cursorRing'), label = $('#cursorLabel'), ripple = $('#cursorRipple');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
  }, { passive:true });

  addEventListener('mousedown', e => {           
    ripple.style.left = e.clientX + 'px';
    ripple.style.top  = e.clientY + 'px';
    ripple.classList.remove('go'); void ripple.offsetWidth;
    ripple.classList.add('go');
  });

  (function loop() {
    const dx = mx - rx, dy = my - ry;
    rx += dx * .17; ry += dy * .17;
    const sp = Math.hypot(dx, dy);
    const st = Math.min(.35, sp * .009);
    const ang = Math.atan2(dy, dx);
    ring.style.transform =
      `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) rotate(${ang.toFixed(3)}rad) ` +
      `scale(${(1 + st).toFixed(3)},${(1 - st * .6).toFixed(3)}) rotate(${(-ang).toFixed(3)}rad)`;
    requestAnimationFrame(loop);
  })();

  addEventListener('mouseover', e => {
    const c = e.target.closest('[data-cursor]');
    const h = e.target.closest('a,button,.faq-q');
    ring.classList.remove('cursor-big', 'cursor-hover');
    dot.classList.remove('on', 'hide');
    label.textContent = '';
    if (c) { ring.classList.add('cursor-big'); dot.classList.add('hide'); label.textContent = c.dataset.cursor; }
    else if (h) { ring.classList.add('cursor-hover'); dot.classList.add('on'); }
  });
})();

/* ═══════════════ ۴) پارالاکس عناصر معلق هیرو ═══════════════ */
(function () {
  if (!finePointer) return;
  const hero = $('#home');
  const items = $$('.hero-visual [data-depth]');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5;
    ty = (e.clientY - r.top) / r.height - .5;
  }, { passive:true });
  hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
  (function loop() {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    items.forEach(el => {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${(cx * d * 26).toFixed(1)}px,${(cy * d * 26).toFixed(1)}px,0)`;
    });
    requestAnimationFrame(loop);
  })();
})();

/* ═══════════════ ۵) تایپ‌رایتر ═══════════════ */
function startTypewriter() {
  const el = $('#typed');
  if (!el) return;
  const words = ['توسعه‌دهنده‌ی فرانت‌اند', 'طراح رابط کاربری', 'متخصص جاوااسکریپت', 'عاشق تجربه‌های دیجیتال'];
  let wi = 0, ci = 0, del = false;
  (function type() {
    const w = words[wi];
    el.textContent = w.slice(0, ci);
    let spd = del ? 36 : 85;
    if (!del && ci === w.length) { spd = 2000; del = true; }
    else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; spd = 350; }
    ci += del ? -1 : 1;
    setTimeout(type, spd);
  })();
}

/* ═══════════════ ۶) هدر + پیشرفت + اسکرول‌اسپای + رینگ بازگشت ═══════════════ */
(function () {
  const header = $('#header'), bar = $('#progressBar'), toTop = $('#toTop'), ring = $('#ttRing');
  const C = 2 * Math.PI * 26;
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C;
  const sections = $$('section[id]');
  const links = $$('.nav-link');
  function onScroll() {
    header.classList.toggle('scrolled', scrollY > 40);
    const max = document.documentElement.scrollHeight - innerHeight || 1;
    const p = Math.min(1, scrollY / max);
    bar.style.transform = `scaleX(${p})`;
    ring.style.strokeDashoffset = C * (1 - p);
    toTop.classList.toggle('show', scrollY > 600);
    let cur = 'home';
    for (const s of sections) if (scrollY >= s.offsetTop - 160) cur = s.id;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, { passive:true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ═══════════════ ۷) منوی موبایل ═══════════════ */
 $('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
 $$('.m-link, .mobile-menu .btn').forEach(a =>
  a.addEventListener('click', () => document.body.classList.remove('menu-open')));

/* ═══════════════ ۸) شکستن تیترها به کلمه ═══════════════ */
 $$('[data-split]').forEach(el => {
  const frag = document.createDocumentFragment();
  let idx = 0;
  const wrap = node => {
    const w = document.createElement('span'); w.className = 'w';
    const wi = document.createElement('span'); wi.className = 'wi';
    wi.style.setProperty('--wd', (idx++ * .07).toFixed(2) + 's');
    w.appendChild(wi); wi.appendChild(node);
    return w;
  };
  [...el.childNodes].forEach(node => {
    if (node.nodeType === 3) {
      node.textContent.split(/\s+/).filter(Boolean).forEach(word => {
        frag.appendChild(wrap(document.createTextNode(word)));
        frag.appendChild(document.createTextNode(' '));
      });
    } else frag.appendChild(wrap(node));
  });
  el.innerHTML = ''; el.appendChild(frag);
});

/* ═══════════════ ۹) ریویل ═══════════════ */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold:.12, rootMargin:'0px 0px -40px 0px' });
 $$('.reveal, [data-split]').forEach(el => io.observe(el));

/* ═══════════════ ۱۰) شمارنده‌ها ═══════════════ */
function animateNum(el, dur = 1800) {
  const target = +el.dataset.count, suf = el.dataset.suffix || '';
  const t0 = performance.now();
  (function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = toFa(Math.round((1 - Math.pow(1 - p, 3)) * target)) + suf;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  animateNum(e.target); cio.unobserve(e.target);
}), { threshold:.4 });
 $$('.stat-num span[data-count]').forEach(el => cio.observe(el));

/* ═══════════════ ۱۱) رینگ‌های مهارت ═══════════════ */
const sio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const row = e.target, target = +row.dataset.val;
  const fill = row.querySelector('.sr-fill'), num = row.querySelector('.ring-num');
  const CIRC = 2 * Math.PI * 37;
  fill.style.strokeDasharray = CIRC;
  const t0 = performance.now(), DUR = 1600;
  (function step(now) {
    const p = Math.min(1, (now - t0) / DUR), v = 1 - Math.pow(1 - p, 3);
    fill.style.strokeDashoffset = CIRC * (1 - (target / 100) * v);
    num.textContent = toFa(Math.round(target * v)) + '٪';
    if (p < 1) requestAnimationFrame(step);
  })(t0);
  sio.unobserve(row);
}), { threshold:.4 });
 $$('.skill-row').forEach(el => sio.observe(el));

/* ═══════════════ ۱۲) افکت Tilt ═══════════════ */
if (finePointer && !reduced) {
  $$('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform =
        `perspective(1000px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ═══════════════ ۱۳) نورافکن کارت‌ها ═══════════════ */
if (finePointer) {
  $$('.spot').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
}

// ═══════════════ ۱۴) مارکی بی‌نهایت و بی‌درز ═══════════════
(function () {
  const track = $('#mqTrack');
  if (!track) return;
  const base = track.innerHTML; // محتوای اصلی (یک نسخه)

  function build() {
    // ۱) انیمیشن را موقتاً خاموش کن تا بازسازی بدون «پرش» باشد
    track.style.animation = 'none';

    track.innerHTML = base;
    const min = (innerWidth || document.documentElement.clientWidth) + 80;
    let guard = 0;
    while (track.scrollWidth < min && guard++ < 80) track.innerHTML += base;

    //    → تصویر لحظه‌ی پایان = تصویر لحظه‌ی شروع → حلقه‌ی کاملاً بی‌درز
    const set = track.innerHTML;
    track.innerHTML = set + set;

    // ۴) مدت‌زمان بر اساس عرض واقعی ست → سرعت ثابت در همه‌ی صفحه‌نمایش‌ها
    const setW = track.scrollWidth / 2;
    void track.offsetWidth;                   
    track.style.animation = '';                 
    track.style.animationDuration = Math.max(10, setW / 85) + 's';
  }

  build();
  // پس از آماده‌شدن فونت‌ها عرض متن تغییر می‌کند → یک‌بار بازسازی
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 250); });
})();

/* ═══════════════ ۱۵) اسلایدر نظرات ═══════════════ */
(function () {
  const slides = $$('.t-slide'), dotsBox = $('#tDots');
  let ti = 0, timer;
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'نظر ' + toFa(i + 1));
    d.addEventListener('click', () => go(i));
    dotsBox.appendChild(d);
  });
  const dots = $$('button', dotsBox);
  function go(i) {
    ti = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('active', j === ti));
    dots.forEach((d, j) => d.classList.toggle('active', j === ti));
    restart();
  }
  function restart() { clearInterval(timer); timer = setInterval(() => go(ti + 1), 5500); }
  $('#tNext').addEventListener('click', () => go(ti + 1));
  $('#tPrev').addEventListener('click', () => go(ti - 1));
  const slider = $('.t-slider');
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', restart);
  go(0);
})();

/* ═══════════════ ۱۶) آکاردئون ═══════════════ */
 $$('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const was = item.classList.contains('open');
    $$('.faq-item').forEach(i => i.classList.remove('open'));
    if (!was) item.classList.add('open');
  });
});

/* ═══════════════ ۱۷) توست ═══════════════ */
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}"></i><span>${msg}</span>`;
  $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4200);
}
 $$('.demo-link').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  toast('این بخش نسخه‌ی نمایشی است و به‌زودی تکمیل می‌شود.', 'error');
}));

/* ═══════════════ ۱۸) فرم تماس ═══════════════ */
(function () {
  const form = $('#contactForm');
  if (!form) return;
  const name = $('#fName'), email = $('#fEmail'), msg = $('#fMsg');
  const setErr = (input, m) => {
    input.parentElement.querySelector('.f-err').textContent = m;
    input.classList.toggle('invalid', !!m);
    return !!m;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    let bad = false;
    bad = setErr(name, name.value.trim().length < 2 ? 'لطفاً نام خود را وارد کنید.' : '') || bad;
    bad = setErr(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? 'ایمیل واردشده معتبر نیست.' : '') || bad;
    bad = setErr(msg, msg.value.trim().length < 10 ? 'پیام باید حداقل ۱۰ کاراکتر باشد.' : '') || bad;
    if (bad) { toast('لطفاً خطاهای فرم را برطرف کنید.', 'error'); return; }
    const btn = $('#submitBtn');
    btn.classList.add('loading'); btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('loading'); btn.disabled = false;
      form.reset();
      toast('پیام شما با موفقیت ارسال شد؛ به‌زودی پاسخ می‌دهم.');
    }, 1600);
  });
  $$('input, textarea', form).forEach(i => i.addEventListener('input', () => {
    i.classList.remove('invalid');
    const err = i.parentElement.querySelector('.f-err');
    if (err) err.textContent = '';
  }));
})();

/* ═══════════════ ۱۹) دکمه‌های مغناطیسی ═══════════════ */
if (finePointer) {
  $$('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * .22}px,${y * .22}px)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
  });
}

/* ═══════════════ سیستم تم رنگی — ۹ تم ═══════════════ */
const AF_THEMES={
turquoise:{vars:{'--navy':'#123B4A','--navy-deep':'#0C2B37','--bg':'#F8FAF7','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#20B2AA','--pistachio':'#8FBE73','--pistachio-l':'#A8D08D','--gold':'#E8C547','--text':'#123B4A','--text-2':'#52727C','--mint':'#EEF4EE','--border':'rgba(18,59,74,.11)','--sh-sm':'0 18px 44px -18px rgba(18,59,74,.16)','--sh-lg':'0 44px 90px -32px rgba(18,59,74,.30)','--navy-rgb':'18,59,74','--teal-rgb':'32,178,170','--btn-sh':'0 14px 30px -8px rgba(32,178,170,.45)','--btn-sh-h':'0 16px 34px -8px rgba(143,190,115,.5)'},net:{n:'18,59,74',t:'32,178,170',g:'201,162,39',T:'32,178,170',G:'232,197,71',P:'168,208,141'}},
sunset:{vars:{'--navy':'#43291F','--navy-deep':'#301B13','--bg':'#FBF5EE','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#E06A3C','--pistachio':'#D99A3D','--pistachio-l':'#E8B566','--gold':'#F2C14E','--text':'#43291F','--text-2':'#7A5F53','--mint':'#F6EBDD','--border':'rgba(67,41,31,.11)','--sh-sm':'0 18px 44px -18px rgba(67,41,31,.16)','--sh-lg':'0 44px 90px -32px rgba(67,41,31,.30)','--navy-rgb':'67,41,31','--teal-rgb':'224,106,60','--btn-sh':'0 14px 30px -8px rgba(224,106,60,.45)','--btn-sh-h':'0 16px 34px -8px rgba(217,154,61,.5)'},net:{n:'67,41,31',t:'224,106,60',g:'196,138,44',T:'224,106,60',G:'242,193,78',P:'232,170,102'}},
violet:{vars:{'--navy':'#2E2750','--navy-deep':'#211C40','--bg':'#F9F8FC','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#7C6BE8','--pistachio':'#9F7FE0','--pistachio-l':'#BCA5EE','--gold':'#F2C14E','--text':'#2E2750','--text-2':'#66628C','--mint':'#EDEBF8','--border':'rgba(46,39,80,.11)','--sh-sm':'0 18px 44px -18px rgba(46,39,80,.16)','--sh-lg':'0 44px 90px -32px rgba(46,39,80,.30)','--navy-rgb':'46,39,80','--teal-rgb':'124,107,232','--btn-sh':'0 14px 30px -8px rgba(124,107,232,.45)','--btn-sh-h':'0 16px 34px -8px rgba(159,127,224,.5)'},net:{n:'46,39,80',t:'124,107,232',g:'186,148,62',T:'124,107,232',G:'242,193,78',P:'188,165,238'}},
emerald:{vars:{'--navy':'#1B3A31','--navy-deep':'#122822','--bg':'#F6FAF6','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#2FA37A','--pistachio':'#7BB548','--pistachio-l':'#A3CC73','--gold':'#E8C547','--text':'#1B3A31','--text-2':'#4E6B60','--mint':'#EAF3EC','--border':'rgba(27,58,49,.11)','--sh-sm':'0 18px 44px -18px rgba(27,58,49,.16)','--sh-lg':'0 44px 90px -32px rgba(27,58,49,.30)','--navy-rgb':'27,58,49','--teal-rgb':'47,163,122','--btn-sh':'0 14px 30px -8px rgba(47,163,122,.45)','--btn-sh-h':'0 16px 34px -8px rgba(123,181,72,.5)'},net:{n:'27,58,49',t:'47,163,122',g:'196,148,44',T:'47,163,122',G:'232,197,71',P:'163,204,115'}},
ocean:{vars:{'--navy':'#16405C','--navy-deep':'#0F2C42','--bg':'#EFF6FB','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#1F7EC2','--pistachio':'#3FB6C9','--pistachio-l':'#8AD4DF','--gold':'#E8C547','--text':'#16405C','--text-2':'#52707F','--mint':'#E2EEF6','--border':'rgba(22,64,92,.11)','--sh-sm':'0 18px 44px -18px rgba(22,64,92,.16)','--sh-lg':'0 44px 90px -32px rgba(22,64,92,.30)','--navy-rgb':'22,64,92','--teal-rgb':'31,126,194','--btn-sh':'0 14px 30px -8px rgba(31,126,194,.45)','--btn-sh-h':'0 16px 34px -8px rgba(63,182,201,.5)'},net:{n:'22,64,92',t:'31,126,194',g:'186,148,50',T:'31,126,194',G:'232,197,71',P:'138,212,223'}},
peach:{vars:{'--navy':'#7E6560','--navy-deep':'#5F4A46','--bg':'#FDF4F1','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#E07F90','--pistachio':'#E8A878','--pistachio-l':'#F6CBAE','--gold':'#EFC97E','--text':'#6E5650','--text-2':'#A98D86','--mint':'#FAE9E4','--border':'rgba(126,101,96,.12)','--sh-sm':'0 18px 44px -18px rgba(126,101,96,.16)','--sh-lg':'0 44px 90px -32px rgba(126,101,96,.28)','--navy-rgb':'126,101,96','--teal-rgb':'224,127,144','--btn-sh':'0 14px 30px -8px rgba(224,127,144,.4)','--btn-sh-h':'0 16px 34px -8px rgba(232,168,120,.5)'},net:{n:'126,101,96',t:'224,127,144',g:'186,152,88',T:'224,127,144',G:'239,201,126',P:'246,203,174'}},
mist:{vars:{'--navy':'#5E7590','--navy-deep':'#465A70','--bg':'#F3F7FA','--white':'#FFFFFF','--glass':'rgba(255,255,255,.66)','--glass-br':'rgba(255,255,255,.85)','--teal':'#6E9BC9','--pistachio':'#A8D8C8','--pistachio-l':'#C8E8DE','--gold':'#EFC97E','--text':'#4A5F76','--text-2':'#7E93A8','--mint':'#E9F1F7','--border':'rgba(94,117,144,.12)','--sh-sm':'0 18px 44px -18px rgba(94,117,144,.16)','--sh-lg':'0 44px 90px -32px rgba(94,117,144,.28)','--navy-rgb':'94,117,144','--teal-rgb':'110,155,201','--btn-sh':'0 14px 30px -8px rgba(110,155,201,.45)','--btn-sh-h':'0 16px 34px -8px rgba(168,216,200,.5)'},net:{n:'94,117,144',t:'110,155,201',g:'186,152,88',T:'110,155,201',G:'239,201,126',P:'200,232,222'}},
night:{dk:1,vars:{'--navy':'#1E3342','--navy-deep':'#0B131B','--bg':'#0E1721','--white':'#182734','--glass':'rgba(24,39,52,.62)','--glass-br':'rgba(255,255,255,.09)','--teal':'#29B8C6','--pistachio':'#7FC98B','--pistachio-l':'#A5D9AC','--gold':'#E8C547','--text':'#E4ECF1','--text-2':'#8CA3B2','--mint':'#121E29','--border':'rgba(255,255,255,.08)','--sh-sm':'0 18px 44px -18px rgba(0,0,0,.45)','--sh-lg':'0 44px 90px -32px rgba(0,0,0,.55)','--navy-rgb':'228,236,241','--teal-rgb':'41,184,198','--btn-sh':'0 14px 30px -8px rgba(41,184,198,.35)','--btn-sh-h':'0 16px 34px -8px rgba(127,201,139,.4)'},net:{n:'205,216,225',t:'41,184,198',g:'190,164,60',T:'41,184,198',G:'232,197,71',P:'165,217,172'}},
galaxy:{dk:1,vars:{'--navy':'#2B2553','--navy-deep':'#191539','--bg':'#141024','--white':'#211C41','--glass':'rgba(33,28,65,.62)','--glass-br':'rgba(255,255,255,.1)','--teal':'#8F7FF0','--pistachio':'#D982C8','--pistachio-l':'#E8A8DA','--gold':'#F2C14E','--text':'#EAE7F8','--text-2':'#9B94C6','--mint':'#1E1939','--border':'rgba(255,255,255,.09)','--sh-sm':'0 18px 44px -18px rgba(0,0,0,.45)','--sh-lg':'0 44px 90px -32px rgba(0,0,0,.55)','--navy-rgb':'234,231,248','--teal-rgb':'143,127,240','--btn-sh':'0 14px 30px -8px rgba(143,127,240,.4)','--btn-sh-h':'0 16px 34px -8px rgba(217,130,200,.45)'},net:{n:'213,208,240',t:'143,127,240',g:'192,160,70',T:'143,127,240',G:'242,193,78',P:'232,168,218'}}
};
const AF_NAMES={turquoise:'فیروزه',sunset:'غروب',violet:'شبنم',emerald:'زمرد',ocean:'اقیانوس',peach:'گلبهی',mist:'مه',night:'شبانه',galaxy:'کهکشان'};
let afSaved='turquoise';
try{afSaved=localStorage.getItem('afTheme')||'turquoise'}catch(e){}
if(!AF_THEMES[afSaved])afSaved='turquoise';
let afCur='turquoise';
function afApply(name,animate){
  const t=AF_THEMES[name];if(!t)return;
  const from=AF_THEMES[afCur].net,to=t.net,map={};
  for(const k in from)map[from[k]]=to[k];
  const root=document.documentElement;
  if(animate){root.classList.add('theme-fade');setTimeout(()=>root.classList.remove('theme-fade'),650)}
  for(const k in t.vars)root.style.setProperty(k,t.vars[k]);
  root.classList.toggle('dk',!!t.dk);
  afCur=name;
  try{localStorage.setItem('afTheme',name)}catch(e){}
  (window.AF_NETS||[]).forEach(net=>{
    net.nodes.forEach(n=>{if(map[n.col])n.col=map[n.col]});
    net.pulses.forEach(p=>{if(map[p.col])p.col=map[p.col]});
    if(map[net.o.mouseRGB])net.o.mouseRGB=map[net.o.mouseRGB];
  });
  $$('.tc').forEach(c=>c.classList.toggle('active',c.dataset.theme===name));
  if(animate)toast('تم «'+AF_NAMES[name]+'» اعمال شد و در همه‌ی صفحات ذخیره شد.');
}
 $$('.tc').forEach(c=>c.addEventListener('click',()=>afApply(c.dataset.theme,true)));
afApply(afSaved,false);