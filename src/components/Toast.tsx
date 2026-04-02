'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtx { toast: (message: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const icons = { success: <CheckCircle size={16} color="var(--green)" />, error: <XCircle size={16} color="var(--red)" />, info: <AlertCircle size={16} color="var(--brand)" /> };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {icons[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="btn btn-ghost btn-icon" style={{ width: '1.5rem', height: '1.5rem' }}
              onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
