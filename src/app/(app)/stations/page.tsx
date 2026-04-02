'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Edit2, Trash2, PowerOff } from 'lucide-react';

export default function StationsPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [editStation, setEditStation] = useState<any>(null);

  const { data: stations = [], isLoading } = useQuery({ queryKey: ['stations-all'], queryFn: () => api.get('/stations').then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/stations/${id}`),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['stations-all'] }); toast('Estação removida/desactivada'); },
    onError: () => toast('Erro ao remover', 'error'),
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Estações</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestão de estações de jogo</p></div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Nova Estação</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Consola</th><th>Descrição</th><th>Status</th><th>Acções</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>A carregar...</td></tr>}
            {stations.map((s: any) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{s.console || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.description || '—'}</td>
                <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Activa' : 'Inactiva'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditStation(s)}><Edit2 size={12} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Remover "${s.name}"?`)) deleteMut.mutate(s.id); }}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StationModal open={newOpen} onClose={() => setNewOpen(false)} />
      {editStation && <StationModal open={true} station={editStation} onClose={() => setEditStation(null)} />}
    </div>
  );
}

function StationModal({ open, onClose, station }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ name: station?.name || '', console: station?.console || '', description: station?.description || '', is_active: station?.is_active ?? true });
  const mut = useMutation({
    mutationFn: (d: any) => station ? api.put(`/stations/${station.id}`, d) : api.post('/stations', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stations-all'] }); qc.invalidateQueries({ queryKey: ['stations-status'] }); toast(station ? 'Actualizado' : 'Criado'); onClose(); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title={station ? 'Editar Estação' : 'Nova Estação'} size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!form.name || mut.isPending} onClick={() => mut.mutate(form)}>{mut.isPending ? '...' : 'Guardar'}</button></>}>
      <div className="form-group"><label className="label">Nome *</label><input className="input" placeholder="ex: Station 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="form-group"><label className="label">Consola</label><input className="input" placeholder="ex: PlayStation 5, Xbox Series X" value={form.console} onChange={e => setForm(f => ({ ...f, console: e.target.value }))} /></div>
      <div className="form-group"><label className="label">Descrição</label><input className="input" placeholder="ex: TV Samsung 55&quot;" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      {station && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="is_active" className="label" style={{ margin: 0, cursor: 'pointer' }}>Activa</label>
        </div>
      )}
    </Modal>
  );
}
