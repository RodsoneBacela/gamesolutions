'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Trophy, ChevronRight, Swords, Shield } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,string> = {
    Open:'badge-green', group_phase:'badge-blue',
    knockout_phase:'badge-yellow', Finished:'badge-gray'
  };
  const label: Record<string,string> = {
    Open:'Aberto', group_phase:'Fase de Grupos',
    knockout_phase:'Eliminatórias', Finished:'Terminado'
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{label[status]||status}</span>;
}

export default function TournamentsPage() {
  const router   = useRouter();
  const [newOpen, setNewOpen] = useState(false);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => api.get('/tournaments').then(r => r.data),
  });

  const knockouts    = tournaments.filter((t: any) => t.format === 'knockout');
  const groupKnocks  = tournaments.filter((t: any) => t.format === 'group_knockout');

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize:'1.75rem', fontWeight:700 }}>Torneios</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>{tournaments.length} torneios registados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16}/> Novo Torneio</button>
      </div>

      {isLoading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap:'1rem' }}>
          {[...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height:180 }}/>)}
        </div>
      )}

      {!isLoading && tournaments.length === 0 && (
        <div style={{ textAlign:'center', padding:'5rem', color:'var(--text-muted)' }}>
          <Trophy size={48} style={{ opacity:0.2, display:'block', margin:'0 auto 1rem' }}/>
          <p style={{ marginBottom:'1.5rem' }}>Sem torneios. Cria o primeiro!</p>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={14}/> Novo Torneio</button>
        </div>
      )}

      {/* Knockout section */}
      {knockouts.length > 0 && (
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem' }}>
            <Swords size={16} color="var(--brand)"/>
            <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--brand)' }}>Eliminação Directa</h2>
          </div>
          <TournamentGrid tournaments={knockouts} onOpen={(id: number) => router.push(`/tournaments/${id}`)}/>
        </div>
      )}

      {/* Group + Knockout section */}
      {groupKnocks.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem' }}>
            <Shield size={16} color="var(--purple)"/>
            <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--purple)' }}>Grupos + Eliminatórias</h2>
          </div>
          <TournamentGrid tournaments={groupKnocks} onOpen={(id: number) => router.push(`/tournaments/${id}`)}/>
        </div>
      )}

      <NewTournamentModal open={newOpen} onClose={() => setNewOpen(false)}/>
    </div>
  );
}

function TournamentGrid({ tournaments, onOpen }: any) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap:'1rem' }}>
      {tournaments.map((t: any) => (
        <TournamentCard key={t.id} tournament={t} onOpen={() => onOpen(t.id)}/>
      ))}
    </div>
  );
}

function TournamentCard({ tournament: t, onOpen }: any) {
  const isKO = t.format === 'knockout';
  const accentColor = isKO ? 'var(--brand)' : 'var(--purple)';

  return (
    <div className="card" style={{ cursor:'pointer', borderColor:'var(--border)', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; }}>

      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: accentColor }}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, marginTop:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isKO
            ? <Swords size={18} color={accentColor}/>
            : <Shield size={18} color={accentColor}/>}
          <span className="badge" style={{ background: accentColor+'18', color: accentColor, fontSize:'0.65rem' }}>
            {isKO ? 'Knockout' : `${t.num_groups} Grupos + KO`}
          </span>
        </div>
        <StatusBadge status={t.status}/>
      </div>

      <h3 style={{ fontWeight:700, fontSize:'1rem', marginBottom:4 }}>{t.name}</h3>
      <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:12 }}>{fmt.date(t.tournament_date)}</p>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:12 }}>
        <span style={{ color:'var(--text-muted)' }}>Inscrição: <strong style={{ color:'var(--text-primary)' }}>{fmt.currency(t.entry_fee)}</strong></span>
        <span style={{ color:'var(--text-muted)' }}>Prémio: <strong style={{ color:'var(--yellow)' }}>{fmt.currency(t.prize)}</strong></span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Máx. {t.max_players} jogadores</span>
        <ChevronRight size={14} color="var(--text-dim)"/>
      </div>
    </div>
  );
}

function NewTournamentModal({ open, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast(); const router = useRouter();
  const [format, setFormat] = useState<'knockout'|'group_knockout'>('knockout');
  const [form, setForm] = useState({
    name: '', tournament_date: new Date().toISOString().split('T')[0],
    entry_fee: '', prize: '', max_players: 8, num_groups: 2, notes: '',
  });

  const isKO = format === 'knockout';

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/tournaments', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      toast('Torneio criado');
      onClose();
      router.push(`/tournaments/${res.data.id}`);
    },
    onError: (e: any) => toast(e.response?.data?.error || 'Erro', 'error'),
  });

  const submit = () => mut.mutate({
    ...form,
    format,
    entry_fee:   Number(form.entry_fee)   || 0,
    prize:       Number(form.prize)       || 0,
    max_players: Number(form.max_players),
    num_groups:  Number(form.num_groups),
  });

  return (
    <Modal open={open} onClose={onClose} title="Novo Torneio" size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.name || mut.isPending} onClick={submit}>
          {mut.isPending ? 'A criar...' : <><Trophy size={14}/> Criar Torneio</>}
        </button>
      </>}>

      {/* Format selector */}
      <div style={{ marginBottom:'1.5rem' }}>
        <label className="label">Formato do Torneio *</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <button onClick={() => setFormat('knockout')} style={{
            padding:'1rem', borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all 0.15s',
            background: isKO ? 'rgba(14,165,233,0.1)' : 'var(--bg-elevated)',
            border: `2px solid ${isKO ? 'var(--brand)' : 'var(--border)'}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Swords size={18} color={isKO ? 'var(--brand)' : 'var(--text-muted)'}/>
              <span style={{ fontWeight:700, color: isKO ? 'var(--brand)' : 'var(--text-primary)' }}>Eliminação Directa</span>
            </div>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.4 }}>
              Bracket directo. Perdes → foras. Simples e rápido.
            </p>
          </button>
          <button onClick={() => setFormat('group_knockout')} style={{
            padding:'1rem', borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all 0.15s',
            background: !isKO ? 'rgba(168,85,247,0.1)' : 'var(--bg-elevated)',
            border: `2px solid ${!isKO ? 'var(--purple)' : 'var(--border)'}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Shield size={18} color={!isKO ? 'var(--purple)' : 'var(--text-muted)'}/>
              <span style={{ fontWeight:700, color: !isKO ? 'var(--purple)' : 'var(--text-primary)' }}>Grupos + Eliminatórias</span>
            </div>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.4 }}>
              Fase de grupos → os melhores avançam para as eliminatórias.
            </p>
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Nome do Torneio *</label>
        <input className="input" placeholder="ex: Torneio FIFA Abril 2026"
          value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <div className="form-group">
          <label className="label">Data</label>
          <input type="date" className="input" value={form.tournament_date}
            onChange={e => setForm(f => ({...f, tournament_date: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="label">Nº Jogadores (par)</label>
          <input className="input font-mono" type="number" min={2} step={2}
            value={form.max_players}
            onChange={e => setForm(f => ({...f, max_players: Number(e.target.value)}))}/>
        </div>
        <div className="form-group">
          <label className="label">Taxa Inscrição (MZN)</label>
          <input className="input font-mono" type="number" placeholder="0.00"
            value={form.entry_fee} onChange={e => setForm(f => ({...f, entry_fee: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="label">Prémio (MZN)</label>
          <input className="input font-mono" type="number" placeholder="0.00"
            value={form.prize} onChange={e => setForm(f => ({...f, prize: e.target.value}))}/>
        </div>
        {!isKO && (
          <div className="form-group">
            <label className="label">Nº de Grupos</label>
            <select className="input" value={form.num_groups}
              onChange={e => setForm(f => ({...f, num_groups: Number(e.target.value)}))}>
              {[2,3,4,6,8].map(n => <option key={n} value={n}>{n} grupos</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="label">Notas (opcional)</label>
        <textarea className="input" placeholder="Observações..."
          value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
          style={{ minHeight:56 }}/>
      </div>
    </Modal>
  );
}
