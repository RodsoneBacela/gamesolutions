'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Shield, UserX } from 'lucide-react';

export default function UsersPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/auth/users').then(r => r.data) });

  const patchMut = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/auth/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('Actualizado'); },
    onError: () => toast('Erro', 'error'),
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Utilizadores</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestão de acessos</p></div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Novo Utilizador</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Utilizador</th><th className="hide-mobile">Email</th><th>Role</th><th className="hide-mobile">Último Login</th><th>Status</th><th>Acções</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>A carregar...</td></tr>}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'var(--brand-dim)', border: `1px solid ${u.role === 'admin' ? 'rgba(168,85,247,0.4)' : 'rgba(14,165,233,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="font-display" style={{ fontWeight: 700, color: u.role === 'admin' ? 'var(--purple)' : 'var(--brand)', fontSize: '0.85rem' }}>{u.username[0].toUpperCase()}</span>
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.username}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email || '—'}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{u.role}</span></td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.last_login ? fmt.relativeTime(u.last_login) : 'Nunca'}</td>
                <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" title={u.role === 'admin' ? 'Tornar User' : 'Tornar Admin'}
                      onClick={() => patchMut.mutate({ id: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}>
                      <Shield size={11} /> {u.role === 'admin' ? '→ User' : '→ Admin'}
                    </button>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => patchMut.mutate({ id: u.id, is_active: !u.is_active })}>
                      <UserX size={11} /> {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewUserModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function NewUserModal({ open, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'user' });
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/auth/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('Utilizador criado'); onClose(); setForm({ username: '', password: '', email: '', role: 'user' }); },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title="Novo Utilizador" size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!form.username || !form.password || mut.isPending} onClick={() => mut.mutate(form)}>{mut.isPending ? '...' : 'Criar'}</button></>}>
      <div className="form-group"><label className="label">Username *</label><input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
      <div className="form-group"><label className="label">Password * (mín. 8 chars)</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
      <div className="form-group"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      <div className="form-group"><label className="label">Role</label>
        <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          <option value="user">Operador</option><option value="admin">Admin</option>
        </select>
      </div>
    </Modal>
  );
}
