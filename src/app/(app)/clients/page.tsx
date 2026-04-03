'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Search, Edit2, Phone, Mail, Star, Gamepad2, Calendar } from 'lucide-react';

function RankBadge({ sessions }: { sessions: number }) {
  if (sessions >= 50) return <span className="badge badge-yellow"><Star size={10} /> VIP</span>;
  if (sessions >= 20) return <span className="badge badge-purple">Pro</span>;
  if (sessions >= 5)  return <span className="badge badge-blue">Regular</span>;
  return <span className="badge badge-gray">Novo</span>;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--brand-dim)', border: '1px solid rgba(14,165,233,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span className="font-display" style={{ fontWeight: 700, color: 'var(--brand)', fontSize: size * 0.4 }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  );
}

export default function ClientsPage() {
  const { toast }                   = useToast();
  const [search, setSearch]         = useState('');
  const [newOpen, setNewOpen]       = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editClient, setEditClient] = useState<any>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get('/clients', { params: { search, limit: 100 } }).then(r => r.data),
    staleTime: 10_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['client-detail', selectedId],
    queryFn: () => api.get(`/clients/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  });

  const selectedClient = clients.find((c: any) => c.id === selectedId);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700 }}>Clientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{clients.length} clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: 34 }}
          placeholder="Pesquisar nome, telefone ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clients.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>
            {search ? 'Nenhum cliente encontrado.' : 'Sem clientes ainda. Adiciona o primeiro!'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <Plus size={14} /> Adicionar Cliente
            </button>
          )}
        </div>
      )}

      {/* Client list — cards, funciona em qualquer ecrã */}
      {!isLoading && clients.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clients.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
              style={{
                background: selectedId === c.id ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)',
                border: `1px solid ${selectedId === c.id ? 'rgba(14,165,233,0.4)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Avatar name={c.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.phone || c.email || 'Sem contacto'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1 }}>{c.total_sessions}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>sessões</p>
                </div>
                <RankBadge sessions={c.total_sessions} />
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={e => { e.stopPropagation(); setEditClient(c); }}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          detail={detail}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setEditClient(selectedClient); setSelectedId(null); }}
        />
      )}

      <NewClientModal open={newOpen} onClose={() => setNewOpen(false)} />
      {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} />}
    </>
  );
}

function ClientDetailModal({ client, detail, onClose, onEdit }: any) {
  const gameStats = detail?.gameStats || {};
  const sessions  = detail?.sessions  || [];

  return (
    <Modal open title={client.name} onClose={onClose} size="md"
      footer={
        <button className="btn btn-secondary" onClick={onEdit}>
          <Edit2 size={13} /> Editar Cliente
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.875rem', textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--brand)' }}>{client.total_sessions}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sessões</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.875rem', textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{fmt.currency(client.total_spent)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Gasto</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <RankBadge sessions={client.total_sessions} />
        {client.last_visit && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Última visita: {fmt.relativeTime(client.last_visit)}
          </span>
        )}
      </div>

      {(client.phone || client.email) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8 }}>
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
              <Phone size={14} color="var(--brand)" /> {client.phone}
            </div>
          )}
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
              <Mail size={14} color="var(--brand)" /> {client.email}
            </div>
          )}
        </div>
      )}

      {client.notes && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: '1.25rem' }}>
          {client.notes}
        </p>
      )}

      {Object.keys(gameStats).length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Gamepad2 size={10} /> Jogos Favoritos
          </p>
          {Object.entries(gameStats).sort((a: any, b: any) => b[1].count - a[1].count).map(([name, stat]: any) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--brand)' }}>{stat.count}×</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{fmt.currency(stat.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={10} /> Últimas Sessões
        </p>
        {sessions.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sem sessões ainda</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
          {sessions.slice(0, 8).map((s: any) => (
            <div key={s.id} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.station_name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt.date(s.started_at)} · {fmt.duration(s.duration_min)}</p>
              </div>
              <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                {fmt.currency(s.total_amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function NewClientModal({ open, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/clients', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast('Cliente criado!'); onClose(); setForm({ name: '', phone: '', email: '', notes: '' }); },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title="Novo Cliente"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.name || mut.isPending} onClick={() => mut.mutate(form)}>
          {mut.isPending ? 'A criar…' : 'Criar Cliente'}
        </button>
      </>}>
      <div className="form-group"><label className="label">Nome *</label>
        <input className="input" placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      </div>
      <div className="form-group"><label className="label">Telefone</label>
        <input className="input" placeholder="84 000 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="form-group"><label className="label">Email</label>
        <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="form-group"><label className="label">Notas</label>
        <textarea className="input" placeholder="Observações…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  );
}

function EditClientModal({ client, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ name: client.name, phone: client.phone || '', email: client.email || '', notes: client.notes || '' });
  const mut = useMutation({
    mutationFn: (d: any) => api.put(`/clients/${client.id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['client-detail', client.id] }); toast('Actualizado'); onClose(); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open title="Editar Cliente" onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate(form)}>
          {mut.isPending ? 'A guardar…' : 'Guardar'}
        </button>
      </>}>
      <div className="form-group"><label className="label">Nome *</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="form-group"><label className="label">Telefone</label>
        <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="form-group"><label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="form-group"><label className="label">Notas</label>
        <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  );
}
