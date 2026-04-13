'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toast } from '@/components/ui/Toast';
import { initAuthListener, restoreSupabaseSession } from '@/stores/authStore';
import { runDailySync } from '@/lib/businessLogic';
import { setRouter } from '@/internal';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function applyTheme() {
  const mode = localStorage.getItem('theme_mode') ?? 'system';
  let isDark = false;
  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  }
}

function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    setRouter(router);
  }, [router]);

  useEffect(() => {
    applyTheme();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme_mode') applyTheme();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    restoreSupabaseSession();
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  useEffect(() => {
    runDailySync().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toast />
    </QueryClientProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>FitGenie CRM</title>
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
