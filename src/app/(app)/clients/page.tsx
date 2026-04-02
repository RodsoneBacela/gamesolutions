'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Search, UserCircle, Trophy, Gamepad2, Calendar, Edit2, X, ChevronRight, Phone, Mail, Star } from 'lucide-react';

function RankBadge({ sessions }: { sessions: number }) {
  if (sessions >= 50) return <span className="badge badge-yellow"><Star size={10} /> VIP</span>;
  if (sessions >= 20) return <span className="badge badge-purple">Pro</span>;
  if (sessions >= 5)  return <span className="badge badge-blue">Regular</span>;
  return <span className="badge badge-gray">Novo</span>;
}

export default function ClientsPage() {
  const { toast } = useToast();
  const [search, setSearch]         = useState('');
  const [newOpen, setNewOpen]       = useState(false);
  const [selected, setSelected]     = useState<any>(null);
  const [editClient, setEditClient] = useState<any>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get('/clients', { params: { search, limit: 100 } }).then(r => r.data),
    staleTime: 10_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['client-detail', selected?.id],
    queryFn: () => api.get(`/clients/${selected.id}`).then(r => r.data),
    enabled: !!selected,
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '1.5rem', transition: 'grid-template-columns 0.2s' }}>
      {/* Left: Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Clientes</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{clients.length} clientes registados</p>
          </div>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Novo Cliente</button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Pesquisar por nome, telefone ou email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Contacto</th><th>Sessões</th>
                <th>Total Gasto</th><th>Última Visita</th><th>Rank</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>A carregar...</td></tr>}
              {!isLoading && clients.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {search ? 'Nenhum cliente encontrado' : 'Sem clientes ainda. Adiciona o primeiro!'}
                </td></tr>
              )}
              {clients.map((c: any) => (
                <tr key={c.id} style={{ cursor: 'pointer', background: selected?.id === c.id ? 'var(--brand-dim)' : '' }}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-dim)', border: '1px solid rgba(14,165,233,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="font-display" style={{ fontWeight: 700, color: 'var(--brand)', fontSize: '0.9rem' }}>{c.name[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</p>
                        {c.notes && <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{c.phone}</div>}
                      {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{c.email}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.total_sessions}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)' }}>{fmt.currency(c.total_spent)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.last_visit ? fmt.relativeTime(c.last_visit) : '—'}</td>
                  <td><RankBadge sessions={c.total_sessions} /></td>
                  <td>
                    <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); setEditClient(c); }}>
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Client Detail Panel */}
      {selected && (
        <ClientDetailPanel client={selected} detail={detail} onClose={() => setSelected(null)} onEdit={() => setEditClient(selected)} />
      )}

      <NewClientModal open={newOpen} onClose={() => setNewOpen(false)} />
      {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} />}
    </div>
  );
}

function ClientDetailPanel({ client, detail, onClose, onEdit }: any) {
  const gameStats = detail?.gameStats || {};
  const sessions  = detail?.sessions || [];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', height: 'fit-content', position: 'sticky', top: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-dim)', border: '2px solid rgba(14,165,233,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontWeight: 700, color: 'var(--brand)', fontSize: '1.3rem' }}>{client.name[0].toUpperCase()}</span>
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{client.name}</h3>
            <RankBadge sessions={client.total_sessions} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon" onClick={onEdit}><Edit2 size={13} /></button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={13} /></button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand)' }}>{client.total_sessions}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessões</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{fmt.currency(client.total_spent)}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Gasto</p>
        </div>
      </div>

      {/* Contact */}
      {(client.phone || client.email) && (
        <div style={{ marginBottom: '1rem' }}>
          {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}><Phone size={12} color="var(--brand)" />{client.phone}</div>}
          {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}><Mail size={12} color="var(--brand)" />{client.email}</div>}
        </div>
      )}

      {/* Game stats */}
      {Object.keys(gameStats).length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            <Gamepad2 size={10} style={{ display: 'inline', marginRight: 4 }} />Jogos Favoritos
          </p>
          {Object.entries(gameStats).sort((a: any, b: any) => b[1].count - a[1].count).map(([name, stat]: any) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--brand)' }}>{stat.count}×</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{fmt.currency(stat.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last sessions */}
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />Últimas Sessões
        </p>
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sessions.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem sessões ainda</p>}
          {sessions.slice(0, 10).map((s: any) => (
            <div key={s.id} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.5rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)' }}>{s.station_name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt.date(s.started_at)} · {fmt.duration(s.duration_min)}</p>
              </div>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>{fmt.currency(s.total_amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewClientModal({ open, onClose }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/clients', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast('Cliente criado!'); onClose();
      setForm({ name: '', phone: '', email: '', notes: '' });
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao criar cliente', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Novo Cliente"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.name || mut.isPending} onClick={() => mut.mutate(form)}>
          {mut.isPending ? 'A criar...' : 'Criar Cliente'}
        </button>
      </>}>
      <div className="form-group">
        <label className="label">Nome *</label>
        <input className="input" placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="label">Telefone</label>
          <input className="input" placeholder="84 000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Notas</label>
        <textarea className="input" placeholder="Observações sobre o cliente..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  );
}

function EditClientModal({ client, onClose }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: client.name, phone: client.phone || '', email: client.email || '', notes: client.notes || '' });

  const mut = useMutation({
    mutationFn: (d: any) => api.put(`/clients/${client.id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['client-detail', client.id] });
      toast('Cliente actualizado'); onClose();
    },
    onError: () => toast('Erro ao actualizar', 'error'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Editar Cliente"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate(form)}>Guardar</button>
      </>}>
      <div className="form-group">
        <label className="label">Nome *</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="label">Telefone</label>
          <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Notas</label>
        <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  );
}
