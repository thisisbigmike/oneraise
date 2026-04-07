// @ts-nocheck
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    
// ── PIXEL TRAIL ──
const dots = [];
const MAX_DOTS = 18;
for(let i = 0; i < MAX_DOTS; i++){
  const d = document.createElement('div');
  d.className = 'trail-dot';
  document.body.appendChild(d);
  dots.push({el:d, x:0, y:0});
}
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
let trailIdx = 0;
setInterval(() => {
  const d = dots[trailIdx % MAX_DOTS];
  d.x = mouseX; d.y = mouseY;
  d.el.style.left = mouseX + 'px';
  d.el.style.top = mouseY + 'px';
  d.el.style.opacity = '0.6';
  setTimeout(() => { d.el.style.opacity = '0'; }, 300);
  trailIdx++;
}, 40);

// ── MOBILE MENU ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObs.observe(el));

// ── COUNT UP ──
function animateCount(el){
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isDecimal = target % 1 !== 0;
  const duration = 1800;
  const start = performance.now();
  function step(now){
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = eased * target;
    el.innerHTML = prefix + (isDecimal ? value.toFixed(1) : Math.floor(value)) + '<span class="accent">' + suffix + '</span>';
    if(progress < 1) requestAnimationFrame(step);
    else el.innerHTML = prefix + target + '<span class="accent">' + suffix + '</span>';
  }
  requestAnimationFrame(step);
}
const countEls = document.querySelectorAll('[data-count]');
const countObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting){ animateCount(e.target); countObs.unobserve(e.target); }
  });
}, { threshold: 0.5 });
countEls.forEach(el => countObs.observe(el));

// ── BACKER FEED ANIMATION ──
const feedItems = document.querySelectorAll('.feed-item');
feedItems.forEach((item, i) => {
  setTimeout(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if(e.isIntersecting){ setTimeout(()=>item.classList.add('in'), i*150); obs.disconnect(); }});
    }, {threshold:0.1});
    obs.observe(item);
  }, 0);
});

// ── GLOBE (canvas dot-globe) ──
(function(){
  const canvas = document.getElementById('globe');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, R, angle = 0;
  const points = [];
  function resize(){
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    R = Math.min(W,H) * 0.44;
    generatePoints();
  }
  function generatePoints(){
    points.length = 0;
    const count = 220;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for(let i=0;i<count;i++){
      const y = 1 - (i / (count-1)) * 2;
      const r = Math.sqrt(1 - y*y);
      const theta = phi * i;
      points.push({ x: Math.cos(theta)*r, y: y, z: Math.sin(theta)*r });
    }
  }
  // a few "connection" arcs
  const connections = [[0,12],[5,22],[10,30],[15,40],[3,55],[20,60],[8,70]];
  function draw(){
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const sorted = points.map(p => {
      const rx = p.x*cosA - p.z*sinA;
      const rz = p.x*sinA + p.z*cosA;
      return { sx: cx + rx*R, sy: cy + p.y*R, depth: rz };
    });
    sorted.sort((a,b)=>a.depth-b.depth);
    sorted.forEach(p => {
      const alpha = (p.depth + 1) / 2;
      const size = 1.2 + alpha * 1.4;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, size, 0, Math.PI*2);
      ctx.fillStyle = `rgba(29,158,117,${0.15 + alpha*0.5})`;
      ctx.fill();
    });
    // lines between a few nearby points
    connections.forEach(([a,b]) => {
      if(a >= sorted.length || b >= sorted.length) return;
      const pa = sorted[a], pb = sorted[b];
      if(pa.depth < 0 || pb.depth < 0) return;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.strokeStyle = `rgba(29,158,117,${(pa.depth+1)/2 * 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
    angle += 0.003;
    requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener('resize', resize);
  draw();
})();

  }, []);

  return (
    <main>


{/*  NAV  */}
<nav id="main-nav">
  <a href="#" className="nav-logo">One<span>Raise</span></a>
  <ul className="nav-links">
    <li><a href="#campaigns">Explore</a></li>
    <li><a href="#how">How it works</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#community">Community</a></li>
  </ul>
  <div className="nav-actions">
    <Link href="/auth?mode=signin" className="btn-ghost-nav">Sign in</Link>
    <Link href="/join" className="btn-primary-nav">Start a campaign</Link>
  </div>
  <button className="hamburger" id="hamburger" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</nav>

{/*  MOBILE MENU  */}
<div className="mobile-menu" id="mobile-menu">
  <a href="#campaigns">Explore</a>
  <a href="#how">How it works</a>
  <a href="#features">Features</a>
  <a href="#community">Community</a>
  <div className="mob-btns">
    <Link href="/auth?mode=signin" className="btn-ghost-nav" style={{flex: '1', textAlign: 'center', justifyContent: 'center'}}>Sign in</Link>
    <Link href="/join" className="btn-primary-nav" style={{flex: '1', textAlign: 'center', justifyContent: 'center'}}>Start campaign</Link>
  </div>
</div>

{/*  HERO  */}
<section className="hero">
  <div className="aurora">
    <div className="blob blob1"></div>
    <div className="blob blob2"></div>
    <div className="blob blob3"></div>
  </div>
  <div className="hero-content">
    <div className="hero-eyebrow">
      <span className="dot"></span>
      Now live in 78 countries
    </div>
    <h1 className="hero-headline">
      Fund your<br/>
      <span className="hero-headline-rotate">
        <span className="rotate-words">
          <span className="rotate-word">idea.</span>
          <span className="rotate-word">dream.</span>
          <span className="rotate-word">startup.</span>
          <span className="rotate-word">community.</span>
        </span>
      </span>
    </h1>
    <p className="hero-sub">OneRaise connects creators, entrepreneurs, and changemakers with a global community of 2.1 million backers — across every border, currency, and timezone.</p>
    <div className="hero-actions">
      <Link href="/join" className="btn-hero-primary">
        Start a campaign
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Link>
      <a href="#campaigns" className="btn-hero-secondary">
        Explore campaigns
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </a>
    </div>
    <div className="hero-trust">
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4h4.2l-3.4 2.5 1.3 4L7 9 3.4 11.5l1.3-4L1.3 5H5.5z" fill="#1D9E75"/></svg>
        Trusted by 148K creators
      </div>
      <div className="trust-sep"></div>
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="10" height="8" rx="2" stroke="#1D9E75" strokeWidth="1.2"/><path d="M5 4V3a2 2 0 014 0v1" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round"/></svg>
        256-bit SSL secured
      </div>
      <div className="trust-sep"></div>
      <div className="trust-item">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#1D9E75" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        0% platform fee first campaign
      </div>
    </div>
  </div>
</section>

{/*  STATS  */}
<div className="stats-section">
  <div className="stats-strip">
    <div className="stat-cell reveal">
      <div className="stat-num" data-count="4.2" data-suffix="B" data-prefix="$"><span className="accent">$</span>0</div>
      <div className="stat-lbl">Total raised</div>
      <div className="stat-delta">↑ 18% this month</div>
    </div>
    <div className="stat-cell reveal reveal-delay-1">
      <div className="stat-num" data-count="148" data-suffix="K">0K</div>
      <div className="stat-lbl">Active campaigns</div>
      <div className="stat-delta">↑ 2,400 new this week</div>
    </div>
    <div className="stat-cell reveal reveal-delay-2">
      <div className="stat-num" data-count="2.1" data-suffix="M">0M</div>
      <div className="stat-lbl">Global backers</div>
      <div className="stat-delta">78 countries represented</div>
    </div>
    <div className="stat-cell reveal reveal-delay-3">
      <div className="stat-num" data-count="78" data-suffix="%">0%</div>
      <div className="stat-lbl">Success rate</div>
      <div className="stat-delta">Industry avg is 42%</div>
    </div>
  </div>
</div>

{/*  MARQUEE  */}
<div className="marquee-section">
  <div className="marquee-track" id="marquee">
    <div className="marquee-item"><span className="flag">🇳🇬</span> Nigeria</div>
    <div className="marquee-item"><span className="flag">🇩🇪</span> Germany</div>
    <div className="marquee-item"><span className="flag">🇧🇷</span> Brazil</div>
    <div className="marquee-item"><span className="flag">🇯🇵</span> Japan</div>
    <div className="marquee-item"><span className="flag">🇮🇳</span> India</div>
    <div className="marquee-item"><span className="flag">🇺🇸</span> United States</div>
    <div className="marquee-item"><span className="flag">🇿🇦</span> South Africa</div>
    <div className="marquee-item"><span className="flag">🇨🇿</span> Czech Republic</div>
    <div className="marquee-item"><span className="flag">🇦🇺</span> Australia</div>
    <div className="marquee-item"><span className="flag">🇰🇪</span> Kenya</div>
    <div className="marquee-item"><span className="flag">🇫🇷</span> France</div>
    <div className="marquee-item"><span className="flag">🇦🇷</span> Argentina</div>
    <div className="marquee-item"><span className="flag">🇳🇬</span> Nigeria</div>
    <div className="marquee-item"><span className="flag">🇩🇪</span> Germany</div>
    <div className="marquee-item"><span className="flag">🇧🇷</span> Brazil</div>
    <div className="marquee-item"><span className="flag">🇯🇵</span> Japan</div>
    <div className="marquee-item"><span className="flag">🇮🇳</span> India</div>
    <div className="marquee-item"><span className="flag">🇺🇸</span> United States</div>
    <div className="marquee-item"><span className="flag">🇿🇦</span> South Africa</div>
    <div className="marquee-item"><span className="flag">🇨🇿</span> Czech Republic</div>
    <div className="marquee-item"><span className="flag">🇦🇺</span> Australia</div>
    <div className="marquee-item"><span className="flag">🇰🇪</span> Kenya</div>
    <div className="marquee-item"><span className="flag">🇫🇷</span> France</div>
    <div className="marquee-item"><span className="flag">🇦🇷</span> Argentina</div>
  </div>
</div>

{/*  HOW IT WORKS  */}
<section className="how-section" id="how">
  <div className="how-grid">
    <div>
      <span className="section-eyebrow reveal">How it works</span>
      <h2 className="section-title reveal reveal-delay-1">From idea to funded<br/>in 4 steps.</h2>
      <p className="section-sub reveal reveal-delay-2">No experience needed. No hidden fees. Just your idea and our global community of backers.</p>
      <div className="steps-list" style={{marginTop: '40px'}}>
        <div className="step-item reveal reveal-delay-1">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num done">✓</div></div>
          <div className="step-body">
            <div className="step-title">Create your account</div>
            <div className="step-desc">Verified in 30 seconds. No credit card required to get started.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-2">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num done">✓</div></div>
          <div className="step-body">
            <div className="step-title">Build your campaign</div>
            <div className="step-desc">Add your story, set a goal, and choose your duration — our editor makes it easy.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-3">
          <div className="step-connector"></div>
          <div className="step-num-wrap"><div className="step-num">3</div></div>
          <div className="step-body">
            <div className="step-title">Launch to the world</div>
            <div className="step-desc">Go live instantly — 2.1M backers across 78 countries can discover your campaign immediately.</div>
          </div>
        </div>
        <div className="step-item reveal reveal-delay-4">
          <div className="step-num-wrap"><div className="step-num">4</div></div>
          <div className="step-body">
            <div className="step-title">Collect your funds</div>
            <div className="step-desc">Funds transfer directly to your account. No delays, no middlemen, no surprises.</div>
          </div>
        </div>
      </div>
    </div>
    <div className="reveal reveal-delay-2">
      <div className="globe-wrap">
        <div className="globe-ring"></div>
        <div className="globe-ring globe-ring2"></div>
        <div className="globe-canvas-wrap">
          <canvas id="globe"></canvas>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  CAMPAIGNS  */}
<section className="campaigns-section" id="campaigns">
  <div className="campaigns-header">
    <div>
      <span className="section-eyebrow reveal">Live now</span>
      <h2 className="section-title reveal reveal-delay-1">Ideas finding<br/>their backers.</h2>
    </div>
    <a href="#" className="see-all reveal reveal-delay-2">View all campaigns →</a>
  </div>
  <div className="campaigns-grid">
    <div className="c-card featured reveal">
      <div className="c-card-img c1">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="32" stroke="#1D9E75" strokeWidth="1.5" strokeOpacity="0.4"/>
          <circle cx="40" cy="40" r="20" stroke="#5DCAA5" strokeWidth="1" strokeOpacity="0.3"/>
          <path d="M40 20v28M40 20l-8 8M40 20l8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="40" cy="52" r="4" fill="#1D9E75" opacity="0.8"/>
        </svg>
      </div>
      <div className="c-card-body">
        <div className="c-card-top">
          <span className="c-tag">Technology</span>
          <span className="c-flag">🌍 Global</span>
        </div>
        <div className="c-title">SolarPack Mini — Off-grid power for remote communities</div>
        <div className="c-desc">Portable 80W solar kit with battery storage, built for villages with zero grid access across Sub-Saharan Africa.</div>
        <div className="c-progress-track"><div className="c-progress-fill" style={{width: '68%'}}></div></div>
        <div className="c-stats">
          <div>
            <div className="c-raised">$68,420</div>
            <div className="c-raised-sub">raised of $100k goal</div>
          </div>
          <div style={{textAlign: 'right'}}>
            <div className="c-pct">68%</div>
            <div className="c-days">14 days left</div>
          </div>
        </div>
      </div>
    </div>
    <div className="c-card reveal reveal-delay-1">
      <div className="c-card-img c2">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M10 50L30 10l20 40H10z" stroke="#5DCAA5" strokeWidth="1.5" strokeOpacity="0.5"/>
          <path d="M20 50L30 30l10 20H20z" fill="#1D9E75" opacity="0.4"/>
        </svg>
      </div>
      <div className="c-card-body">
        <div className="c-card-top"><span className="c-tag">Education</span><span className="c-flag">🇮🇳 India</span></div>
        <div className="c-title">CodeBridge — Free coding bootcamps in rural India</div>
        <div className="c-desc">12-week intensive programs bringing tech skills to underserved youth.</div>
        <div className="c-progress-track"><div className="c-progress-fill" style={{width: '91%'}}></div></div>
        <div className="c-stats">
          <div><div className="c-raised">$45,500</div><div className="c-raised-sub">of $50k goal</div></div>
          <div style={{textAlign: 'right'}}><div className="c-pct">91%</div><div className="c-days">6 days left</div></div>
        </div>
      </div>
    </div>
    <div className="c-card reveal reveal-delay-2">
      <div className="c-card-img c3">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="24" r="12" stroke="#EF9F27" strokeWidth="1.5" strokeOpacity="0.5"/>
          <path d="M18 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#EF9F27" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="c-card-body">
        <div className="c-card-top"><span className="c-tag">Arts</span><span className="c-flag">🇧🇷 Brazil</span></div>
        <div className="c-title">Amazônia Voices — Indigenous music archive project</div>
        <div className="c-desc">Recording and preserving endangered musical traditions of the Amazon.</div>
        <div className="c-progress-track"><div className="c-progress-fill" style={{width: '34%'}}></div></div>
        <div className="c-stats">
          <div><div className="c-raised">$8,250</div><div className="c-raised-sub">of $24k goal</div></div>
          <div style={{textAlign: 'right'}}><div className="c-pct">34%</div><div className="c-days">22 days left</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  BACKER FEED + TESTIMONIALS  */}
<section className="feed-section" id="community">
  <div>
    <span className="section-eyebrow reveal">Live activity</span>
    <h2 className="section-title reveal reveal-delay-1">A community backing<br/>the world's ideas.</h2>
  </div>
  <div className="feed-layout">
    <div>
      <div className="feed-list" id="feed-list">
        <div className="feed-item">
          <div className="feed-avatar av-a">AK</div>
          <div className="feed-text">
            <div className="feed-name">Amara Kone</div>
            <div className="feed-action">backed SolarPack Mini · Lagos, Nigeria</div>
          </div>
          <div>
            <div className="feed-amount">$50</div>
            <div className="feed-time">just now</div>
          </div>
        </div>
        <div className="feed-item">
          <div className="feed-avatar av-b">JD</div>
          <div className="feed-text">
            <div className="feed-name">Jana Dvořák</div>
            <div className="feed-action">backed CodeBridge · Prague, Czech Republic</div>
          </div>
          <div>
            <div className="feed-amount">$120</div>
            <div className="feed-time">2 min ago</div>
          </div>
        </div>
        <div className="feed-item">
          <div className="feed-avatar av-c">MR</div>
          <div className="feed-text">
            <div className="feed-name">Marco Reyes</div>
            <div className="feed-action">backed Amazônia Voices · Mexico City</div>
          </div>
          <div>
            <div className="feed-amount">$75</div>
            <div className="feed-time">5 min ago</div>
          </div>
        </div>
        <div className="feed-item">
          <div className="feed-avatar av-d">PL</div>
          <div className="feed-text">
            <div className="feed-name">Priya Lal</div>
            <div className="feed-action">launched a new campaign · Mumbai, India</div>
          </div>
          <div>
            <div className="feed-amount">New</div>
            <div className="feed-time">8 min ago</div>
          </div>
        </div>
        <div className="feed-item">
          <div className="feed-avatar av-a">EO</div>
          <div className="feed-text">
            <div className="feed-name">Emeka Obi</div>
            <div className="feed-action">backed SolarPack Mini · Abuja, Nigeria</div>
          </div>
          <div>
            <div className="feed-amount">$200</div>
            <div className="feed-time">11 min ago</div>
          </div>
        </div>
      </div>
    </div>
    <div className="testimonials">
      <div className="testi-card reveal">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">"OneRaise made it effortless to support ideas from across Africa. My money reached the creator in minutes — not weeks."</div>
        <div className="testi-person">
          <div className="feed-avatar av-a" style={{width: '38px', height: '38px'}}>AK</div>
          <div>
            <div className="testi-name">Amara Kone</div>
            <div className="testi-meta">Backer · Lagos, Nigeria · 12 campaigns backed</div>
          </div>
        </div>
      </div>
      <div className="testi-card reveal reveal-delay-1">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">"I backed a solar project in Kenya from my living room in Prague. This is what global community actually looks like."</div>
        <div className="testi-person">
          <div className="feed-avatar av-b" style={{width: '38px', height: '38px'}}>JD</div>
          <div>
            <div className="testi-name">Jana Dvořák</div>
            <div className="testi-meta">Backer · Prague, Czech Republic · 8 campaigns</div>
          </div>
        </div>
      </div>
      <div className="testi-card reveal reveal-delay-2">
        <div className="testi-stars">★★★★★</div>
        <div className="testi-quote">"We raised $68k in 16 days. The campaign tools are intuitive and the backer community is genuinely engaged."</div>
        <div className="testi-person">
          <div className="feed-avatar av-c" style={{width: '38px', height: '38px'}}>TC</div>
          <div>
            <div className="testi-name">Tunde Coker</div>
            <div className="testi-meta">Creator · SolarPack Mini Campaign</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/*  FEATURES  */}
<section className="features-section" id="features">
  <div style={{maxWidth: '600px'}}>
    <span className="section-eyebrow reveal">Why OneRaise</span>
    <h2 className="section-title reveal reveal-delay-1">Built for every creator,<br/>every country.</h2>
  </div>
  <div className="features-grid">
    <div className="feat-card reveal">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1D9E75" strokeWidth="1.5" strokeOpacity="0.6"/><path d="M7 11l3 3 5-5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Zero fees, first campaign</div>
      <div className="feat-desc">Your first campaign runs with 0% platform fee. We only grow when you grow.</div>
    </div>
    <div className="feat-card reveal reveal-delay-1">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="12" rx="2" stroke="#1D9E75" strokeWidth="1.5"/><path d="M3 9h16" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Multi-currency payouts</div>
      <div className="feat-desc">Accept funding in 40+ currencies. Receive your payout in your local currency.</div>
    </div>
    <div className="feat-card reveal reveal-delay-2">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2 6h6l-5 3.5 2 6L11 15l-5 3.5 2-6L3 9h6z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Smart campaign tools</div>
      <div className="feat-desc">AI-powered title, description, and goal suggestions based on successful campaigns in your category.</div>
    </div>
    <div className="feat-card reveal reveal-delay-1">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#1D9E75" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Real-time analytics</div>
      <div className="feat-desc">Live dashboard tracking your backer locations, conversion rates, and funding velocity.</div>
    </div>
    <div className="feat-card reveal reveal-delay-2">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11a7 7 0 1014 0A7 7 0 004 11z" stroke="#1D9E75" strokeWidth="1.5"/><path d="M9 11c0-3.5 1.5-6 2-6s2 2.5 2 6-1.5 6-2 6-2-2.5-2-6z" stroke="#1D9E75" strokeWidth="1.5"/><path d="M4 11h14" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <div className="feat-title">Global discovery</div>
      <div className="feat-desc">Automatic translation and regional promotion puts your campaign in front of the right backers worldwide.</div>
    </div>
    <div className="feat-card reveal reveal-delay-3">
      <div className="feat-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l1.5 4h4.5L13.5 10l1.5 4.5L11 12l-4 2.5L8.5 10 5 7h4.5z" stroke="#1D9E75" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <div className="feat-title">Verified badge program</div>
      <div className="feat-desc">Earn a Verified Creator badge that boosts trust and increases backer conversion by up to 3×.</div>
    </div>
  </div>
</section>

{/*  CTA  */}
<section className="cta-section">
  <div className="cta-inner">
    <h2 className="cta-title reveal">Your idea deserves<br/><em>the world's</em> backing.</h2>
    <p className="cta-sub reveal reveal-delay-1">Join 148,000 creators who've already launched on OneRaise. Your first campaign is free.</p>
    <div className="cta-actions reveal reveal-delay-2">
      <Link href="/join" className="btn-hero-primary" style={{fontSize: '15px', padding: '14px 28px'}}>Start your campaign →</Link>
      <a href="#" className="btn-hero-secondary" style={{fontSize: '15px', padding: '14px 28px'}}>Talk to our team</a>
    </div>
  </div>
</section>

{/*  FOOTER  */}
<footer>
  <div className="footer-grid">
    <div>
      <div className="footer-brand-name">One<span>Raise</span></div>
      <div className="footer-tagline">Fund anything, everywhere. Connecting creators and backers across every border since 2024.</div>
      <div className="footer-socials">
        <a href="#" className="social-btn">X</a>
        <a href="#" className="social-btn">in</a>
        <a href="#" className="social-btn">IG</a>
        <a href="#" className="social-btn">YT</a>
      </div>
    </div>
    <div>
      <div className="footer-col-title">Platform</div>
      <ul className="footer-links">
        <li><a href="#">Explore campaigns</a></li>
        <li><Link href="/join">Start a campaign</Link></li>
        <li><a href="#">How it works</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Success stories</a></li>
      </ul>
    </div>
    <div>
      <div className="footer-col-title">Company</div>
      <ul className="footer-links">
        <li><a href="#">About us</a></li>
        <li><a href="#">Blog</a></li>
        <li><a href="#">Careers</a></li>
        <li><a href="#">Press kit</a></li>
        <li><a href="#">Partners</a></li>
      </ul>
    </div>
    <div>
      <div className="footer-col-title">Support</div>
      <ul className="footer-links">
        <li><a href="#">Help centre</a></li>
        <li><a href="#">Creator guide</a></li>
        <li><a href="#">Backer FAQs</a></li>
        <li><a href="#">Contact us</a></li>
        <li><a href="#">Trust & safety</a></li>
      </ul>
    </div>
  </div>
  <div className="footer-bottom">
    <div className="footer-copy">© 2026 OneRaise Inc. All rights reserved.</div>
    <div className="footer-legal">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
      <a href="#">Cookie Settings</a>
    </div>
  </div>
</footer>



    </main>
  );
}
