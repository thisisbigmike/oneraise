import React from 'react';
import Link from 'next/link';
import './animated-button.css';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  href?: string;
  className?: string;
}

export default function AnimatedButton({ text, href, className = '', ...props }: AnimatedButtonProps) {
  const content = (
    <>
      <span className="animata-btn-text">{text}</span>
      <div className="animata-icon-wrapper">
        <div className="animata-icon-inner">
          <svg className="animata-icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          <svg className="animata-icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`animata-btn ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button className={`animata-btn ${className}`} {...props}>
      {content}
    </button>
  );
}
