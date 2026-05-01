'use client';

import { useEffect } from 'react';

export default function HomeScripts() {
  useEffect(() => {
    // ── PIXEL TRAIL ──
    const dots: { el: HTMLDivElement; x: number; y: number }[] = [];
    const MAX_DOTS = 18;
    for (let i = 0; i < MAX_DOTS; i++) {
      const d = document.createElement('div');
      d.className = 'trail-dot';
      document.body.appendChild(d);
      dots.push({ el: d, x: 0, y: 0 });
    }
    let mouseX = 0,
      mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    document.addEventListener('mousemove', handleMouseMove);
    let trailIdx = 0;
    const trailInterval = setInterval(() => {
      const d = dots[trailIdx % MAX_DOTS];
      d.x = mouseX;
      d.y = mouseY;
      d.el.style.left = mouseX + 'px';
      d.el.style.top = mouseY + 'px';
      d.el.style.opacity = '0.6';
      setTimeout(() => {
        d.el.style.opacity = '0';
      }, 300);
      trailIdx++;
    }, 40);

    // ── MOBILE MENU ──
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const handleMenuClick = () => {
      hamburger?.classList.toggle('open');
      mobileMenu?.classList.toggle('open');
      hamburger?.setAttribute(
        'aria-expanded',
        mobileMenu?.classList.contains('open') ? 'true' : 'false'
      );
    };
    const closeMobileMenu = () => {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
      hamburger?.setAttribute('aria-expanded', 'false');
    };
    const handleMenuLinkClick = (event: Event) => {
      if ((event.target as HTMLElement).closest('a')) closeMobileMenu();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileMenu();
    };
    hamburger?.addEventListener('click', handleMenuClick);
    mobileMenu?.addEventListener('click', handleMenuLinkClick);
    document.addEventListener('keydown', handleEscape);

    // ── SCROLL REVEAL ──
    const revealEls = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => revealObs.observe(el));

    // ── COUNT UP ──
    function animateCount(el: Element) {
      const target = parseFloat((el as HTMLElement).dataset.count || '0');
      const suffix = (el as HTMLElement).dataset.suffix || '';
      const prefix = (el as HTMLElement).dataset.prefix || '';
      const isDecimal = target % 1 !== 0;
      const duration = 1800;
      const start = performance.now();
      function step(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = eased * target;
        el.innerHTML =
          prefix +
          (isDecimal ? value.toFixed(1) : Math.floor(value)) +
          '<span class="accent">' +
          suffix +
          '</span>';
        if (progress < 1) requestAnimationFrame(step);
        else
          el.innerHTML =
            prefix + target + '<span class="accent">' + suffix + '</span>';
      }
      requestAnimationFrame(step);
    }
    const countEls = document.querySelectorAll('[data-count]');
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target);
            countObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    countEls.forEach((el) => countObs.observe(el));

    // ── BACKER FEED ANIMATION ──
    const feedItems = document.querySelectorAll('.feed-item');
    feedItems.forEach((item, i) => {
      setTimeout(() => {
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                setTimeout(() => item.classList.add('in'), i * 150);
                obs.disconnect();
              }
            });
          },
          { threshold: 0.1 }
        );
        obs.observe(item);
      }, 0);
    });

    // ── GLOBE (canvas dot-globe) ──
    let animationFrameId: number;
    (function () {
      const canvas = document.getElementById('globe') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let W: number, H: number, R: number, angle = 0;
      const points: { x: number; y: number; z: number }[] = [];
      function resize() {
        if (!canvas.parentElement) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W * devicePixelRatio;
        canvas.height = H * devicePixelRatio;
        ctx!.scale(devicePixelRatio, devicePixelRatio);
        R = Math.min(W, H) * 0.44;
        generatePoints();
      }
      function generatePoints() {
        points.length = 0;
        const count = 220;
        const phi = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < count; i++) {
          const y = 1 - (i / (count - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const theta = phi * i;
          points.push({ x: Math.cos(theta) * r, y: y, z: Math.sin(theta) * r });
        }
      }
      // a few "connection" arcs
      const connections = [
        [0, 12],
        [5, 22],
        [10, 30],
        [15, 40],
        [3, 55],
        [20, 60],
        [8, 70],
      ];
      function draw() {
        ctx!.clearRect(0, 0, W, H);
        const cx = W / 2,
          cy = H / 2;
        const cosA = Math.cos(angle),
          sinA = Math.sin(angle);
        const sorted = points.map((p) => {
          const rx = p.x * cosA - p.z * sinA;
          const rz = p.x * sinA + p.z * cosA;
          return { sx: cx + rx * R, sy: cy + p.y * R, depth: rz };
        });
        sorted.sort((a, b) => a.depth - b.depth);
        sorted.forEach((p) => {
          const alpha = (p.depth + 1) / 2;
          const size = 1.2 + alpha * 1.4;
          ctx!.beginPath();
          ctx!.arc(p.sx, p.sy, size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(29,158,117,${0.15 + alpha * 0.5})`;
          ctx!.fill();
        });
        // lines between a few nearby points
        connections.forEach(([a, b]) => {
          if (a >= sorted.length || b >= sorted.length) return;
          const pa = sorted[a],
            pb = sorted[b];
          if (pa.depth < 0 || pb.depth < 0) return;
          ctx!.beginPath();
          ctx!.moveTo(pa.sx, pa.sy);
          ctx!.lineTo(pb.sx, pb.sy);
          ctx!.strokeStyle = `rgba(29,158,117,${((pa.depth + 1) / 2) * 0.2})`;
          ctx!.lineWidth = 0.8;
          ctx!.stroke();
        });
        angle += 0.003;
        animationFrameId = requestAnimationFrame(draw);
      }
      resize();
      window.addEventListener('resize', resize);
      draw();

      return () => {
        window.removeEventListener('resize', resize);
      };
    })();

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(trailInterval);
      hamburger?.removeEventListener('click', handleMenuClick);
      mobileMenu?.removeEventListener('click', handleMenuLinkClick);
      document.removeEventListener('keydown', handleEscape);
      revealObs.disconnect();
      countObs.disconnect();
      dots.forEach((d) => d.el.remove());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return null;
}
