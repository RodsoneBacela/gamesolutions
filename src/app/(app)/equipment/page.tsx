'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Wrench, Package, Gamepad2, Edit2, Trash2 } from 'lucide-react';

function EquipStatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { 'In Use': 'badge-green', 'In Maintenance': 'badge-yellow', 'Decommissioned': 'badge-gray' };
  const l: Record<string, string> = { 'In Use': 'Em Uso', 'In Maintenance': 'Em Manutenção', 'Decommissioned': 'Desactivado' };
  return <span className={`badge ${m[status] || 'badge-gray'}`}>{l[status] || status}</span>;
}
function MaintStatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { Open: 'badge-red', 'In Progress': 'badge-yellow', Closed: 'badge-gray' };
  const l: Record<string, string> = { Open: 'Aberto', 'In Progress': 'Em Progresso', Closed: 'Fechado' };
  return <span className={`badge ${m[status] || 'badge-gray'}`}>{l[status] || status}</span>;
}

const PRESET_COLORS = ['#0ea5e9','#22c55e','#ef4444','#a855f7','#f59e0b','#f97316','#06b6d4','#84cc16','#ec4899','#8b5cf6'];
const GENRES = ['Futebol','FPS','Luta','Basquete','Acção','Battle Royale','Sandbox','RPG','Corridas','Desporto','Estratégia','Aventura','Puzzle','Outro'];

export default function EquipmentPage() {
  const [tab, setTab]                     = useState<'equip'|'games'|'maint'>('equip');
  const [newEquipOpen, setNewEquipOpen]   = useState(false);
  const [newMaintOpen, setNewMaintOpen]   = useState(false);
  const [newGameOpen,  setNewGameOpen]    = useState(false);
  const [editGame,     setEditGame]       = useState<any>(null);
  const [closeMaintId, setCloseMaintId]   = useState<number|null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: equipment   = [], isLoading: eLoad } = useQuery({ queryKey: ['equipment'],   queryFn: () => api.get('/equipment').then(r => r.data) });
  const { data: maintenance = [], isLoading: mLoad } = useQuery({ queryKey: ['maintenance'], queryFn: () => api.get('/maintenance').then(r => r.data) });
  const { data: games       = [], isLoading: gLoad } = useQuery({ queryKey: ['games'],       queryFn: () => api.get('/games').then(r => r.data) });

  const closeMut = useMutation({
    mutationFn: ({ id, actual_cost }: any) => api.patch(`/maintenance/${id}/close`, { actual_cost }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['equipment'] }); toast('Ticket fechado'); setCloseMaintId(null); },
    onError: () => toast('Erro', 'error'),
  });
  const deleteGame = useMutation({
    mutationFn: (id: number) => api.delete(`/games/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); toast('Jogo removido'); },
    onError: () => toast('Erro', 'error'),
  });

  const openMaint   = maintenance.filter((m: any) => m.status !== 'Closed');
  const closedMaint = maintenance.filter((m: any) => m.status === 'Closed');

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize:'1.75rem', fontWeight:700 }}>Equipamentos & Jogos</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Gestão de equipamentos, catálogo de jogos e manutenção</p>
        </div>
        {tab==='equip' && <button className="btn btn-primary" onClick={() => setNewEquipOpen(true)}><Plus size={16}/> Equipamento</button>}
        {tab==='games' && <button className="btn btn-primary" onClick={() => setNewGameOpen(true)}><Plus size={16}/> Novo Jogo</button>}
        {tab==='maint' && <button className="btn btn-primary" onClick={() => setNewMaintOpen(true)}><Plus size={16}/> Ticket</button>}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:'1.5rem', width:'fit-content' }}>
        <button className={`tab ${tab==='equip'?'active':''}`} onClick={() => setTab('equip')}>
          <Package size={13} style={{ display:'inline', marginRight:5 }}/>Equipamentos ({equipment.length})
        </button>
        <button className={`tab ${tab==='games'?'active':''}`} onClick={() => setTab('games')}>
          <Gamepad2 size={13} style={{ display:'inline', marginRight:5 }}/>Jogos ({games.length})
        </button>
        <button className={`tab ${tab==='maint'?'active':''}`} onClick={() => setTab('maint')}>
          <Wrench size={13} style={{ display:'inline', marginRight:5 }}/>Manutenção ({openMaint.length} abertos)
        </button>
      </div>

      {/* ── EQUIPAMENTOS ── */}
      {tab==='equip' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nome</th><th>Categoria</th><th>Serial</th><th>Localização</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {eLoad && <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>A carregar...</td></tr>}
              {!eLoad && equipment.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>Sem equipamentos registados</td></tr>}
              {equipment.map((e: any) => (
                <tr key={e.id}>
                  <td style={{ fontWeight:500 }}>{e.name}</td>
                  <td style={{ color:'var(--text-muted)' }}>{e.category||'—'}</td>
                  <td className="font-mono" style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{e.serial_number||'—'}</td>
                  <td style={{ color:'var(--text-muted)' }}>{e.location||'—'}</td>
                  <td className="font-mono" style={{ fontSize:'0.85rem' }}>{e.purchase_value ? fmt.currency(e.purchase_value) : '—'}</td>
                  <td><EquipStatusBadge status={e.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── JOGOS ── */}
      {tab==='games' && (
        <div>
          {gLoad && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,220px),1fr))', gap:'1rem' }}>
              {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:160 }}/>)}
            </div>
          )}
          {!gLoad && games.length===0 && (
            <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>
              <Gamepad2 size={48} style={{ margin:'0 auto 1rem', opacity:0.2, display:'block' }}/>
              <p style={{ marginBottom:'1rem' }}>Sem jogos no catálogo. Adiciona o primeiro!</p>
              <button className="btn btn-primary" onClick={() => setNewGameOpen(true)}><Plus size={14}/> Adicionar Jogo</button>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,220px),1fr))', gap:'1rem' }}>
            {games.map((g: any) => {
              const accent = g.cover_color || '#0ea5e9';
              return (
                <div key={g.id} className="card" style={{ borderColor:accent+'50', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent }}/>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, marginTop:6 }}>
                    <div style={{ width:42, height:42, borderRadius:10, background:accent+'20', border:`1px solid ${accent}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Gamepad2 size={20} color={accent}/>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => setEditGame(g)}><Edit2 size={12}/></button>
                      <button className="btn btn-ghost btn-icon" style={{ color:'var(--red)' }}
                        onClick={() => { if(confirm(`Remover "${g.name}"?`)) deleteGame.mutate(g.id); }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  <p style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)', marginBottom:6 }}>{g.name}</p>
                  <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
                    {g.genre    && <span className="badge" style={{ background:accent+'18', color:accent }}>{g.genre}</span>}
                    {g.platform && <span className="badge badge-gray">{g.platform}</span>}
                  </div>
                  {g.description && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.4, marginBottom:8 }}>{g.description}</p>}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MANUTENÇÃO ── */}
      {tab==='maint' && (
        <div>
          {openMaint.length>0 && (
            <>
              <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Abertos</p>
              <div className="table-wrapper" style={{ marginBottom:'1.5rem' }}>
                <table>
                  <thead><tr><th>Equipamento</th><th>Descrição</th><th>Técnico</th><th>Custo Est.</th><th>Status</th><th>Acção</th></tr></thead>
                  <tbody>
                    {openMaint.map((m: any) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight:500 }}>{m.equipment_name}</td>
                        <td style={{ color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.description}</td>
                        <td>{m.technician||'—'}</td>
                        <td className="font-mono" style={{ fontSize:'0.85rem' }}>{m.estimated_cost ? fmt.currency(m.estimated_cost) : '—'}</td>
                        <td><MaintStatusBadge status={m.status}/></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => setCloseMaintId(m.id)}>✓ Fechar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {closedMaint.length>0 && (
            <>
              <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Fechados</p>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Equipamento</th><th>Técnico</th><th>Custo Real</th><th>Fechado em</th></tr></thead>
                  <tbody>
                    {closedMaint.map((m: any) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight:500 }}>{m.equipment_name}</td>
                        <td>{m.technician||'—'}</td>
                        <td className="font-mono" style={{ fontSize:'0.85rem' }}>{m.actual_cost ? fmt.currency(m.actual_cost) : '—'}</td>
                        <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{m.closed_at ? fmt.date(m.closed_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!mLoad && openMaint.length===0 && closedMaint.length===0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
              <Wrench size={40} style={{ margin:'0 auto 1rem', opacity:0.3, display:'block' }}/>
              <p>Sem tickets de manutenção</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <NewEquipmentModal open={newEquipOpen} onClose={() => setNewEquipOpen(false)}/>
      <NewMaintenanceModal open={newMaintOpen} onClose={() => setNewMaintOpen(false)} equipment={equipment}/>
      {closeMaintId && <CloseMaintenanceModal onClose={() => setCloseMaintId(null)} onConfirm={(cost: number|null) => closeMut.mutate({ id: closeMaintId, actual_cost: cost })}/>}
      <GameModal open={newGameOpen} onClose={() => setNewGameOpen(false)}/>
      {editGame && <GameModal open={true} game={editGame} onClose={() => setEditGame(null)}/>}
    </div>
  );
}

function GameModal({ open, onClose, game }: { open: boolean; onClose: () => void; game?: any }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({
    name: game?.name||'', genre: game?.genre||'', platform: game?.platform||'',
    description: game?.description||'',
    cover_color: game?.cover_color||'#0ea5e9',
  });
  const accent = form.cover_color||'#0ea5e9';
  const mut = useMutation({
    mutationFn: (d: any) => game ? api.put(`/games/${game.id}`, d) : api.post('/games', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); toast(game ? 'Jogo actualizado' : 'Jogo adicionado'); onClose(); },
    onError: (e: any) => toast(e.response?.data?.error||'Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title={game ? 'Editar Jogo' : 'Novo Jogo'} size="md"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.name||mut.isPending} onClick={() => mut.mutate(form)}>
          {mut.isPending ? 'A guardar...' : game ? 'Guardar' : 'Adicionar Jogo'}
        </button></>}>
      {/* Preview */}
      <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:'0.875rem', marginBottom:'1.25rem', border:`1px solid ${accent}40`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent }}/>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
          <div style={{ width:38, height:38, borderRadius:8, background:accent+'25', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Gamepad2 size={18} color={accent}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700, color:'var(--text-primary)' }}>{form.name||'Nome do Jogo'}</p>
            <div style={{ display:'flex', gap:5 }}>
              {form.genre    && <span className="badge" style={{ background:accent+'15', color:accent }}>{form.genre}</span>}
              {form.platform && <span className="badge badge-gray">{form.platform}</span>}
            </div>
          </div>
        
        </div>
      </div>
      <div className="form-group"><label className="label">Nome do Jogo *</label>
        <input className="input" placeholder="ex: FIFA 25, Call of Duty, GTA V" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <div className="form-group"><label className="label">Género</label>
          <select className="input" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
            <option value="">Seleccionar</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="label">Plataforma</label>
          <input className="input" placeholder="ex: PlayStation 5, PC, Todas" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}/>
        </div>
      </div>

      <div className="form-group"><label className="label">Descrição (opcional)</label>
        <textarea className="input" placeholder="Modo multijogador, observações..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight:60 }}/>
      </div>
      <div className="form-group">
        <label className="label">Cor do Cartão</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, cover_color: c }))}
              style={{ width:28, height:28, borderRadius:6, background:c, cursor:'pointer',
                border: form.cover_color===c ? '2px solid white' : '2px solid transparent',
                boxShadow: form.cover_color===c ? `0 0 0 2px ${c}` : 'none', transition:'all 0.1s' }}/>
          ))}
          <input type="color" value={form.cover_color} onChange={e => setForm(f => ({ ...f, cover_color: e.target.value }))}
            style={{ width:28, height:28, padding:0, border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', background:'transparent' }} title="Cor personalizada"/>
        </div>
      </div>
    </Modal>
  );
}

function NewEquipmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ name:'', category:'', serial_number:'', location:'', purchase_value:'', notes:'' });
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/equipment', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); toast('Equipamento adicionado'); onClose(); setForm({ name:'', category:'', serial_number:'', location:'', purchase_value:'', notes:'' }); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title="Novo Equipamento"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.name||mut.isPending} onClick={() => mut.mutate({ ...form, purchase_value: form.purchase_value ? Number(form.purchase_value) : null })}>
          {mut.isPending ? '...' : 'Guardar'}</button></>}>
      <div className="form-group"><label className="label">Nome *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <div className="form-group"><label className="label">Categoria</label><input className="input" placeholder="ex: Console, TV" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}/></div>
        <div className="form-group"><label className="label">Nº Serial</label><input className="input" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}/></div>
        <div className="form-group"><label className="label">Localização</label><input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}/></div>
        <div className="form-group"><label className="label">Valor de Compra (MZN)</label><input className="input font-mono" type="number" value={form.purchase_value} onChange={e => setForm(f => ({ ...f, purchase_value: e.target.value }))}/></div>
      </div>
      <div className="form-group"><label className="label">Notas</label><textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/></div>
    </Modal>
  );
}

function NewMaintenanceModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any[] }) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ equipment_id:'', equipment_name:'', description:'', technician:'', estimated_cost:'' });
  const mut = useMutation({
    mutationFn: (d: any) => api.post('/maintenance', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); qc.invalidateQueries({ queryKey: ['equipment'] }); toast('Ticket aberto'); onClose(); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title="Novo Ticket de Manutenção"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!form.equipment_name||!form.description||mut.isPending}
          onClick={() => mut.mutate({ ...form, equipment_id: form.equipment_id ? Number(form.equipment_id) : null, estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null })}>
          {mut.isPending ? '...' : 'Abrir Ticket'}</button></>}>
      <div className="form-group"><label className="label">Equipamento</label>
        <select className="input" value={form.equipment_id} onChange={e => { const eq = equipment.find((x: any) => x.id===Number(e.target.value)); setForm(f => ({ ...f, equipment_id: e.target.value, equipment_name: eq?.name||'' })); }}>
          <option value="">Seleccionar equipamento</option>
          {equipment.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      {!form.equipment_id && <div className="form-group"><label className="label">Nome do Equipamento (manual)</label><input className="input" value={form.equipment_name} onChange={e => setForm(f => ({ ...f, equipment_name: e.target.value }))}/></div>}
      <div className="form-group"><label className="label">Descrição do Problema *</label><textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <div className="form-group"><label className="label">Técnico</label><input className="input" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))}/></div>
        <div className="form-group"><label className="label">Custo Estimado (MZN)</label><input className="input font-mono" type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))}/></div>
      </div>
    </Modal>
  );
}

function CloseMaintenanceModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (cost: number|null) => void }) {
  const [cost, setCost] = useState('');
  return (
    <Modal open={true} onClose={onClose} title="Fechar Ticket" size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onConfirm(cost ? Number(cost) : null)}>Confirmar Fecho</button></>}>
      <div className="form-group"><label className="label">Custo Real (MZN)</label><input className="input font-mono" type="number" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)}/></div>
      <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>O custo será registado automaticamente como despesa no Ledger.</p>
    </Modal>
  );
}
