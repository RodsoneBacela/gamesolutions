'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import {
  Gamepad2, DollarSign, TrendingUp, Wrench, Users, Monitor,
  Clock, AlertTriangle, RefreshCw
} from 'lucide-react';

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
          <p className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 4 }}>{value}</p>
          {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
        </div>
        <div style={{ background: color + '20', borderRadius: 10, padding: 10, color }}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StationCard({ s, onNewSession }: any) {
  const occupied = s.status === 'Occupied';
  const overtime = occupied && s.minutes_remaining <= 0;
  const hasGames = occupied && s.games_total > 0;
  const gamesOut = hasGames && s.games_remaining === 0;
  return (
    <div className={`station-card ${occupied ? 'occupied' : 'available'}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.console || '—'}</p>
        </div>
        <span className={`badge ${occupied ? 'badge-red' : 'badge-green'}`}>
          {occupied ? 'Ocupada' : 'Livre'}
        </span>
      </div>
      {occupied ? (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{s.client_name}</p>
          {s.game_name && (
            <p style={{ fontSize: '0.75rem', color: 'var(--brand)', marginTop: 2 }}>🎮 {s.game_name}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {overtime ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--yellow)', fontSize: '0.8rem' }}>
                <AlertTriangle size={12} /> OVERTIME
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Clock size={12} /> {s.minutes_remaining} min restantes
              </span>
            )}
            {hasGames && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem',
                color: gamesOut ? 'var(--red)' : s.games_remaining <= 1 ? 'var(--yellow)' : 'var(--green)',
                fontWeight: 600,
              }}>
                🎮 {gamesOut ? 'Sem jogos!' : `${s.games_remaining}/${s.games_total} jogos`}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Início: {fmt.time(s.started_at)}
          </p>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }}
          onClick={() => onNewSession(s)}>
          + Nova Sessão
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30_000,
  });

  const kpi = data?.kpi;
  const stations = data?.stations || [];
  const sessions = data?.sessions || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Visão em tempo real · {new Date().toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => qc.invalidateQueries({ queryKey: ['dashboard'] })}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Sessões Activas" value={isLoading ? '—' : kpi?.active_sessions ?? 0} icon={Gamepad2} color="var(--brand)" />
        <KpiCard label="Receita Hoje" value={isLoading ? '—' : fmt.currency(kpi?.revenue_today ?? 0)} icon={DollarSign} color="var(--green)" />
        <KpiCard label="Sessões Hoje" value={isLoading ? '—' : kpi?.sessions_today ?? 0} icon={TrendingUp} color="var(--purple)" />
        <KpiCard label="Receita Mensal" value={isLoading ? '—' : fmt.currency(kpi?.revenue_month ?? 0)} icon={TrendingUp} color="var(--orange)" />
        <KpiCard label="Manutenções" value={isLoading ? '—' : kpi?.open_maintenance ?? 0} icon={Wrench} color="var(--yellow)" />
        <KpiCard label="Total Clientes" value={isLoading ? '—' : kpi?.total_clients ?? 0} icon={Users} color="var(--brand)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
        {/* Stations */}
        <div>
          <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            <Monitor size={16} style={{ display: 'inline', marginRight: 6 }} />Estações
          </h2>
          {isLoading ? (
            <div className="station-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
            </div>
          ) : (
            <div className="station-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {stations.map((s: any) => <StationCard key={s.id} s={s} onNewSession={() => {}} />)}
            </div>
          )}
        </div>

        {/* Sessions today */}
        <div>
          <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            <Gamepad2 size={16} style={{ display: 'inline', marginRight: 6 }} />Sessões de Hoje
          </h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Estação</th>
                  <th>Modo</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhuma sessão hoje</td></tr>
                )}
                {sessions.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.client_name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.station_name}</td>
                    <td><span className={`badge ${s.mode === 'Solo' ? 'badge-blue' : 'badge-purple'}`}>{s.mode}</span></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{fmt.currency(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { Active: 'badge-green', Closed: 'badge-gray', Paused: 'badge-yellow', Cancelled: 'badge-red' };
  const label: Record<string, string> = { Active: 'Activa', Closed: 'Fechada', Paused: 'Pausada', Cancelled: 'Cancelada' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{label[status] || status}</span>;
}
