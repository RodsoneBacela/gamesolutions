'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function LedgerPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['financial', typeFilter, start, end],
    queryFn: () => api.get('/financial', { params: { type: typeFilter, start_date: start, end_date: end } }).then(r => r.data),
  });

  const income  = entries.filter((e: any) => e.type === 'Income').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const expense = entries.filter((e: any) => e.type === 'Expense').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const net     = income - expense;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Movimentos financeiros</p></div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Novo Movimento</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Receitas', value: fmt.currency(income), color: 'var(--green)', icon: TrendingUp },
          { label: 'Total Despesas', value: fmt.currency(expense), color: 'var(--red)', icon: TrendingDown },
          { label: 'Saldo Líquido', value: fmt.currency(net), color: net >= 0 ? 'var(--brand)' : 'var(--red)', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                <p className="font-display font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1.2, marginTop: 4 }}>{value}</p>
              </div>
              <div style={{ color, background: color + '20', padding: 8, borderRadius: 8 }}><Icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 160 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Todos</option><option value="Income">Receitas</option><option value="Expense">Despesas</option>
        </select>
        <input type="date" className="input" style={{ width: 160 }} value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" className="input" style={{ width: 160 }} value={end} onChange={e => setEnd(e.target.value)} />
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>A carregar...</td></tr>}
            {!isLoading && entries.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sem movimentos</td></tr>}
            {entries.map((e: any) => (
              <tr key={e.id}>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt.date(e.date)}</td>
                <td style={{ fontWeight: 500, maxWidth: 250 }}>{e.description}</td>
                <td><span className="badge badge-gray">{e.category || '—'}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{e.method}</td>
                <td><span className={`badge ${e.type === 'Income' ? 'badge-green' : 'badge-red'}`}>{e.type === 'Income' ? 'Receita' : 'Despesa'}</span></td>
                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600, color: e.type === 'Income' ? 'var(--green)' : 'var(--red)' }}>
                  {e.type === 'Expense' ? '−' : '+'}{fmt.currency(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewEntryModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function NewEntryModal({ open, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ description: '', category: '', type: 'Expense', amount: '', method: 'Cash', date: new Date().toISOString().split('T')[0] });
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/financial', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial'] }); toast('Movimento registado'); onClose(); setForm({ description: '', category: '', type: 'Expense', amount: '', method: 'Cash', date: new Date().toISOString().split('T')[0] }); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title="Novo Movimento"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!form.description || !form.amount || mut.isPending} onClick={() => mut.mutate({ ...form, amount: Number(form.amount) })}>{mut.isPending ? '...' : 'Registar'}</button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label className="label">Tipo</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="Income">Receita</option><option value="Expense">Despesa</option>
          </select>
        </div>
        <div className="form-group"><label className="label">Data</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
      </div>
      <div className="form-group"><label className="label">Descrição *</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label className="label">Categoria</label><input className="input" placeholder="ex: Aluguer, Luz" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
        <div className="form-group"><label className="label">Valor (MZN) *</label><input className="input font-mono" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
        <div className="form-group"><label className="label">Método</label>
          <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            <option value="Cash">Dinheiro</option><option value="M-Pesa">M-Pesa</option><option value="E-Mola">E-Mola</option><option value="Transfer">Transferência</option><option value="Other">Outro</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
