'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import Providers from '@/components/Providers';
import { ToastProvider } from '@/components/Toast';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, _hydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hydrated && !token) {
      router.replace('/login');
    }
  }, [_hydrated, token, router]);

  // Aguarda o localStorage ser lido — evita redirect errado
  if (!_hydrated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--brand)',
            animation: 'spin 0.8s linear infinite',
          }}/>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>A carregar...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ToastProvider>
        <AuthGuard>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">
              <div className="page-container">
                {children}
              </div>
            </main>
          </div>
        </AuthGuard>
      </ToastProvider>
    </Providers>
  );
}
