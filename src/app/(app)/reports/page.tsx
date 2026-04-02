'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0ea5e9','#22c55e','#a855f7','#f59e0b','#ef4444'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'monthly' | 'daily'>('monthly');
  const [start, setStart] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(new Date().toISOString().split('T')[0]);
  const [day, setDay]     = useState(new Date().toISOString().split('T')[0]);

  const { data: monthly } = useQuery({ queryKey: ['reports-monthly', start, end], queryFn: () => api.get('/reports/monthly', { params: { start, end } }).then(r => r.data), enabled: tab === 'monthly' });
  const { data: daily }   = useQuery({ queryKey: ['reports-daily', day], queryFn: () => api.get('/reports/daily', { params: { date: day } }).then(r => r.data), enabled: tab === 'daily' });

  const chartData = (monthly?.monthly || []).map((m: any) => ({
    name: m.month?.slice(0, 7) || '',
    Receita: Number(m.income), Despesa: Number(m.expense), Líquido: Number(m.net),
  }));

  const pieData = (monthly?.methods || []).map((m: any) => ({ name: m.method, value: Number(m.total) }));

  const tooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Relatórios</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Análise financeira</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        <button className={`tab ${tab === 'monthly' ? 'active' : ''}`} onClick={() => setTab('monthly')}>Mensal</button>
        <button className={`tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>Diário</button>
      </div>

      {tab === 'monthly' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div><label className="label">De</label><input type="date" className="input" style={{ width: 160 }} value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><label className="label">Até</label><input type="date" className="input" style={{ width: 160 }} value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Receita vs Despesa por Mês</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="Receita" fill="var(--green)" radius={[4,4,0,0]} />
                  <Bar dataKey="Despesa" fill="var(--red)" radius={[4,4,0,0]} />
                  <Bar dataKey="Líquido" fill="var(--brand)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Métodos de Pagamento</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmt.currency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados</p>}
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead><tr><th>Mês</th><th>Receita</th><th>Despesa</th><th>Líquido</th><th>Transacções</th></tr></thead>
              <tbody>
                {(monthly?.monthly || []).map((m: any) => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 500 }}>{m.month}</td>
                    <td className="font-mono" style={{ color: 'var(--green)' }}>{fmt.currency(m.income)}</td>
                    <td className="font-mono" style={{ color: 'var(--red)' }}>{fmt.currency(m.expense)}</td>
                    <td className="font-mono" style={{ fontWeight: 600, color: Number(m.net) >= 0 ? 'var(--brand)' : 'var(--red)' }}>{fmt.currency(m.net)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Data</label>
            <input type="date" className="input" style={{ width: 180 }} value={day} onChange={e => setDay(e.target.value)} />
          </div>
          {daily && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Sessões', value: daily.kpi?.sessions_total ?? 0 },
                  { label: 'Activas', value: daily.kpi?.sessions_active ?? 0 },
                  { label: 'Facturado', value: fmt.currency(daily.kpi?.billed ?? 0) },
                  { label: 'Cobrado', value: fmt.currency(daily.kpi?.collected ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="kpi-card">
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                    <p className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Cliente</th><th>Estação</th><th>Modo</th><th>Início</th><th>Duração</th><th>Valor</th><th>Status</th></tr></thead>
                  <tbody>
                    {(daily.sessions || []).length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sem sessões neste dia</td></tr>}
                    {(daily.sessions || []).map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.client_name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.station_name}</td>
                        <td><span className={`badge ${s.mode === 'Solo' ? 'badge-blue' : 'badge-purple'}`}>{s.mode}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt.time(s.started_at)}</td>
                        <td style={{ fontSize: '0.85rem' }}>{fmt.duration(s.duration_min)}</td>
                        <td className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmt.currency(s.total_amount)}</td>
                        <td><span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
