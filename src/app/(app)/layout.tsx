'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import Providers from '@/components/Providers';
import { ToastProvider } from '@/components/Toast';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router    = useRouter();
  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);
  if (!token) return null;
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ToastProvider>
        <AuthGuard>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, minWidth: 0, padding: '1.5rem 2rem', overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </AuthGuard>
      </ToastProvider>
    </Providers>
  );
}
