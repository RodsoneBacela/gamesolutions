'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/client';
import {
  LayoutDashboard, Gamepad2, Trophy, Wrench, BookOpen,
  BarChart3, Settings, Monitor, Users, UserCircle, LogOut, Zap, DollarSign
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/caixa',       label: 'Caixa',        icon: DollarSign },
  { href: '/sessions',    label: 'Sessões',      icon: Gamepad2 },
  { href: '/clients',     label: 'Clientes',     icon: UserCircle },
  { href: '/tournaments', label: 'Torneios',     icon: Trophy },
  { href: '/equipment',   label: 'Equipamentos', icon: Wrench },
  { href: '/ledger',      label: 'Ledger',       icon: BookOpen },
  { href: '/reports',     label: 'Relatórios',   icon: BarChart3 },
];

const adminItems = [
  { href: '/settings', label: 'Tarifas',   icon: Settings },
  { href: '/stations', label: 'Estações',  icon: Monitor },
  { href: '/users',    label: 'Utilizadores', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth, isAdmin } = useAuthStore();

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <aside style={{
      width: '220px', minWidth: '220px', height: '100vh', position: 'sticky', top: 0,
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--brand)', borderRadius: '8px', padding: '6px', display: 'flex' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>GAME</div>
            <div className="font-display" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.15em' }}>SOLUTIONS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}>
            <Icon size={16} className="nav-icon" />
            {label}
          </Link>
        ))}

        {isAdmin() && (
          <>
            <div style={{ margin: '0.75rem 0 0.5rem', padding: '0 0.25rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}>
                <Icon size={16} className="nav-icon" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-dim)', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand)' }}>
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-item" style={{ width: '100%' }} onClick={logout}>
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  );
}
