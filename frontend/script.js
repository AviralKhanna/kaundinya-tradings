// ---------- Year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Mobile nav ----------
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
navMenu.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navMenu.classList.remove('open'))
);

// ---------- Animated counters ----------
const counters = document.querySelectorAll('[data-count]');
const counted = new WeakSet();
const runCounter = (el) => {
  const target = +el.dataset.count;
  const suffix = target >= 1000 ? '+' : '';
  const dur = 1400;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(eased * target).toLocaleString() + (p === 1 ? suffix : '');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting && !counted.has(e.target)) {
      counted.add(e.target);
      runCounter(e.target);
    }
  });
}, { threshold: 0.5 });
counters.forEach(c => io.observe(c));

// =====================================================
//  SIP CALCULATOR
// =====================================================
const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const rupeeShort = (n) => {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + Math.round(n);
};

const sip = {
  amount: document.getElementById('sipAmount'),
  amountR: document.getElementById('sipAmountRange'),
  rate: document.getElementById('sipRate'),
  rateR: document.getElementById('sipRateRange'),
  years: document.getElementById('sipYears'),
  yearsR: document.getElementById('sipYearsRange'),
};

// Keep number input and range slider in sync + paint slider fill.
function paintRange(range) {
  const min = +range.min, max = +range.max, val = +range.value;
  const pct = ((val - min) / (max - min)) * 100;
  range.style.setProperty('--fill', pct + '%');
}
function link(numEl, rangeEl) {
  const clamp = (v) => Math.min(+rangeEl.max, Math.max(+rangeEl.min, v || +rangeEl.min));
  rangeEl.addEventListener('input', () => { numEl.value = rangeEl.value; paintRange(rangeEl); calcSip(); });
  numEl.addEventListener('input', () => {
    const v = clamp(parseFloat(numEl.value));
    rangeEl.value = v; paintRange(rangeEl); calcSip();
  });
  paintRange(rangeEl);
}
link(sip.amount, sip.amountR);
link(sip.rate, sip.rateR);
link(sip.years, sip.yearsR);

// Future value of a SIP (investment at start of each month):
// FV = P * [ ((1+i)^n - 1) / i ] * (1+i)
function sipFV(P, annualRatePct, months) {
  const i = annualRatePct / 100 / 12;
  if (i === 0) return P * months;
  return P * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

function calcSip() {
  const P = Math.max(0, parseFloat(sip.amount.value) || 0);
  const r = Math.max(0, parseFloat(sip.rate.value) || 0);
  const years = Math.max(1, Math.round(parseFloat(sip.years.value) || 1));
  const months = years * 12;

  const invested = P * months;
  const total = sipFV(P, r, months);
  const returns = Math.max(0, total - invested);

  document.getElementById('sipInvested').textContent = rupee(invested);
  document.getElementById('sipReturns').textContent = rupee(returns);
  document.getElementById('sipTotal').textContent = rupee(total);

  drawDonut(invested, returns);

  // Build yearly series for the growth chart.
  const series = [];
  for (let y = 1; y <= years; y++) {
    const m = y * 12;
    series.push({ year: y, invested: P * m, value: sipFV(P, r, m) });
  }
  drawGrowth(series);
}

// ---------- Donut chart (SVG) ----------
function polar(cx, cy, r, angle) {
  const a = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx, cy, r, start, end) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}
function drawDonut(invested, returns) {
  const total = invested + returns || 1;
  const investedDeg = (invested / total) * 360;
  const cx = 110, cy = 110, r = 82, sw = 30;
  const pct = Math.round((returns / total) * 100);
  const seg = (start, end, color) =>
    `<path d="${arcPath(cx, cy, r, start, Math.min(end, 359.999))}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const svg = `
    ${seg(0, investedDeg, '#c9dcf5')}
    ${seg(investedDeg, 360, '#2563eb')}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#6b7c90">Returns</text>
    <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-family="Manrope, sans-serif" font-size="28" font-weight="800" fill="#0a1f3c">${pct}%</text>`;
  document.getElementById('sipDonut').innerHTML = svg;
}

// ---------- Growth area chart (SVG) ----------
function drawGrowth(series) {
  const W = 520, H = 240, pad = { l: 52, r: 14, t: 16, b: 28 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = series.length;
  const maxV = Math.max(...series.map(s => s.value), 1);
  const x = (idx) => pad.l + (n === 1 ? iw / 2 : (idx / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (v / maxV) * ih;

  const pts = (key) => series.map((s, idx) => `${x(idx)},${y(s[key])}`).join(' ');
  const areaValue = `M ${pad.l},${pad.t + ih} L ${series.map((s, idx) => `${x(idx)},${y(s.value)}`).join(' L ')} L ${x(n - 1)},${pad.t + ih} Z`;
  const areaInv = `M ${pad.l},${pad.t + ih} L ${series.map((s, idx) => `${x(idx)},${y(s.invested)}`).join(' L ')} L ${x(n - 1)},${pad.t + ih} Z`;

  // Y gridlines (4 steps)
  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const gy = pad.t + (g / 4) * ih;
    const val = maxV * (1 - g / 4);
    grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="#eef3f9"/>`;
    grid += `<text x="${pad.l - 8}" y="${gy + 4}" text-anchor="end" font-size="10" fill="#9aabbd">${rupeeShort(val)}</text>`;
  }
  // X labels (up to ~6)
  let xlab = '';
  const stepX = Math.max(1, Math.ceil(n / 6));
  series.forEach((s, idx) => {
    if (idx === 0 || idx === n - 1 || idx % stepX === 0) {
      xlab += `<text x="${x(idx)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#9aabbd">${s.year}y</text>`;
    }
  });

  const svg = `
    <defs>
      <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2563eb" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${areaValue}" fill="url(#gv)"/>
    <path d="${areaInv}" fill="#c9dcf5" opacity="0.5"/>
    <polyline points="${pts('invested')}" fill="none" stroke="#9dbbe6" stroke-width="2"/>
    <polyline points="${pts('value')}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${xlab}`;
  document.getElementById('sipGrowth').innerHTML = svg;
}

calcSip();

// =====================================================
//  INSURANCE LEAD MODAL (mobile capture)
// =====================================================
const modal = document.getElementById('leadModal');
const modalBody = document.getElementById('modalBody');
const modalSuccess = document.getElementById('modalSuccess');
const leadForm = document.getElementById('leadForm');
const leadMobile = document.getElementById('leadMobile');
const leadName = document.getElementById('leadName');
const leadError = document.getElementById('leadError');
const leadSubmit = document.getElementById('leadSubmit');
let currentProduct = '';

function openModal(product) {
  currentProduct = product;
  document.getElementById('modalKicker').textContent = product;
  document.getElementById('modalProduct').textContent = product;
  leadError.hidden = true;
  leadForm.reset();
  modalBody.hidden = false;
  modalSuccess.hidden = true;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => leadMobile.focus(), 50);
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('.ins-btn').forEach(btn =>
  btn.addEventListener('click', () => openModal(btn.dataset.product))
);
modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// Only allow digits in the phone field.
leadMobile.addEventListener('input', () => {
  leadMobile.value = leadMobile.value.replace(/\D/g, '').slice(0, 10);
});

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const mobile = leadMobile.value.trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    leadError.textContent = 'Please enter a valid 10-digit Indian mobile number.';
    leadError.hidden = false;
    return;
  }
  leadError.hidden = true;
  leadSubmit.disabled = true;
  leadSubmit.textContent = 'Submitting…';

  const payload = {
    mobile,
    name: leadName.value.trim(),
    product: currentProduct,
    type: 'insurance',
    page: location.href,
  };

  try {
    const base = (window.API_BASE || '').replace(/\/$/, '');
    const resp = await fetch(base + '/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'Request failed');
    }
  } catch (err) {
    // Backend unreachable (e.g. server not running, or opened via file://).
    console.warn('Lead submit failed:', err);
    leadError.textContent = 'Could not reach the server. Please try again shortly.';
    leadError.hidden = false;
    leadSubmit.disabled = false;
    leadSubmit.textContent = 'Get a Call Back';
    return;
  }

  document.getElementById('successProduct').textContent = currentProduct;
  modalBody.hidden = true;
  modalSuccess.hidden = false;
  leadSubmit.disabled = false;
  leadSubmit.textContent = 'Get a Call Back';
});

// ---------- Contact form (demo) ----------
const contactForm = document.getElementById('contactForm');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('contactNote').hidden = false;
  contactForm.reset();
});

// ---------- Testimonial slider ----------
const slides = document.getElementById('slides');
const dotsWrap = document.getElementById('dots');
const totalSlides = slides.children.length;
let current = 0;
for (let i = 0; i < totalSlides; i++) {
  const b = document.createElement('button');
  b.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(b);
}
const dots = dotsWrap.children;
function goTo(i) {
  current = (i + totalSlides) % totalSlides;
  slides.style.transform = `translateX(-${current * 100}%)`;
  [...dots].forEach((d, idx) => d.classList.toggle('active', idx === current));
}
goTo(0);
setInterval(() => goTo(current + 1), 5000);
