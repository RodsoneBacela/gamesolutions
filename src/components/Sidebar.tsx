'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/client';
import {
  LayoutDashboard, Gamepad2, Trophy, Wrench, BookOpen,
  BarChart3, Settings, Monitor, Users, UserCircle,
  LogOut, Zap, DollarSign, Menu, X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/caixa',       label: 'Caixa',         icon: DollarSign },
  { href: '/sessions',    label: 'Sessões',       icon: Gamepad2 },
  { href: '/clients',     label: 'Clientes',      icon: UserCircle },
  { href: '/tournaments', label: 'Torneios',      icon: Trophy },
  { href: '/equipment',   label: 'Equipamentos',  icon: Wrench },
  { href: '/ledger',      label: 'Ledger',        icon: BookOpen },
  { href: '/reports',     label: 'Relatórios',    icon: BarChart3 },
];

const adminItems = [
  { href: '/settings', label: 'Tarifas',       icon: Settings },
  { href: '/stations', label: 'Estações',      icon: Monitor },
  { href: '/users',    label: 'Utilizadores',  icon: Users },
];

// Bottom nav shows the 5 most used pages
const bottomNavItems = [
  { href: '/dashboard',   label: 'Home',     icon: LayoutDashboard },
  { href: '/sessions',    label: 'Sessões',  icon: Gamepad2 },
  { href: '/caixa',       label: 'Caixa',    icon: DollarSign },
  { href: '/clients',     label: 'Clientes', icon: UserCircle },
  { href: '/tournaments', label: 'Torneios', icon: Trophy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth, isAdmin } = useAuthStore();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding:'1.25rem 1rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <div style={{ background:'var(--brand)', borderRadius:'8px', padding:'6px', display:'flex' }}>
            <Zap size={16} color="#000" fill="#000"/>
          </div>
          <div>
            <div className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>GAME</div>
            <div className="font-display" style={{ fontSize:'0.65rem', fontWeight:600, color:'var(--brand)', letterSpacing:'0.15em' }}>SOLUTIONS</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button className="btn btn-ghost btn-icon sidebar-close" onClick={() => setOpen(false)}>
          <X size={18}/>
        </button>
      </div>

      {/* Nav links */}
      <nav style={{ flex:1, padding:'0.75rem 0.5rem', overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px' }}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}>
            <Icon size={16}/>
            {label}
          </Link>
        ))}
        {isAdmin() && (
          <>
            <div style={{ margin:'0.75rem 0 0.5rem', padding:'0 0.25rem' }}>
              <span style={{ fontSize:'0.65rem', fontWeight:600, color:'var(--text-dim)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}>
                <Icon size={16}/>
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div style={{ padding:'0.75rem 0.5rem', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.5rem', marginBottom:'0.25rem' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--brand-dim)', border:'1px solid var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span className="font-display" style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--brand)' }}>
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-dim)', textTransform:'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-item" style={{ width:'100%' }} onClick={logout}>
          <LogOut size={14}/>
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── MOBILE TOPBAR ── */}
      <header className="topbar">
        <button className="btn btn-ghost btn-icon" onClick={() => setOpen(true)}>
          <Menu size={20}/>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <div style={{ background:'var(--brand)', borderRadius:'6px', padding:'4px', display:'flex' }}>
            <Zap size={14} color="#000" fill="#000"/>
          </div>
          <span className="font-display" style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>GAME SOLUTIONS</span>
        </div>
        <div style={{ width:36 }}/>{/* spacer */}
      </header>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)}/>

      {/* ── SIDEBAR (desktop fixed; mobile drawer) ── */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
