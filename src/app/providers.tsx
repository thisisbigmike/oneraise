'use client';

import { SessionProvider } from 'next-auth/react';
import InactivityTimeoutHandler from '@/components/ui/InactivityTimeoutHandler';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivityTimeoutHandler />
      {children}
    </SessionProvider>
  );
}
