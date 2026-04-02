'use client';
import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import {
  ArrowLeft, Plus, Trophy, Users, Swords, Shield,
  Crown, X, Play, ChevronRight, CheckCircle, ArrowRight, Settings,
} from 'lucide-react';

const GROUPS = ['A','B','C','D','E','F','G','H'];
const ROUND_LABELS: Record<number,string> = { 1:'Oitavos de Final', 2:'Quartos de Final', 3:'Meias Finais', 4:'Final' };

// ── Helpers ──────────────────────────────────────────────────
function phaseName(p: string) { return p === 'group' ? 'Grupo' : 'Eliminatória'; }
function roundLabel(r: number, totalPlayers: number) {
  if (totalPlayers <= 2)  return 'Final';
  if (totalPlayers <= 4)  return r === 1 ? 'Meias Finais' : 'Final';
  if (totalPlayers <= 8)  return ROUND_LABELS[r + 1] || `Ronda ${r}`;
  return ROUND_LABELS[r] || `Ronda ${r}`;
}

function StatusChip({ status }: { status: string }) {
  const m: Record<string,string> = { Open:'badge-green', group_phase:'badge-blue', knockout_phase:'badge-yellow', Finished:'badge-gray' };
  const l: Record<string,string> = { Open:'Aberto', group_phase:'Fase de Grupos', knockout_phase:'Eliminatórias', Finished:'Terminado' };
  return <span className={`badge ${m[status]||'badge-gray'}`}>{l[status]||status}</span>;
}

// ── Main Page ─────────────────────────────────────────────────
export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const qc      = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen]       = useState(false);
  const [setupOpen, setSetupOpen]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api.get(`/tournaments/${id}`).then(r => r.data),
    refetchInterval: 15_000,
  });

  const tournament = data?.tournament;
  const players    = (data?.players || []) as any[];
  const matches    = (data?.matches || []) as any[];

  const patchStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/tournaments/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); toast('Status actualizado'); },
  });

  const deletePlayer = useMutation({
    mutationFn: (pid: number) => api.delete(`/tournaments/${id}/players/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id] }); toast('Jogador removido'); },
  });

  if (isLoading || !tournament) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:'1rem', color:'var(--text-muted)' }}>
      <Trophy size={40} style={{ opacity:0.3 }}/>
      {isLoading ? <p>A carregar...</p> : <><p>Torneio não encontrado.</p><button className="btn btn-secondary" onClick={() => router.push('/tournaments')}><ArrowLeft size={14}/> Voltar</button></>}
    </div>
  );

  const isKO       = tournament.format === 'knockout';
  const accentColor = isKO ? 'var(--brand)' : 'var(--purple)';
  const active     = players.filter((p: any) => !p.is_eliminated);
  const isOpen     = tournament.status === 'Open';
  const isFinished = tournament.status === 'Finished';
  const winner     = isFinished ? active[0] : (active.length === 1 && players.length > 1 ? active[0] : null);

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:'1rem' }} onClick={() => router.push('/tournaments')}>
        <ArrowLeft size={14}/> Voltar
      </button>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            {isKO ? <Swords size={20} color={accentColor}/> : <Shield size={20} color={accentColor}/>}
            <h1 className="font-display" style={{ fontSize:'1.75rem', fontWeight:700 }}>{tournament.name}</h1>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <StatusChip status={tournament.status}/>
            <span className="badge" style={{ background: accentColor+'18', color: accentColor }}>
              {isKO ? 'Eliminação Directa' : `${tournament.num_groups} Grupos + KO`}
            </span>
            <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>{fmt.date(tournament.tournament_date)}</span>
            <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>{players.length}/{tournament.max_players} jogadores</span>
          </div>
        </div>

        {/* Action buttons per status */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {isOpen && <>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(true)}><Plus size={14}/> Jogador</button>
            {!isKO && players.length >= 2 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSetupOpen(true)}>
                <Settings size={14}/> Configurar Grupos
              </button>
            )}
            {players.length >= 2 && (
              <button className="btn btn-primary btn-sm"
                onClick={() => patchStatus.mutate(isKO ? 'knockout_phase' : 'group_phase')}>
                <Play size={14}/> Iniciar Torneio
              </button>
            )}
          </>}
          {tournament.status === 'group_phase' && (
            <button className="btn btn-primary btn-sm"
              onClick={() => { if(confirm('Avançar para a fase de eliminatórias? Os líderes de cada grupo avançam.')) patchStatus.mutate('knockout_phase'); }}>
              <ArrowRight size={14}/> Avançar para Eliminatórias
            </button>
          )}
          {tournament.status === 'knockout_phase' && active.length === 1 && (
            <button className="btn btn-primary btn-sm" onClick={() => patchStatus.mutate('Finished')}>
              <Trophy size={14}/> Terminar Torneio
            </button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[
          { label:'Prémio',     value: fmt.currency(tournament.prize), color:'var(--yellow)' },
          { label:'Inscrição',  value: fmt.currency(tournament.entry_fee) },
          { label:'Jogadores',  value: `${players.length}` },
          { label:'Activos',    value: `${active.length}` },
          { label:'Eliminados', value: `${players.filter((p:any)=>p.is_eliminated).length}` },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'0.5rem 0.875rem' }}>
            <p style={{ fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
            <p className="font-display" style={{ fontSize:'1.15rem', fontWeight:700, color: color||'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Winner */}
      {winner && (
        <div style={{ background:'rgba(250,204,21,0.1)', border:'2px solid rgba(250,204,21,0.5)', borderRadius:14, padding:'1.25rem', marginBottom:'1.5rem', textAlign:'center' }}>
          <Crown size={32} color="var(--yellow)" style={{ display:'block', margin:'0 auto 0.5rem' }}/>
          <p className="font-display" style={{ fontSize:'2rem', fontWeight:700, color:'var(--yellow)' }}>
            🏆 {winner.player_name}
          </p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:4 }}>Campeão do torneio</p>
        </div>
      )}

      {/* Content by format + status */}
      {isKO
        ? <KnockoutFlow tournament={tournament} players={players} matches={matches.filter((m:any)=>m.phase==='knockout')} tournamentId={id}/>
        : <GroupKnockoutFlow tournament={tournament} players={players} matches={matches} tournamentId={id}/>
      }

      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} tournamentId={id}/>
      {setupOpen && <SetupGroupsModal players={players} numGroups={tournament.num_groups} tournamentId={id} onClose={() => setSetupOpen(false)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KNOCKOUT FLOW
// ══════════════════════════════════════════════════════════════
function KnockoutFlow({ tournament, players, matches, tournamentId }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const isOpen = tournament.status === 'Open';
  const isActive = tournament.status === 'knockout_phase';

  const winnerMut = useMutation({
    mutationFn: ({ mid, winner_id, score1, score2 }: any) =>
      api.patch(`/tournaments/${tournamentId}/matches/${mid}/winner`, { winner_id, score1, score2 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toast('Jogador avançou!'); },
    onError: () => toast('Erro', 'error'),
  });

  const activePlayers = players.filter((p:any) => !p.is_eliminated);

  // Group matches by round
  const rounds: Record<number, any[]> = {};
  matches.forEach((m: any) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  if (isOpen) {
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
          <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700 }}>Jogadores ({players.length})</h2>
        </div>
        <PlayersGrid players={players} canDelete={isOpen} onDelete={() => {}}/>
        {players.length < 2 && (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>
            <p>Adiciona pelo menos 2 jogadores para iniciar.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {isActive && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <Swords size={14}/> Criar Confronto
          </button>
        </div>
      )}

      {matches.length === 0 && isActive && (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)', background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
          <Swords size={40} style={{ opacity:0.3, display:'block', margin:'0 auto 1rem' }}/>
          <p style={{ marginBottom:'1rem' }}>Nenhum confronto criado ainda.</p>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar Primeiro Confronto</button>
        </div>
      )}

      {/* Bracket by round */}
      {Object.entries(rounds).sort(([a],[b]) => Number(a)-Number(b)).map(([round, rMatches]: any) => (
        <div key={round} style={{ marginBottom:'2rem' }}>
          <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--brand)', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:8 }}>
            <Swords size={16}/> {roundLabel(Number(round), activePlayers.length)}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {rMatches.map((m: any) => (
              <MatchCard key={m.id} match={m} canEdit={isActive && m.status !== 'Done'}
                onSetWinner={(wid: number, s1: number, s2: number) => winnerMut.mutate({ mid: m.id, winner_id: wid, score1: s1, score2: s2 })}/>
            ))}
          </div>
        </div>
      ))}

      {createOpen && (
        <CreateMatchModal phase="knockout" players={activePlayers} tournamentId={tournamentId} onClose={() => setCreateOpen(false)}/>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GROUP + KNOCKOUT FLOW
// ══════════════════════════════════════════════════════════════
function GroupKnockoutFlow({ tournament, players, matches, tournamentId }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [tab, setTab] = useState<'groups'|'knockout'>(
    tournament.status === 'knockout_phase' || tournament.status === 'Finished' ? 'knockout' : 'groups'
  );
  const [createGroupMatch, setCreateGroupMatch] = useState<string|null>(null);
  const [createKOMatch, setCreateKOMatch]       = useState(false);

  const isGroupPhase   = tournament.status === 'group_phase';
  const isKOPhase      = tournament.status === 'knockout_phase';
  const isFinished     = tournament.status === 'Finished';
  const isOpen         = tournament.status === 'Open';

  const groupMatches = matches.filter((m:any) => m.phase === 'group');
  const koMatches    = matches.filter((m:any) => m.phase === 'knockout');

  const winnerMut = useMutation({
    mutationFn: ({ mid, winner_id, score1, score2 }: any) =>
      api.patch(`/tournaments/${tournamentId}/matches/${mid}/winner`, { winner_id, score1, score2 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toast('Resultado registado!'); },
    onError: () => toast('Erro', 'error'),
  });

  // Group players by group
  const grouped: Record<string, any[]> = {};
  players.forEach((p: any) => {
    const g = p.group_name || 'SEM GRUPO';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });
  const sortedGrouped = Object.entries(grouped).filter(([g]) => g !== 'SEM GRUPO')
    .sort(([a],[b]) => a.localeCompare(b));

  // KO rounds
  const koRounds: Record<number, any[]> = {};
  koMatches.forEach((m: any) => {
    if (!koRounds[m.round]) koRounds[m.round] = [];
    koRounds[m.round].push(m);
  });
  const activePlayers = players.filter((p:any) => !p.is_eliminated);

  if (isOpen) {
    return (
      <div>
        <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'0.75rem' }}>Jogadores ({players.length})</h2>
        <PlayersGrid players={players} canDelete onDelete={()=>{}}/>
        {players.length < 2 && <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>Adiciona pelo menos 2 jogadores.</p>}
      </div>
    );
  }

  return (
    <div>
      {/* Phase tabs */}
      <div className="tabs" style={{ marginBottom:'1.5rem', width:'fit-content' }}>
        <button className={`tab ${tab==='groups'?'active':''}`} onClick={() => setTab('groups')}>
          <Shield size={13} style={{ display:'inline', marginRight:5 }}/>Grupos
          {isGroupPhase && <span style={{ marginLeft:6, background:'var(--green)', borderRadius:999, width:6, height:6, display:'inline-block', verticalAlign:'middle' }}/>}
        </button>
        <button className={`tab ${tab==='knockout'?'active':''}`} onClick={() => setTab('knockout')}>
          <Swords size={13} style={{ display:'inline', marginRight:5 }}/>Eliminatórias
          {isKOPhase && <span style={{ marginLeft:6, background:'var(--yellow)', borderRadius:999, width:6, height:6, display:'inline-block', verticalAlign:'middle' }}/>}
        </button>
      </div>

      {/* ── GROUPS ── */}
      {tab === 'groups' && (
        <div>
          {sortedGrouped.map(([groupName, gPlayers]: any) => {
            const gMatches = groupMatches.filter((m:any) => m.group_name === groupName);
            const sorted   = [...gPlayers].sort((a,b) => b.group_points-a.group_points);
            return (
              <div key={groupName} style={{ marginBottom:'2rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                  <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--purple)', display:'flex', alignItems:'center', gap:8 }}>
                    <Shield size={16}/> Grupo {groupName}
                  </h2>
                  {isGroupPhase && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setCreateGroupMatch(groupName)}>
                      <Plus size={12}/> Novo Jogo
                    </button>
                  )}
                </div>

                {/* Standings table */}
                <div className="table-wrapper" style={{ marginBottom:'0.75rem' }}>
                  <table>
                    <thead><tr><th>Pos.</th><th>Jogador</th><th>V</th><th>D</th><th>Pts</th></tr></thead>
                    <tbody>
                      {sorted.map((p: any, i: number) => (
                        <tr key={p.id} style={{ background: i===0 ? 'rgba(250,204,21,0.05)' : '' }}>
                          <td style={{ fontWeight:700, color: i===0?'var(--yellow)':'var(--text-muted)' }}>
                            {i===0 && <Crown size={11} color="var(--yellow)" style={{ display:'inline', marginRight:4 }}/>}{i+1}
                          </td>
                          <td style={{ fontWeight:500 }}>{p.player_name}</td>
                          <td style={{ color:'var(--green)', fontWeight:600 }}>{p.group_wins}</td>
                          <td style={{ color:'var(--red)', fontWeight:600 }}>{p.group_losses}</td>
                          <td><span className="font-display" style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--purple)' }}>{p.group_points}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Matches */}
                {gMatches.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {gMatches.map((m: any) => (
                      <MatchCard key={m.id} match={m}
                        canEdit={isGroupPhase && m.status !== 'Done'}
                        onSetWinner={(wid:number,s1:number,s2:number) => winnerMut.mutate({ mid:m.id, winner_id:wid, score1:s1, score2:s2 })}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {createGroupMatch && (
            <CreateMatchModal phase="group" groupName={createGroupMatch}
              players={players.filter((p:any) => p.group_name === createGroupMatch)}
              tournamentId={tournamentId} onClose={() => setCreateGroupMatch(null)}/>
          )}
        </div>
      )}

      {/* ── KNOCKOUT ── */}
      {tab === 'knockout' && (
        <div>
          {isKOPhase && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setCreateKOMatch(true)}>
                <Swords size={14}/> Criar Confronto
              </button>
            </div>
          )}

          {koMatches.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)', background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
              <Swords size={40} style={{ opacity:0.3, display:'block', margin:'0 auto 1rem' }}/>
              {isKOPhase
                ? <><p style={{ marginBottom:'1rem' }}>Cria os primeiros confrontos das eliminatórias.</p><button className="btn btn-primary" onClick={() => setCreateKOMatch(true)}><Plus size={14}/> Criar Confronto</button></>
                : <p>Os confrontos aparecerão aqui quando a fase de grupos terminar.</p>
              }
            </div>
          )}

          {Object.entries(koRounds).sort(([a],[b]) => Number(a)-Number(b)).map(([round, rMatches]: any) => (
            <div key={round} style={{ marginBottom:'2rem' }}>
              <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--brand)', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:8 }}>
                <Swords size={16}/> {roundLabel(Number(round), activePlayers.length)}
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {rMatches.map((m: any) => (
                  <MatchCard key={m.id} match={m}
                    canEdit={isKOPhase && m.status !== 'Done'}
                    onSetWinner={(wid:number,s1:number,s2:number) => winnerMut.mutate({ mid:m.id, winner_id:wid, score1:s1, score2:s2 })}/>
                ))}
              </div>
            </div>
          ))}

          {createKOMatch && (
            <CreateMatchModal phase="knockout" players={activePlayers}
              tournamentId={tournamentId} onClose={() => setCreateKOMatch(false)}/>
          )}
        </div>
      )}
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────
function MatchCard({ match, canEdit, onSetWinner }: any) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const done = match.status === 'Done';
  const p1won = match.winner_id === match.player1_id;
  const p2won = match.winner_id === match.player2_id;

  return (
    <div style={{
      background: done ? 'var(--bg-secondary)' : 'var(--bg-card)',
      border: `1px solid ${done ? 'var(--border)' : 'var(--border-light)'}`,
      borderRadius:10, padding:'0.875rem 1rem',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>

        {/* Player 1 */}
        <div style={{ flex:1, textAlign:'right' }}>
          <p style={{ fontWeight:600, fontSize:'0.9rem', color: p1won ? 'var(--green)' : done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {match.player1_name || '—'}
            {p1won && <Crown size={12} color="var(--yellow)" style={{ display:'inline', marginLeft:4 }}/>}
          </p>
        </div>

        {/* Score / vs */}
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:110, justifyContent:'center' }}>
          {canEdit ? (
            <>
              <input type="number" min="0" className="input font-mono"
                style={{ width:44, textAlign:'center', padding:'0.25rem' }}
                value={s1} placeholder="0" onChange={e => setS1(e.target.value)}/>
              <span style={{ color:'var(--text-dim)', fontWeight:700, fontSize:'0.9rem' }}>×</span>
              <input type="number" min="0" className="input font-mono"
                style={{ width:44, textAlign:'center', padding:'0.25rem' }}
                value={s2} placeholder="0" onChange={e => setS2(e.target.value)}/>
            </>
          ) : (
            <span className="font-display" style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:2 }}>
              {done ? `${match.score1??'—'} × ${match.score2??'—'}` : 'vs'}
            </span>
          )}
        </div>

        {/* Player 2 */}
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:600, fontSize:'0.9rem', color: p2won ? 'var(--green)' : done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {p2won && <Crown size={12} color="var(--yellow)" style={{ display:'inline', marginRight:4 }}/>}
            {match.player2_name || '—'}
          </p>
        </div>

        {/* Actions */}
        {canEdit && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {match.player1_id && (
              <button className="btn btn-secondary btn-sm"
                title={`${match.player1_name} venceu`}
                style={{ fontSize:'0.75rem' }}
                onClick={() => onSetWinner(match.player1_id, Number(s1)||0, Number(s2)||0)}>
                <ChevronRight size={12}/> {(match.player1_name||'').split(' ')[0]}
              </button>
            )}
            {match.player2_id && (
              <button className="btn btn-secondary btn-sm"
                title={`${match.player2_name} venceu`}
                style={{ fontSize:'0.75rem' }}
                onClick={() => onSetWinner(match.player2_id, Number(s2)||0, Number(s1)||0)}>
                <ChevronRight size={12}/> {(match.player2_name||'').split(' ')[0]}
              </button>
            )}
          </div>
        )}

        {done && <span className="badge badge-green" style={{ flexShrink:0 }}><CheckCircle size={10}/> Concluído</span>}
      </div>
    </div>
  );
}

// ── Players Grid ──────────────────────────────────────────────
function PlayersGrid({ players, canDelete, onDelete }: any) {
  if (players.length === 0) return (
    <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>
      <Users size={32} style={{ opacity:0.3, display:'block', margin:'0 auto 0.75rem' }}/>
      <p>Sem jogadores ainda.</p>
    </div>
  );
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'0.75rem' }}>
      {players.map((p: any) => (
        <div key={p.id} style={{
          background: p.is_eliminated ? 'var(--bg-secondary)' : 'var(--bg-card)',
          border:`1px solid ${p.is_eliminated?'var(--border)':'var(--border-light)'}`,
          borderRadius:10, padding:'0.75rem', opacity: p.is_eliminated?0.5:1,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--brand-dim)', border:'1px solid rgba(14,165,233,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span className="font-display" style={{ fontWeight:700, color:'var(--brand)', fontSize:'0.8rem' }}>{p.player_name[0].toUpperCase()}</span>
            </div>
            <div>
              <p style={{ fontWeight:600, fontSize:'0.82rem', textDecoration: p.is_eliminated?'line-through':'none' }}>{p.player_name}</p>
              {p.group_name && <span className="badge badge-blue" style={{ fontSize:'0.62rem' }}>Gr. {p.group_name}</span>}
              {p.is_eliminated && <p style={{ fontSize:'0.68rem', color:'var(--red)' }}>Eliminado</p>}
            </div>
          </div>
          {canDelete && !p.is_eliminated && (
            <button className="btn btn-ghost btn-icon" style={{ width:'1.4rem', height:'1.4rem', color:'var(--text-dim)', flexShrink:0 }}
              onClick={() => { if(confirm(`Remover ${p.player_name}?`)) onDelete(p.id); }}>
              <X size={10}/>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Add Player Modal ──────────────────────────────────────────
function AddPlayerModal({ open, onClose, tournamentId }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [names, setNames] = useState('');

  const mut = useMutation({
    mutationFn: async () => {
      const list = names.split('\n').map(n => n.trim()).filter(Boolean);
      for (const name of list) {
        await api.post(`/tournaments/${tournamentId}/players`, { player_name: name });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast('Jogador(es) adicionado(s)');
      setNames(''); onClose();
    },
    onError: () => toast('Erro', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Jogadores" size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!names.trim() || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? 'A adicionar...' : <><Plus size={14}/> Adicionar</>}
        </button>
      </>}>
      <div className="form-group">
        <label className="label">Nome(s) — um por linha</label>
        <textarea className="input" placeholder={"João Silva\nMaria Dos Santos\nCarlos..."} value={names}
          onChange={e => setNames(e.target.value)} style={{ minHeight:120 }} autoFocus/>
        <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>Podes adicionar vários jogadores de uma vez, um por linha.</p>
      </div>
    </Modal>
  );
}

// ── Setup Groups Modal ────────────────────────────────────────
function SetupGroupsModal({ players, numGroups, tournamentId, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [assignments, setAssignments] = useState<Record<number,string>>(() => {
    const init: Record<number,string> = {};
    players.forEach((p: any, i: number) => { init[p.id] = GROUPS[i % numGroups]; });
    return init;
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      for (const [pid, group] of Object.entries(assignments)) {
        await api.patch(`/tournaments/${tournamentId}/players/${pid}`, { group_name: group });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toast('Grupos guardados!'); onClose(); },
    onError: () => toast('Erro', 'error'),
  });

  const autoDistribute = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const next: Record<number,string> = {};
    shuffled.forEach((p: any, i: number) => { next[p.id] = GROUPS[i % numGroups]; });
    setAssignments(next);
  };

  return (
    <Modal open={true} onClose={onClose} title="Configurar Grupos" size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ghost" onClick={autoDistribute}>🎲 Distribuir Aleatoriamente</button>
        <button className="btn btn-primary" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? 'A guardar...' : 'Guardar Grupos'}
        </button>
      </>}>
      <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1rem' }}>
        Distribui os {players.length} jogadores pelos {numGroups} grupos.
      </p>
      {GROUPS.slice(0, numGroups).map(g => {
        const inGroup = players.filter((p: any) => (assignments[p.id]||GROUPS[0]) === g);
        return (
          <div key={g} style={{ marginBottom:'0.75rem' }}>
            <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
              <Shield size={10} style={{ display:'inline', marginRight:4 }}/>Grupo {g} ({inGroup.length} jogadores)
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {players.map((p: any) => (
                (assignments[p.id]||GROUPS[0]) === g && (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0.75rem', background:'var(--bg-elevated)', borderRadius:6 }}>
                    <span style={{ fontWeight:500, fontSize:'0.875rem' }}>{p.player_name}</span>
                    <select className="input" style={{ width:90, padding:'0.2rem 0.4rem', fontSize:'0.8rem' }}
                      value={assignments[p.id]||'A'}
                      onChange={e => setAssignments(a => ({...a, [p.id]: e.target.value}))}>
                      {GROUPS.slice(0, numGroups).map(gr => <option key={gr} value={gr}>Grupo {gr}</option>)}
                    </select>
                  </div>
                )
              ))}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

// ── Create Match Modal ────────────────────────────────────────
function CreateMatchModal({ phase, groupName, players, tournamentId, onClose }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [round, setRound] = useState('1');

  const mut = useMutation({
    mutationFn: () => api.post(`/tournaments/${tournamentId}/matches`, {
      phase, round: Number(round), group_name: groupName||null,
      player1_id: Number(p1), player2_id: Number(p2),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toast('Confronto criado'); onClose(); },
    onError: () => toast('Erro ao criar confronto', 'error'),
  });

  const p1name = players.find((p:any) => p.id===Number(p1))?.player_name;
  const p2name = players.find((p:any) => p.id===Number(p2))?.player_name;

  return (
    <Modal open={true} onClose={onClose}
      title={phase==='group' ? `Jogo — Grupo ${groupName}` : 'Novo Confronto Eliminatória'} size="sm"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!p1||!p2||p1===p2||mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? '...' : <><Swords size={14}/> Criar</>}
        </button>
      </>}>

      {phase === 'knockout' && (
        <div className="form-group">
          <label className="label">Fase</label>
          <select className="input" value={round} onChange={e => setRound(e.target.value)}>
            <option value="1">Oitavos de Final</option>
            <option value="2">Quartos de Final</option>
            <option value="3">Meias Finais</option>
            <option value="4">Final</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="label">Jogador 1</label>
        <select className="input" value={p1} onChange={e => setP1(e.target.value)}>
          <option value="">Seleccionar...</option>
          {players.map((p:any) => <option key={p.id} value={p.id} disabled={String(p.id)===p2}>{p.player_name}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="label">Jogador 2</label>
        <select className="input" value={p2} onChange={e => setP2(e.target.value)}>
          <option value="">Seleccionar...</option>
          {players.map((p:any) => <option key={p.id} value={p.id} disabled={String(p.id)===p1}>{p.player_name}</option>)}
        </select>
      </div>

      {p1 && p2 && p1!==p2 && (
        <div style={{ background:'var(--bg-elevated)', borderRadius:8, padding:'0.75rem', textAlign:'center' }}>
          <span style={{ fontWeight:700 }}>{p1name}</span>
          <span style={{ margin:'0 12px', color:'var(--text-muted)', fontWeight:700 }}>vs</span>
          <span style={{ fontWeight:700 }}>{p2name}</span>
        </div>
      )}
    </Modal>
  );
}
