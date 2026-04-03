'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Search, X, Clock, CreditCard, Minus, Gamepad2 } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Active: 'badge-green', Closed: 'badge-gray', Paused: 'badge-yellow', Cancelled: 'badge-red' };
  const label: Record<string, string> = { Active: 'Activa', Closed: 'Fechada', Paused: 'Pausada', Cancelled: 'Cancelada' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>;
}
function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Paid: 'badge-green', Pending: 'badge-yellow', Partial: 'badge-orange' };
  const label: Record<string, string> = { Paid: 'Pago', Pending: 'Pendente', Partial: 'Parcial' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>;
}

export default function SessionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [paySession, setPaySession] = useState<any>(null);
  const [extendSession, setExtendSession] = useState<any>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', statusFilter],
    queryFn: () => api.get('/sessions', { params: { status: statusFilter } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: stations = [] } = useQuery({ queryKey: ['stations-status'], queryFn: () => api.get('/stations/status').then(r => r.data) });
  const { data: rates = [] }    = useQuery({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const { data: clients = [] }  = useQuery({ queryKey: ['clients-list', clientSearchTerm], queryFn: () => api.get('/clients', { params: { search: clientSearchTerm, limit: 20 } }).then(r => r.data), enabled: clientSearchTerm.length >= 1 });
  const { data: games = [] }    = useQuery({ queryKey: ['games'], queryFn: () => api.get('/games').then(r => r.data) });

  const subtractMut = useMutation({
    mutationFn: (id: number) => api.patch(`/sessions/${id}/subtract-game`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      const remaining = res.data.games_remaining;
      if (remaining === 0) toast('Último jogo concluído!', 'info');
      else toast(`${remaining} jogo(s) restante(s)`);
    },
    onError: () => toast('Erro', 'error'),
  });

  const closeMut = useMutation({
    mutationFn: (id: number) => api.patch(`/sessions/${id}/close`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast('Sessão fechada'); },
    onError: () => toast('Erro ao fechar sessão', 'error'),
  });

  const filtered = sessions.filter((s: any) =>
    !search || s.client_name.toLowerCase().includes(search.toLowerCase()) || s.station_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sessões</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{filtered.length} sessões encontradas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Nova Sessão</button>
      </div>

      {/* Filters */}
      <div className="filter-row" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Pesquisar cliente ou estação..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="Active">Activas</option>
          <option value="Closed">Fechadas</option>
          <option value="Cancelled">Canceladas</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Cliente</th><th>Estação</th><th>Modo</th>
              <th className="hide-mobile">Início</th><th className="hide-mobile">Duração</th><th className="hide-mobile">Jogo</th><th className="hide-mobile">Jogos</th><th>Valor</th>
              <th>Status</th><th>Pagamento</th><th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>A carregar...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Sem sessões</td></tr>}
            {filtered.map((s: any) => (
              <tr key={s.id}>
                <td className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>#{s.id}</td>
                <td style={{ fontWeight: 500 }}>{s.client_name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{s.station_name} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{s.console}</span></td>
                <td><span className={`badge ${s.mode === 'Solo' ? 'badge-blue' : 'badge-purple'}`}>{s.mode}</span></td>
                <td className="hide-mobile" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt.datetime(s.started_at)}</td>
                <td className="hide-mobile" style={{ fontSize: '0.8rem' }}>{fmt.duration(s.duration_min)}</td>
                <td>
                  {s.game_name
                    ? <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{s.game_name}</span>
                    : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td>
                  {s.games_total > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: s.games_remaining === 0 ? 'var(--red)' : s.games_remaining <= 1 ? 'var(--yellow)' : 'var(--green)' }}>
                        {s.games_remaining}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>/{s.games_total}</span>
                      {s.status === 'Active' && s.games_remaining > 0 && (
                        <button className="btn btn-secondary btn-icon" style={{ width: '1.6rem', height: '1.6rem' }} title="Subtrair 1 jogo"
                          onClick={() => subtractMut.mutate(s.id)}>
                          <Minus size={11} />
                        </button>
                      )}
                      {s.games_remaining === 0 && s.status === 'Active' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--red)' }}>Fim</span>
                      )}
                    </div>
                  ) : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmt.currency(s.total_amount)}</td>
                <td><StatusBadge status={s.status} /></td>
                <td><PayBadge status={s.payment_status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.status === 'Active' && <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setPaySession(s)}><CreditCard size={12} /> Pagar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setExtendSession(s)}><Clock size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Fechar sessão?')) closeMut.mutate(s.id); }}><X size={12} /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewSessionModal open={newOpen} onClose={() => setNewOpen(false)} stations={stations} rates={rates} clients={clients} games={games} onClientSearch={setClientSearchTerm} />
      {paySession && <PayModal session={paySession} onClose={() => setPaySession(null)} />}
      {extendSession && <ExtendModal session={extendSession} rates={rates} onClose={() => setExtendSession(null)} />}
    </div>
  );
}

function NewSessionModal({ open, onClose, stations, rates, clients, games, onClientSearch }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    station_id: '', client_id: '', client_name: '', mode: 'Solo', rate_id: '', game_id: '', games_total: 0,
  });
  const [clientSearch, setClientSearch] = useState('');

  const filteredClients = clients.filter((c: any) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone && c.phone.includes(clientSearch))
  );

  const selectedRate = rates.find((r: any) => r.id === Number(form.rate_id));
  const selectedGame = games.find((g: any) => g.id === Number(form.game_id));

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/sessions', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stations-status'] });
      toast('Sessão criada'); onClose();
      setForm({ station_id: '', client_id: '', client_name: '', mode: 'Solo', rate_id: '', game_id: '', games_total: 0 });
      setClientSearch('');
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao criar sessão', 'error'),
  });

  const filteredRates = rates.filter((r: any) => r.mode === form.mode);
  const canSubmit = form.station_id && form.client_name && form.rate_id;

  return (
    <Modal open={open} onClose={onClose} title="Nova Sessão" size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!canSubmit || mut.isPending}
          onClick={() => mut.mutate({
            station_id:  Number(form.station_id),
            client_id:   form.client_id ? Number(form.client_id) : null,
            client_name: form.client_name,
            mode:        form.mode,
            rate_id:     Number(form.rate_id),
            game_id:     form.game_id ? Number(form.game_id) : null,
            games_total: Number(form.games_total) || 0,
          })}>
          {mut.isPending ? 'A criar...' : 'Criar Sessão'}
        </button>
      </>}>

      {/* Rate preview */}
      {selectedRate && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>{selectedRate.name} · {fmt.duration(selectedRate.duration_min)}</span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 6 }}>TOTAL</span>
            <span className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand)' }}>{fmt.currency(selectedRate.amount)}</span>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="label">Estação</label>
        <select className="input" value={form.station_id} onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}>
          <option value="">Seleccionar estação</option>
          {stations.map((s: any) => (
            <option key={s.id} value={s.id} disabled={s.status === 'Occupied'}>
              {s.status === 'Occupied' ? '🔴' : '✅'} {s.name} {s.console ? `(${s.console})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="label">Cliente (pesquisar existente)</label>
        <input className="input" placeholder="Pesquisar por nome ou telefone..." value={clientSearch}
          onChange={e => { setClientSearch(e.target.value); setForm(f => ({ ...f, client_id: '', client_name: e.target.value })); onClientSearch(e.target.value); }} />
        {clientSearch && filteredClients.length > 0 && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 140, overflowY: 'auto' }}>
            {filteredClients.slice(0, 6).map((c: any) => (
              <div key={c.id} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: c.name })); setClientSearch(c.name); }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.total_sessions} sessões</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {!form.client_id && (
        <div className="form-group">
          <label className="label">Nome (novo cliente)</label>
          <input className="input" placeholder="Nome do cliente" value={form.client_name}
            onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="label">Modo</label>
          <select className="input" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value, rate_id: '' }))}>
            <option value="Solo">Solo</option>
            <option value="Accompanied">Acompanhado</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Tarifa *</label>
          <select className="input" value={form.rate_id} onChange={e => setForm(f => ({ ...f, rate_id: e.target.value }))}>
            <option value="">Seleccionar</option>
            {filteredRates.map((r: any) => (
              <option key={r.id} value={r.id}>{r.name} — {fmt.currency(r.amount)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Game selection */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">🎮 Jogo (opcional — registo)</label>
            <select className="input" value={form.game_id} onChange={e => setForm(f => ({ ...f, game_id: e.target.value }))}>
              <option value="">Sem jogo específico</option>
              {games.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.genre ? ` · ${g.genre}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Nº de Jogos</label>
            <input className="input font-mono" type="number" min="0" max="99"
              placeholder="0" value={form.games_total || ''}
              disabled={!form.game_id}
              onChange={e => setForm(f => ({ ...f, games_total: Number(e.target.value) }))} />
          </div>
        </div>
        {selectedGame && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {selectedGame.genre && selectedGame.genre}{selectedGame.platform && ` · ${selectedGame.platform}`}
            {' · '}<span style={{ color: 'var(--green)' }}>Incluído na tarifa</span>
            {Number(form.games_total) > 0 && <span style={{ color: 'var(--brand)', marginLeft: 8 }}>· {form.games_total} jogo(s) a controlar</span>}
          </p>
        )}
      </div>
    </Modal>
  );
}

function PayModal({ session, onClose }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const totalAmount = Number(session.total_amount);
  const [form, setForm] = useState({ paid_amount: totalAmount, method: 'Cash' });

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/payments', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Pagamento registado'); onClose();
    },
    onError: () => toast('Erro ao registar pagamento', 'error'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Registar Pagamento" size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={mut.isPending}
          onClick={() => mut.mutate({ session_id: session.id, client_name: session.client_name, total_amount: totalAmount, paid_amount: Number(form.paid_amount), method: form.method })}>
          {mut.isPending ? '...' : 'Confirmar'}
        </button>
      </>}>
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cliente: <strong style={{ color: 'var(--text-primary)' }}>{session.client_name}</strong></p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total: <strong className="font-mono" style={{ color: 'var(--brand)' }}>{fmt.currency(session.total_amount)}</strong></p>
      </div>
      <div className="form-group">
        <label className="label">Valor Pago</label>
        <input className="input font-mono" type="number" step="0.01" value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: Number(e.target.value) }))} />
      </div>
      <div className="form-group">
        <label className="label">Método</label>
        <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
          <option value="Cash">Dinheiro</option>
          <option value="M-Pesa">M-Pesa</option>
          <option value="E-Mola">E-Mola</option>
          <option value="Transfer">Transferência</option>
          <option value="Other">Outro</option>
        </select>
      </div>
    </Modal>
  );
}

function ExtendModal({ session, rates, onClose }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rateId, setRateId] = useState('');
  const selectedRate = rates.find((r: any) => r.id === Number(rateId));

  const mut = useMutation({
    mutationFn: (d: any) => api.patch(`/sessions/${session.id}/extend`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast('Sessão extendida'); onClose(); },
    onError: () => toast('Erro ao extender', 'error'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Extender Sessão" size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!rateId || mut.isPending}
          onClick={() => mut.mutate({ extra_minutes: selectedRate?.duration_min, rate_id: Number(rateId) })}>
          Extender
        </button>
      </>}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Cliente: <strong style={{ color: 'var(--text-primary)' }}>{session.client_name}</strong></p>
      <div className="form-group">
        <label className="label">Tarifa de extensão</label>
        <select className="input" value={rateId} onChange={e => setRateId(e.target.value)}>
          <option value="">Seleccionar</option>
          {rates.filter((r: any) => r.mode === session.mode).map((r: any) => (
            <option key={r.id} value={r.id}>{r.name} — {fmt.currency(r.amount)}</option>
          ))}
        </select>
      </div>
      {selectedRate && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          + {selectedRate.duration_min} min · + {fmt.currency(selectedRate.amount)}
        </div>
      )}
    </Modal>
  );
}
