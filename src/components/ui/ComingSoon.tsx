import Link from 'next/link';

/**
 * Placeholder for the new Products services (Send/Receive/Invoices/Cards).
 * Nav-only phase: real services land later. Branded, self-contained page.
 */
export default function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        background: 'var(--ink)',
        color: 'var(--white)',
      }}
    >
      <Link href="/" className="nav-logo" style={{ marginBottom: 40 }}>
        One<span>Raise</span>
      </Link>

      <div
        className="hero-eyebrow"
        style={{ marginBottom: 24, animation: 'none', opacity: 1 }}
      >
        <span className="dot" /> {eyebrow}
      </div>

      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          lineHeight: 1.6,
          color: 'var(--white-60)',
          fontWeight: 300,
          maxWidth: 520,
          marginBottom: 36,
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="hconv-cta" style={{ width: 'auto', padding: '13px 28px' }}>
          Back to home
        </Link>
        <Link
          href="/explore"
          className="btn-ghost-nav"
          style={{ padding: '13px 28px', fontSize: 14 }}
        >
          Explore campaigns
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--white-30)' }}>
        Part of OneRaise Products — coming soon.
      </p>
    </main>
  );
}
