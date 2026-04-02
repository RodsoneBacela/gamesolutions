'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/client';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { setAuth }           = useAuthStore();
  const router                = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 1rem', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--brand)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Zap size={24} color="#000" fill="#000" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>GAME</div>
              <div className="font-display" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.2em' }}>SOLUTIONS</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Sistema de Gestão de Gaming</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="label">Utilizador</label>
              <input className="input" placeholder="username" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="label">Password</label>
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} style={{ paddingRight: '2.5rem' }}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: '0.75rem', top: '2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
