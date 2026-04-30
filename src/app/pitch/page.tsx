"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

const SLIDES = [
  {
    id: "intro",
    eyebrow: "ONE RAISE",
    title: "Fund Anything, Everywhere",
    description: "The first borderless crowdfunding platform bridging local African rails to global capital.",
    image: "/pitch_hero_globe_1777477061303.png",
    type: "hero",
  },
  {
    id: "problem",
    eyebrow: "THE BARRIER",
    title: "Crowdfunding is Broken for Emerging Markets",
    points: [
      {
        title: "Payment Exclusion",
        desc: "Global platforms like Kickstarter and GoFundMe are often inaccessible to African creators due to strict banking requirements.",
      },
      {
        title: "Currency Fragmentation",
        desc: "Local mobile money (M-Pesa, MTN) and bank transfers don't communicate with international payment gateways.",
      },
      {
        title: "Settlement Lag",
        desc: "Funds take weeks to clear, losing value to inflation and exchange rate volatility.",
      },
    ],
    type: "list",
  },
  {
    id: "solution",
    eyebrow: "THE BRIDGE",
    title: "The Borderless Gateway",
    description: "OneRaise connects local African economies to global liquidity via a seamless Web3 backbone.",
    image: "/pitch_bridge_rails_1777477137593.png",
    type: "split",
  },
  {
    id: "tech",
    eyebrow: "THE STACK",
    title: "Built for Global Scale",
    stack: [
      { name: "Busha", role: "Local African Rails & Crypto Liquidity", icon: "💎" },
      { name: "MoonPay", role: "Global Fiat-to-Crypto Onboarding", icon: "💳" },
      { name: "Next.js 15", role: "High-Performance Edge Architecture", icon: "⚡" },
      { name: "Supabase", role: "Real-time Data & Secure Infrastructure", icon: "🔥" },
    ],
    type: "grid",
  },
  {
    id: "market",
    eyebrow: "THE OPPORTUNITY",
    title: "Capturing the $100B Creator Economy",
    stats: [
      { label: "Market Size", value: "$104B", delta: "CAGR 28%" },
      { label: "African Users", value: "350M+", delta: "Growing" },
      { label: "Platform Fee", value: "5%", delta: "Sustainable" },
      { label: "Settlement Time", value: "< 24h", delta: "Instant" },
    ],
    type: "stats",
  },
  {
    id: "ask",
    eyebrow: "THE ASK",
    title: "Join the Revolution",
    description: "We are building the future of global social impact. Join us as we scale to 10+ markets in the next 18 months.",
    cta: "Contact: vision@oneraise.io",
    type: "cta",
  },
];

export default function PitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (!isMounted) return null;

  const slide = SLIDES[currentSlide];

  return (
    <main className="pitch-container">
      <div className="pitch-progress">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`progress-bar ${i === currentSlide ? "active" : ""} ${i < currentSlide ? "completed" : ""}`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      <div className="slide-content">
        <div className="slide-eyebrow">{slide.eyebrow}</div>
        <h1 className="slide-title">{slide.title}</h1>

        {slide.type === "hero" && (
          <div className="hero-layout">
            <p className="slide-desc">{slide.description}</p>
            <div className="image-wrap hero-image">
              <Image
                src={slide.image!}
                alt={slide.title}
                width={800}
                height={800}
                className="pitch-image"
                priority
              />
            </div>
          </div>
        )}

        {slide.type === "list" && (
          <div className="list-layout">
            {slide.points?.map((p, i) => (
              <div key={i} className="list-item">
                <div className="list-num">0{i + 1}</div>
                <div>
                  <h3 className="list-item-title">{p.title}</h3>
                  <p className="list-item-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {slide.type === "split" && (
          <div className="split-layout">
            <div className="split-text">
              <p className="slide-desc">{slide.description}</p>
              <div className="feature-dots">
                <div className="dot-item"><span className="dot"></span> Local Currency (KES, NGN, GHS)</div>
                <div className="dot-item"><span className="dot"></span> Instant Settlement</div>
                <div className="dot-item"><span className="dot"></span> Global Access</div>
              </div>
            </div>
            <div className="image-wrap split-image">
              <Image
                src={slide.image!}
                alt={slide.title}
                width={600}
                height={600}
                className="pitch-image"
              />
            </div>
          </div>
        )}

        {slide.type === "grid" && (
          <div className="grid-layout">
            {slide.stack?.map((s, i) => (
              <div key={i} className="grid-item">
                <div className="grid-icon">{s.icon}</div>
                <h3 className="grid-name">{s.name}</h3>
                <p className="grid-role">{s.role}</p>
              </div>
            ))}
          </div>
        )}

        {slide.type === "stats" && (
          <div className="stats-layout">
            {slide.stats?.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-delta">{s.delta}</div>
              </div>
            ))}
          </div>
        )}

        {slide.type === "cta" && (
          <div className="cta-layout">
            <p className="slide-desc">{slide.description}</p>
            <div className="cta-actions">
              <div className="cta-box">
                <span className="cta-text">{slide.cta}</span>
              </div>
              <Link href="/join" className="btn-signup">Sign Up Now →</Link>
            </div>
            <Link href="/" className="btn-back">Back to Platform</Link>
          </div>
        )}
      </div>

      <div className="pitch-controls">
        <button onClick={prevSlide} className="btn-nav">← Previous</button>
        <span className="slide-counter">{currentSlide + 1} / {SLIDES.length}</span>
        <button onClick={nextSlide} className="btn-nav">Next →</button>
      </div>

      <style jsx>{`
        .pitch-container {
          min-height: 100vh;
          background: var(--ink);
          color: var(--white);
          font-family: 'Instrument Sans', sans-serif;
          padding: 60px 8%;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .pitch-progress {
          display: flex;
          gap: 8px;
          margin-bottom: 40px;
        }

        .progress-bar {
          height: 4px;
          flex: 1;
          background: var(--white-10);
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .progress-bar.active {
          background: var(--teal-400);
          box-shadow: 0 0 10px rgba(29, 158, 117, 0.5);
        }

        .progress-bar.completed {
          background: rgba(29, 158, 117, 0.4);
        }

        .slide-eyebrow {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: var(--teal-400);
          margin-bottom: 16px;
          text-transform: uppercase;
        }

        .slide-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(32px, 5vw, 72px);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 32px;
          letter-spacing: -0.02em;
        }

        .slide-desc {
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.6;
          color: var(--white-60);
          max-width: 700px;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .image-wrap {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(248, 252, 249, 0.03);
          border: 1px solid rgba(29, 158, 117, 0.1);
        }

        .hero-image {
          max-width: 800px;
          margin: 0 auto;
        }

        .pitch-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .list-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 800px;
        }

        .list-item {
          display: flex;
          gap: 24px;
          padding: 24px;
          background: rgba(248, 252, 249, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(248, 252, 249, 0.05);
          transition: all 0.3s;
        }

        .list-item:hover {
          border-color: rgba(29, 158, 117, 0.3);
          transform: translateX(10px);
        }

        .list-num {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: var(--teal-400);
        }

        .list-item-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .list-item-desc {
          font-size: 16px;
          color: rgba(248, 252, 249, 0.5);
          line-height: 1.5;
        }

        .split-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .feature-dots {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dot-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          color: rgba(248, 252, 249, 0.8);
        }

        .dot {
          width: 12px;
          height: 12px;
          background: var(--teal-400);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(29, 158, 117, 0.5);
        }

        .grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
        }

        .grid-item {
          padding: 32px;
          background: rgba(248, 252, 249, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(248, 252, 249, 0.05);
          text-align: center;
          transition: all 0.3s;
        }

        .grid-item:hover {
          background: rgba(29, 158, 117, 0.05);
          border-color: rgba(29, 158, 117, 0.3);
          transform: translateY(-10px);
        }

        .grid-icon {
          font-size: 40px;
          margin-bottom: 20px;
        }

        .grid-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .grid-role {
          font-size: 14px;
          color: rgba(248, 252, 249, 0.4);
          line-height: 1.4;
        }

        .stats-layout {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .stat-card {
          padding: 32px;
          background: var(--ink-card);
          border: 1px solid rgba(29, 158, 117, 0.1);
          border-radius: 24px;
          text-align: center;
        }

        .stat-label {
          font-size: 14px;
          color: rgba(248, 252, 249, 0.4);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .stat-value {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 48px;
          font-weight: 800;
          color: var(--white);
          margin-bottom: 8px;
        }

        .stat-delta {
          font-size: 14px;
          color: var(--teal-400);
          font-weight: 600;
        }

        .cta-layout {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 0;
        }

        .cta-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
        }

        .cta-box {
          display: inline-block;
          padding: 20px 40px;
          background: rgba(29, 158, 117, 0.1);
          color: var(--teal-400);
          border: 1px solid rgba(29, 158, 117, 0.3);
          border-radius: 16px;
          font-size: 20px;
          font-weight: 600;
        }

        .btn-signup {
          display: inline-block;
          padding: 24px 60px;
          background: var(--teal-400);
          color: var(--white);
          border-radius: 16px;
          font-size: 24px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 20px 40px rgba(29, 158, 117, 0.3);
          transition: all 0.3s;
        }

        .btn-signup:hover {
          transform: translateY(-5px);
          background: var(--teal-600);
          box-shadow: 0 25px 50px rgba(29, 158, 117, 0.4);
        }

        .btn-back {
          display: block;
          font-size: 16px;
          color: rgba(248, 252, 249, 0.4);
          text-decoration: none;
          transition: color 0.3s;
        }

        .btn-back:hover {
          color: var(--white);
        }

        .pitch-controls {
          margin-top: auto;
          padding-top: 60px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-nav {
          padding: 12px 24px;
          background: rgba(248, 252, 249, 0.05);
          border: 1px solid rgba(248, 252, 249, 0.1);
          color: var(--white);
          border-radius: 12px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-nav:hover {
          background: rgba(248, 252, 249, 0.1);
          border-color: rgba(29, 158, 117, 0.5);
        }

        .slide-counter {
          font-size: 14px;
          color: rgba(248, 252, 249, 0.3);
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .split-layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .stats-layout {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </main>
  );
}
