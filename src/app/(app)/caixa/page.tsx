'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  DollarSign, Target, TrendingUp, CheckCircle, XCircle,
  Lock, Unlock, Clock, Gamepad2, AlertTriangle, History
} from 'lucide-react';

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 999, height: 10, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', borderRadius: 999, background: color,
        width: `${pct}%`, transition: 'width 0.5s ease',
        boxShadow: `0 0 8px ${color}60`,
      }} />
    </div>
  );
}

export default function CaixaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openModal, setOpenModal] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [tab, setTab] = useState<'caixa' | 'historico'>('caixa');

  const { data: caixa, isLoading } = useQuery({
    queryKey: ['cash-register-active'],
    queryFn: () => api.get('/cash-register?mode=active').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: () => api.get('/cash-register').then(r => r.data),
    enabled: tab === 'historico',
  });

  const closeMut = useMutation({
    mutationFn: () => api.patch(`/cash-register/${caixa.id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-register-active'] });
      qc.invalidateQueries({ queryKey: ['cash-register-history'] });
      toast('Caixa fechada com sucesso');
      setCloseConfirm(false);
    },
    onError: () => toast('Erro ao fechar caixa', 'error'),
  });

  const collected    = Number(caixa?.collected_amount ?? 0);
  const target       = Number(caixa?.target_amount ?? 0);
  const pct          = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
  const achieved     = collected >= target && target > 0;
  const remaining    = Math.max(0, target - collected);
  const progressColor = pct >= 100 ? 'var(--green)' : pct >= 70 ? 'var(--yellow)' : 'var(--brand)';

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Caixa</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Controlo de metas e facturação diária</p>
        </div>
        {!caixa && !isLoading && (
          <button className="btn btn-primary" onClick={() => setOpenModal(true)}>
            <Unlock size={16} /> Abrir Caixa
          </button>
        )}
        {caixa && (
          <button className="btn btn-danger" onClick={() => setCloseConfirm(true)}>
            <Lock size={16} /> Fechar Caixa
          </button>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        <button className={`tab ${tab === 'caixa' ? 'active' : ''}`} onClick={() => setTab('caixa')}>
          <DollarSign size={13} style={{ display: 'inline', marginRight: 5 }} />Caixa Actual
        </button>
        <button className={`tab ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>
          <History size={13} style={{ display: 'inline', marginRight: 5 }} />Histórico
        </button>
      </div>

      {/* CAIXA ACTUAL */}
      {tab === 'caixa' && (
        <>
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
            </div>
          )}

          {!isLoading && !caixa && (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <Lock size={56} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-dim)' }} />
              <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Caixa Fechada</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Abre a caixa para começar o dia e definir a meta de facturação.</p>
              <button className="btn btn-primary btn-lg" onClick={() => setOpenModal(true)}>
                <Unlock size={18} /> Abrir Caixa
              </button>
            </div>
          )}

          {caixa && (
            <>
              {/* Status bar */}
              <div style={{
                background: achieved ? 'rgba(34,197,94,0.08)' : 'var(--bg-card)',
                border: `1px solid ${achieved ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caixa Aberta</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Aberta por <strong style={{ color: 'var(--text-primary)' }}>{caixa.opened_by_name}</strong> às {fmt.time(caixa.opened_at)}
                    </p>
                  </div>
                  {achieved
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 700 }}>
                        <CheckCircle size={22} /> META ATINGIDA!
                      </div>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <AlertTriangle size={16} /> Faltam {fmt.currency(remaining)}
                      </div>
                  }
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progresso</span>
                  <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: progressColor }}>{pct.toFixed(1)}%</span>
                </div>
                <ProgressBar value={collected} max={target} color={progressColor} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{fmt.currency(collected)} obtidos</span>
                  <span>Meta: {fmt.currency(target)}</span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Obtido', value: fmt.currency(collected), color: 'var(--green)', icon: TrendingUp },
                  { label: 'Meta do Dia', value: fmt.currency(target), color: 'var(--brand)', icon: Target },
                  { label: 'Sessões Hoje', value: String(caixa.sessions_count ?? 0), color: 'var(--purple)', icon: Gamepad2 },
                  { label: 'Hora de Abertura', value: fmt.time(caixa.opened_at), color: 'var(--yellow)', icon: Clock },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                        <p className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color, lineHeight: 1.2, marginTop: 4 }}>{value}</p>
                      </div>
                      <div style={{ color, background: color + '20', padding: 8, borderRadius: 8 }}><Icon size={16} /></div>
                    </div>
                  </div>
                ))}
              </div>

              {caixa.notes && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  📝 {caixa.notes}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* HISTÓRICO */}
      {tab === 'historico' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Aberta por</th><th>Abertura</th><th>Fecho</th>
                <th>Meta</th><th>Obtido</th><th>%</th><th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sem histórico</td></tr>
              )}
              {history.map((h: any) => {
                const col  = Number(h.collected_amount);
                const tgt  = Number(h.target_amount);
                const p    = tgt > 0 ? Math.min(100, (col / tgt) * 100) : 0;
                const ok   = col >= tgt && tgt > 0;
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500 }}>{fmt.date(h.opened_at)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{h.opened_by_name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt.time(h.opened_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.closed_at ? fmt.time(h.closed_at) : <span className="badge badge-green">Aberta</span>}</td>
                    <td className="font-mono" style={{ fontSize: '0.85rem' }}>{fmt.currency(tgt)}</td>
                    <td className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: ok ? 'var(--green)' : 'var(--text-primary)' }}>{fmt.currency(col)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 999, height: 6, minWidth: 60, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, background: ok ? 'var(--green)' : 'var(--brand)', width: `${p}%` }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 36 }}>{p.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      {h.status === 'Open'
                        ? <span className="badge badge-blue">Em curso</span>
                        : ok
                          ? <span className="badge badge-green"><CheckCircle size={10} /> Atingida</span>
                          : <span className="badge badge-red"><XCircle size={10} /> Não atingida</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OpenCaixaModal open={openModal} onClose={() => setOpenModal(false)} />

      {/* Fechar caixa confirm */}
      {closeConfirm && caixa && (
        <CloseCaixaModal
          caixa={caixa}
          collected={collected}
          target={target}
          pct={pct}
          achieved={achieved}
          onClose={() => setCloseConfirm(false)}
          onConfirm={() => closeMut.mutate()}
          loading={closeMut.isPending}
        />
      )}
    </div>
  );
}

function OpenCaixaModal({ open, onClose }: any) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ target_amount: '', notes: '' });

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/cash-register', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-register-active'] });
      toast('Caixa aberta!');
      onClose();
      setForm({ target_amount: '', notes: '' });
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro ao abrir caixa', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Abrir Caixa" size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.target_amount || mut.isPending}
          onClick={() => mut.mutate({ target_amount: Number(form.target_amount), notes: form.notes })}>
          {mut.isPending ? 'A abrir...' : <><Unlock size={14} /> Abrir Caixa</>}
        </button>
      </>}>
      <div style={{ background: 'var(--brand-dim)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, padding: '0.75rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--brand)' }}>
          A caixa vai registar todas as sessões e pagamentos a partir deste momento até ser fechada.
        </p>
      </div>
      <div className="form-group">
        <label className="label">Meta do Dia (MZN) *</label>
        <input className="input font-mono" type="number" min="0" step="100"
          placeholder="ex: 5000.00" value={form.target_amount}
          onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
          autoFocus />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Valor que pretendes facturar hoje
        </p>
      </div>
      <div className="form-group">
        <label className="label">Notas (opcional)</label>
        <textarea className="input" placeholder="Observações do dia..." value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          style={{ minHeight: 60 }} />
      </div>
    </Modal>
  );
}

function CloseCaixaModal({ caixa, collected, target, pct, achieved, onClose, onConfirm, loading }: any) {
  const progressColor = pct >= 100 ? 'var(--green)' : pct >= 70 ? 'var(--yellow)' : 'var(--red)';
  return (
    <Modal open={true} onClose={onClose} title="Fechar Caixa" size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" disabled={loading} onClick={onConfirm}>
          {loading ? 'A fechar...' : <><Lock size={14} /> Confirmar Fecho</>}
        </button>
      </>}>

      {/* Result summary */}
      <div style={{
        background: achieved ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${achieved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>{achieved ? '🎉' : '📊'}</div>
        <p className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, color: progressColor }}>{pct.toFixed(1)}%</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {achieved ? 'Meta atingida!' : `Faltaram ${fmt.currency(Math.max(0, target - collected))}`}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'Meta do dia', value: fmt.currency(target) },
          { label: 'Total obtido', value: fmt.currency(collected), color: progressColor },
          { label: 'Sessões registadas', value: String(caixa.sessions_count ?? 0) },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
            <span className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Ao fechar a caixa não poderás editar os valores registados.
      </p>
    </Modal>
  );
}
