'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  style?: React.CSSProperties;
  className?: string;
}

// Fallback to Cloudflare's official test sitekey if custom sitekey is not configured
const DEFAULT_SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
  style,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Store callbacks in refs so changing inline function props won't trigger re-renders
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Don't re-render if widget already exists in container
      if (widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: DEFAULT_SITE_KEY,
          theme,
          callback: (token: string) => {
            if (isMounted && onVerifyRef.current) {
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (isMounted && onExpireRef.current) {
              onExpireRef.current();
            }
          },
          'error-callback': (code?: string) => {
            console.warn('Cloudflare Turnstile notice:', code);
            if (isMounted && onErrorRef.current) {
              onErrorRef.current(code);
            }
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.error('Failed to render Turnstile widget:', err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = 'cf-turnstile-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const existingCallback = window.onloadTurnstileCallback;
      window.onloadTurnstileCallback = () => {
        if (existingCallback) existingCallback();
        if (isMounted) renderWidget();
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', renderWidget);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={`turnstile-container ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0',
        minHeight: '65px',
        ...style,
      }}
    />
  );
}
