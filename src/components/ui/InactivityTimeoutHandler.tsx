'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes
const CHECK_INTERVAL_MS = 10 * 1000; // 10 seconds
const LAST_ACTIVE_KEY = 'oneraise_last_active';

export default function InactivityTimeoutHandler() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Set initial activity timestamp
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

    // Throttled update to avoid excessive localStorage writes
    let lastWrite = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 2000) { // Throttle: write at most once every 2 seconds
        localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
        lastWrite = now;
      }
    };

    // Track user interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Periodically check if the user has been inactive for too long
    const intervalId = setInterval(() => {
      const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
      if (!lastActiveStr) return;

      const lastActive = Number(lastActiveStr);
      const now = Date.now();

      if (now - lastActive >= INACTIVITY_LIMIT_MS) {
        clearInterval(intervalId);
        signOut({ callbackUrl: '/auth?mode=signin' });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [status]);

  return null;
}
