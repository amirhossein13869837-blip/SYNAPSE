(function(){
'use strict';

document.documentElement.classList.add('js');

/* ─── ابزارها ─── */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* در دسترس اسکریپت‌های داخل صفحات */
window.$ = $; window.$$ = $$; window.toFa = toFa;

/* اجرای ایمن */
const safe = fn => { try { fn(); } catch (e) { console.warn('main.js →', e); } };

/* ═══ ۱) شبکه‌ی عصبی پس‌زمینه ═══ */
const NT = {
  light: { ns:[['18,59,74',.74],['32,178,170',.15],['201,162,39',.11]], na:.55, lm:.13, mr:'18,59,74', mm:.42, dn:4100, mx:640, mn:26, ld:104 },
  dark:  { ns:[['32,178,170',.42],['255,255,255',.3],['232,197,71',.16],['168,208,141',.12]], na:.85, lm:.22, mr:'232,197,71', mm:.55, dn:4400, mx:600, mn:24, ld:116 }
};
class Neural{
  constructor(cv, th){
    this.cv = cv; this.ctx = cv.getContext('2d'); this.host = cv.parentElement;
    this.o = Object.assign({}, NT[th] || NT.light, { sp:.3, rp:100, md:165, hb:.1, pm:200, px:620, pd:[420,950], mp:16 });
    this.ns = []; this.ps = []; this.cells = [];
    this.m = { x:-1e4, y:-1e4 };
    this.on = true; this.lz = 0; this.wt = 0;
    this.gw = 1; this.gh = 1; this.L = 100; this.w = 1; this.h = 1;
    this.size();
    addEventListener('resize', () => { clearTimeout(this._z); this._z = setTimeout(() => this.size(), 180); });
    this.host.addEventListener('mousemove', e => {
      const r = this.cv.getBoundingClientRect();
      this.m.x = e.clientX - r.left; this.m.y = e.clientY - r.top;
    }, { passive:true });
    this.host.addEventListener('mouseleave', () => { this.m.x = -1e4; this.m.y = -1e4; });
    if ('IntersectionObserver' in window)
      new IntersectionObserver(es => es.forEach(en => this.on = en.isIntersecting)).observe(this.host);
    this._loop = this.loop.bind(this);
    requestAnimationFrame(this._loop);
  }
  size(){
    const r = this.host.getBoundingClientRect();
    const mb = innerWidth < 640;
    const dpr = Math.min(devicePixelRatio || 1, mb ? 1.3 : 1.6);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dn = mb ? this.o.dn * 1.6 : this.o.dn;
    const mx = mb ? Math.min(this.o.mx, 300) : this.o.mx;
    const n = Math.max(this.o.mn, Math.min(mx, Math.round(this.w * this.h / dn)));
    this.L = this.o.ld * (mb ? .92 : 1);
    this.ns = Array.from({ length: n }, () => this.mk());
    this.ps = [];
  }
  mk(){
    const r = Math.random();
    let acc = 0, col = this.o.ns[0][0];
    for (const [g, w] of this.o.ns) { acc += w; if (r <= acc) { col = g; break; } }
    return { x: Math.random() * this.w, y: Math.random() * this.h,
      vx: (Math.random() - .5) * this.o.sp * 2, vy: (Math.random() - .5) * this.o.sp * 2,
      r: 1 + Math.random() * 1.5, col, hub: Math.random() < this.o.hb, gx: 0, gy: 0 };
  }
  step(dt){
    for (const n of this.ns) {
      const dx = n.x - this.m.x, dy = n.y - this.m.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < this.o.rp * this.o.rp) {
        const d = Math.sqrt(d2) || 1, f = (this.o.rp - d) / this.o.rp * .5;
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
  grid(){
    const c = this.L;
    this.gw = Math.max(1, Math.ceil(this.w / c));
    this.gh = Math.max(1, Math.ceil(this.h / c));
    this.cells = new Array(this.gw * this.gh);
    for (const n of this.ns) {
      let gx = n.x / c | 0; if (gx < 0) gx = 0; if (gx >= this.gw) gx = this.gw - 1;
      let gy = n.y / c | 0; if (gy < 0) gy = 0; if (gy >= this.gh) gy = this.gh - 1;
      n.gx = gx; n.gy = gy;
      const i = gy * this.gw + gx;
      (this.cells[i] || (this.cells[i] = [])).push(n);
    }
  }
  edge(a, b){
    const dx = a.x - b.x, dy = a.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > this.L * this.L) return;
    const al = (1 - Math.sqrt(d2) / this.L) * this.o.lm;
    if (al < .015) return;
    const x = this.ctx;
    x.strokeStyle = `rgba(${a.col},${al})`;
    x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
  }
  draw(now, dt){
    const x = this.ctx, o = this.o;
    x.clearRect(0, 0, this.w, this.h);
    x.lineWidth = 1;
    for (let gy = 0; gy < this.gh; gy++) {
      for (let gx = 0; gx < this.gw; gx++) {
        const cell = this.cells[gy * this.gw + gx];
        if (!cell) continue;
        for (const a of cell) {
          for (let oy = 0; oy <= 1; oy++) {
            for (let ox = (oy === 0 ? 0 : -1); ox <= 1; ox++) {
              if (oy === 0 && ox === 0) {
                const ar = cell, i = ar.indexOf(a);
                for (let j = i + 1; j < ar.length; j++) this.edge(a, ar[j]);
              } else {
                const nb = this.cells[(gy + oy) * this.gw + (gx + ox)];
                if (nb) for (const b of nb) this.edge(a, b);
              }
            }
          }
        }
      }
    }
    if (fine) {
      x.lineWidth = 1.2;
      for (const n of this.ns) {
        const d = Math.hypot(n.x - this.m.x, n.y - this.m.y);
        if (d < o.md) {
          const al = (1 - d / o.md) * o.mm;
          x.strokeStyle = `rgba(${o.mr},${al})`;
          x.beginPath(); x.moveTo(n.x, n.y); x.lineTo(this.m.x, this.m.y); x.stroke();
        }
      }
    }
    for (const n of this.ns) {
      x.fillStyle = `rgba(${n.col},${o.na})`;
      x.beginPath(); x.arc(n.x, n.y, n.r, 0, 7); x.fill();
      if (n.hub) {
        x.strokeStyle = `rgba(${n.col},.3)`;
        x.lineWidth = 1;
        x.beginPath(); x.arc(n.x, n.y, n.r + 3.5, 0, 7); x.stroke();
      }
    }
    this.pulse(now);
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.t += dt * 16;
      const k = p.t / p.dur;
      if (k >= 1) { this.ps.splice(i, 1); continue; }
      const fx = p.a.x + (p.b.x - p.a.x) * k;
      const fy = p.a.y + (p.b.y - p.a.y) * k;
      const f = Math.sin(k * Math.PI);
      x.fillStyle = `rgba(${p.col},${.95 * f})`;
      x.beginPath(); x.arc(fx, fy, 2.2, 0, 7); x.fill();
      x.fillStyle = `rgba(${p.col},${.22 * f})`;
      x.beginPath(); x.arc(fx, fy, 6, 0, 7); x.fill();
    }
  }
  pulse(now){
    if (now - this.lz < this.wt || this.ps.length >= this.o.mp) return;
    this.wt = this.o.pm + Math.random() * (this.o.px - this.o.pm);
    this.lz = now;
    const a = this.ns[Math.random() * this.ns.length | 0];
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
    if (best && bd < (this.L * 1.5) ** 2)
      this.ps.push({ a, b: best, t: 0, dur: this.o.pd[0] + Math.random() * (this.o.pd[1] - this.o.pd[0]), col: a.col });
  }
  loop(now){
    if (!this.on || document.hidden) { this.pt = now; requestAnimationFrame(this._loop); return; }
    const dt = Math.min(2.5, (now - (this.pt || now)) / 16.7);
    this.pt = now;
    this.step(dt); this.grid(); this.draw(now, dt);
    requestAnimationFrame(this._loop);
  }
}
window.AF_NETS = [];
safe(() => { if (!reduced) $$('canvas.net').forEach(c => window.AF_NETS.push(new Neural(c, c.dataset.net || 'light'))); });

// ═══ ۲) لودر مشترک — همان بوتِ شبکه‌ی عصبی صفحه‌ی اصلی ═══
safe(() => {
  if (document.getElementById('ldMain') || document.getElementById('ldAccent')) return;

  $$('.ld-a, .ld-m').forEach(el => el.remove());

  if (reduced) { document.body.classList.remove('locked'); return; }

  let seen = false;
  try { seen = !!sessionStorage.getItem('afSeen'); } catch (err) {}
  const DUR = seen ? 800 : 2100;

  const accent = document.createElement('div');
  accent.className = 'ld-a';
  const main = document.createElement('div');
  main.className = 'ld-m';
  main.innerHTML =
    '<div class="ld-stage"><canvas></canvas><span class="ld-logo">ک</span></div>' +
    '<div class="ld-inner">' +
      '<div class="ld-name"><span style="--i:0">کامیار</span><span style="--i:1">احمدی</span></div>' +
      '<div class="ld-sub">در حال آماده‌سازی شبکه‌ی عصبی…</div>' +
    '</div>' +
    '<div class="ld-status">اتصال نورون‌ها…</div>' +
    '<div class="ld-count">۰٪</div>';
  document.body.append(accent, main);
  document.body.classList.add('locked');

  const cvs = main.querySelector('canvas');
  const ctx = cvs.getContext('2d');
  const count = main.querySelector('.ld-count');
  const statusEl = main.querySelector('.ld-status');
  const S = 280, dpr = Math.min(devicePixelRatio || 1, 2);
  cvs.width = S * dpr; cvs.height = S * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* شبکه‌ی حلقوی نورون‌ها — همان ساختار صفحه‌ی اصلی */
  const cx = S / 2, cy = S / 2, N = 34;
  const nodes = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2 + (Math.random() - .5) * .15;
    const rr = 104 + (Math.random() - .5) * 30;
    return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  });
  const edges = [];
  for (let i = 0; i < N; i++) {
    edges.push([i, (i + 1) % N]);
    if (i % 2 === 0) edges.push([i, (i + 5) % N]);
    if (i % 3 === 0) edges.push([i, (i + 9) % N]);
    if (i % 5 === 0) edges.push([i, (i + 16) % N]);
  }
  const STATUS = [[0, 'اتصال نورون‌ها…'], [30, 'راه‌اندازی لایه‌ها…'], [60, 'همگام‌سازی سیگنال‌ها…'], [85, 'آماده‌سازی تجربه…']];
  const ease = t => 1 - Math.pow(1 - t, 3);
  const t0 = performance.now();
  let rot = 0, finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    main.classList.add('done');
    accent.classList.add('done');
    document.body.classList.remove('locked');
    try { sessionStorage.setItem('afSeen', '1'); } catch (err) {}
    setTimeout(() => { accent.remove(); main.remove(); }, 1700);
  }

  setTimeout(finish, DUR + 2800);

  (function tick(now) {
    if (finished) return;
    const p = Math.min(1, (now - t0) / DUR), v = ease(p);
    const pct = Math.round(v * 100);
    count.textContent = toFa(pct) + '٪';
    for (const st of STATUS) if (pct >= st[0]) statusEl.textContent = st[1];

    rot += .0032;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    const shown = Math.floor(v * edges.length);
    edges.forEach((ed, i) => {
      const local = Math.max(0, Math.min(1, v * edges.length - i));
      if (local <= 0) return;
      const fade = i === shown - 1 ? 1 : .5 + local * .4;
      const a = ed[0], b = ed[1];
      const d = Math.abs(a - b);
      const long = d > 6 || d > N - 6;
      ctx.strokeStyle = long
        ? 'rgba(232,197,71,' + (.5 * fade) + ')'
        : 'rgba(32,178,170,' + (.42 * fade) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(nodes[a].x, nodes[a].y);
      ctx.lineTo(nodes[b].x, nodes[b].y);
      ctx.stroke();
    });
    nodes.forEach((n, i) => {
      const on = i / N <= v * 1.15;
      ctx.fillStyle = on
        ? (i % 5 === 0 ? 'rgba(232,197,71,.95)' : 'rgba(32,178,170,.9)')
        : 'rgba(255,255,255,.14)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, i % 5 === 0 ? 2.8 : 2, 0, 7);
      ctx.fill();
    });
    ctx.restore();

    if (p < 1) requestAnimationFrame(tick);
    else setTimeout(finish, 380);
  })(t0);
});

/* ═══ ۳) کرسر کشسان ═══ */
safe(() => {
  if (!fine) return;
  const dot = $('#cDot'), ring = $('#cRing'), lb = $('#cLabel'), rp = $('#cRip');
  if (!dot || !ring) return;
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
  }, { passive:true });
  if (rp) addEventListener('mousedown', e => {
    rp.style.left = e.clientX + 'px';
    rp.style.top = e.clientY + 'px';
    rp.classList.remove('go'); void rp.offsetWidth; rp.classList.add('go');
  });
  (function loop(){
    const dx = mx - rx, dy = my - ry;
    rx += dx * .17; ry += dy * .17;
    const sp = Math.hypot(dx, dy), st = Math.min(.35, sp * .009), an = Math.atan2(dy, dx);
    ring.style.transform =
      `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) rotate(${an.toFixed(3)}rad) ` +
      `scale(${(1 + st).toFixed(3)},${(1 - st * .6).toFixed(3)}) rotate(${(-an).toFixed(3)}rad)`;
    requestAnimationFrame(loop);
  })();
  addEventListener('mouseover', e => {
    if (!e.target.closest) return;
    const c = e.target.closest('[data-cursor]');
    const h = e.target.closest('a,button');
    ring.classList.remove('cursor-big', 'cursor-hover');
    dot.classList.remove('on', 'hide');
    if (lb) lb.textContent = '';
    if (c) { ring.classList.add('cursor-big'); dot.classList.add('hide'); if (lb) lb.textContent = c.dataset.cursor || ''; }
    else if (h) { ring.classList.add('cursor-hover'); dot.classList.add('on'); }
  });
});

/* ═══ ۴) هدر، نوار پیشرفت، بازگشت به بالا ═══ */
safe(() => {
  const hd = $('#header'), bar = $('#pBar'), tt = $('#toTop'), rg = $('#ttRing');
  if (!hd) return;
  const C = rg ? 2 * Math.PI * 26 : 0;
  if (rg) { rg.style.strokeDasharray = C; rg.style.strokeDashoffset = C; }
  function sc(){
    hd.classList.toggle('scrolled', scrollY > 40);
    const max = document.documentElement.scrollHeight - innerHeight || 1;
    const p = Math.min(1, scrollY / max);
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (rg) rg.style.strokeDashoffset = C * (1 - p);
    if (tt) tt.classList.toggle('show', scrollY > 500);
  }
  addEventListener('scroll', sc, { passive:true });
  sc();
  if (tt) tt.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
});

/* ═══ ۵) منوی موبایل ═══ */
safe(() => {
  const b = $('#burger');
  if (b) b.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('.m-link, .mobile-menu .btn').forEach(a =>
    a.addEventListener('click', () => document.body.classList.remove('menu-open')));
});

/* ═══ ۶) تیتر کلمه‌به‌کلمه ═══ */
safe(() => {
  $$('[data-split]').forEach(el => {
    const f = document.createDocumentFragment();
    let i = 0;
    const wp = n => {
      const w = document.createElement('span'); w.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi';
      wi.style.setProperty('--wd', (i++ * .07).toFixed(2) + 's');
      w.appendChild(wi); wi.appendChild(n);
      return w;
    };
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/\s+/).filter(Boolean).forEach(wd => {
          f.appendChild(wp(document.createTextNode(wd)));
          f.appendChild(document.createTextNode(' '));
        });
      } else f.appendChild(wp(n));
    });
    el.innerHTML = ''; el.appendChild(f);
  });
});

/* ═══ ۷) ریویل و شمارنده‌ها ═══ */
safe(() => {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold:.12, rootMargin:'0px 0px -40px 0px' });
  $$('.reveal, [data-split]').forEach(el => io.observe(el));
});
safe(() => {
  function num(el, dur = 1800){
    const t = +el.dataset.count, s = el.dataset.suffix || '';
    const t0 = performance.now();
    (function st(n){
      const p = Math.min(1, (n - t0) / dur);
      el.textContent = toFa(Math.round((1 - Math.pow(1 - p, 3)) * t)) + s;
      if (p < 1) requestAnimationFrame(st);
    })(t0);
  }
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { num(e.target); cio.unobserve(e.target); }
  }), { threshold:.4 });
  $$('[data-count]').forEach(el => cio.observe(el));
});

/* ═══ ۸) تعامل‌های موس ═══ */
safe(() => {
  if (!fine || reduced) return;
  $$('[data-tilt]').forEach(c => {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(1000px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-6px)`;
    });
    c.addEventListener('mouseleave', () => { c.style.transform = ''; });
  });
  $$('.spot').forEach(c => c.addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  $$('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * .22}px,${y * .22}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
});

/* ═══ ۹) توست ═══ */
function toast(msg, type = 'success'){
  const box = $('#toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}"></i><span>${msg}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4200);
}
window.toast = toast;
safe(() => {
  $$('.demo-link').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    toast('این بخش نسخه‌ی نمایشی است و به‌زودی تکمیل می‌شود.', 'error');
  }));
});
/* ═══ ۱۰) سیستم تم — ۹ تم + پشتیبانی تیره در همه‌ی صفحات ═══ */
safe(() => {
  const T={
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
  let saved='turquoise';
  try{saved=localStorage.getItem('afTheme')||'turquoise'}catch(e){}
  const t=T[saved]||T.turquoise;
  const map={};for(const k in T.turquoise.net)map[T.turquoise.net[k]]=t.net[k];
  const root=document.documentElement;
  for(const k in t.vars)root.style.setProperty(k,t.vars[k]);
  if(t.dk)root.classList.add('dk');
  (window.AF_NETS||[]).forEach(net=>{
    net.nodes.forEach(n=>{if(map[n.col])n.col=map[n.col]});
    net.pulses.forEach(p=>{if(map[p.col])p.col=map[p.col]});
    if(map[net.o.mr])net.o.mr=map[net.o.mr];
    if(map[net.o.mouseRGB])net.o.mouseRGB=map[net.o.mouseRGB];
  });
  const st=document.createElement('style');
  st.textContent=
  '.work-cat{background:rgba(var(--teal-rgb),.1)}.svc-tags span{background:rgba(var(--teal-rgb),.1)}'+
  '.btn-primary{box-shadow:var(--btn-sh)}.btn-primary:hover{box-shadow:var(--btn-sh-h)}'+
  '.sk-bg{stroke:rgba(var(--navy-rgb),.09)}.sr-bg{stroke:rgba(var(--navy-rgb),.09)}'+
  '.tl-item::after{background:rgba(var(--navy-rgb),.2)}.t-dots button{background:rgba(var(--navy-rgb),.22)}'+
  '.scroll-track{background:rgba(var(--navy-rgb),.14)}'+
  '.adc-ring{border-color:rgba(var(--teal-rgb),.5)}.contact-deco{border-color:rgba(var(--teal-rgb),.35)}'+
  '.spot::before{background:radial-gradient(220px circle at var(--mx,50%) var(--my,50%),rgba(var(--teal-rgb),.12),transparent 65%)}'+
  'html.dk .glass{background:var(--glass);border-color:var(--glass-br)}'+
  'html.dk .hero-badge,html.dk .orbit-in,html.dk .c-item,html.dk .tk-badge{border-color:var(--glass-br)}'+
  'html.dk .tl-card{background:var(--glass);border-color:var(--glass-br)}'+
  'html.dk .about-frame,html.dk .ws-cover,html.dk .gal-grid img,html.dk .art-cover,html.dk .art-img{border-color:var(--white)}'+
  'html.dk .burger span{background:var(--text)}'+
  'html.dk .orbit-in text{fill:var(--text)}'+
  'html.dk .o-txt{-webkit-text-stroke:2px var(--text)}'+
  'html.dk .btn-outline{border-color:rgba(var(--navy-rgb),.45);color:var(--text)}'+
  'html.dk .btn-outline:hover{background:var(--text);color:var(--bg)}'+
  'html.dk .work-link,html.dk .ring-num,html.dk .rs-card b,html.dk .pk-price b{color:var(--text)}'+
  'html.dk .to-top .tt-bg{fill:var(--teal)}html.dk .to-top:hover .tt-bg{fill:var(--pistachio)}'+
  'html.dk .f-group input:focus,html.dk .f-group textarea:focus{background:var(--white)}';
  document.head.appendChild(st);
});
})();