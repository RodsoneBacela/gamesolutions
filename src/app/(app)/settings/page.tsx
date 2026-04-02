'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/client';
import { fmt } from '@/lib/fmt';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient(); const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [editRate, setEditRate] = useState<any>(null);

  const { data: rates = [], isLoading } = useQuery({ queryKey: ['rates'], queryFn: () => api.get('/rates').then(r => r.data) });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/rates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); toast('Tarifa removida'); },
    onError: () => toast('Erro', 'error'),
  });

  const soloRates = rates.filter((r: any) => r.mode === 'Solo');
  const duoRates  = rates.filter((r: any) => r.mode === 'Accompanied');

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Tarifas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configuração de preços</p></div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Nova Tarifa</button>
      </div>

      {(['Solo', 'Accompanied'] as const).map(mode => {
        const list = mode === 'Solo' ? soloRates : duoRates;
        return (
          <div key={mode} style={{ marginBottom: '2rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: mode === 'Solo' ? 'var(--brand)' : 'var(--purple)' }}>
              {mode === 'Solo' ? '⚡ Solo' : '👥 Acompanhado'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {list.map((r: any) => (
                <div key={r.id} className="card" style={{ position: 'relative' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{r.name}</p>
                  <p className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: mode === 'Solo' ? 'var(--brand)' : 'var(--purple)' }}>{fmt.currency(r.amount)}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmt.duration(r.duration_min)}</p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditRate(r)}><Edit2 size={11} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Remover tarifa?')) deleteMut.mutate(r.id); }}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <RateModal open={newOpen} onClose={() => setNewOpen(false)} />
      {editRate && <RateModal open={true} rate={editRate} onClose={() => setEditRate(null)} />}
    </div>
  );
}

function RateModal({ open, onClose, rate }: any) {
  const qc = useQueryClient(); const { toast } = useToast();
  const [form, setForm] = useState({ name: rate?.name || '', duration_min: rate?.duration_min || 60, amount: rate?.amount || '', mode: rate?.mode || 'Solo' });
  const mut = useMutation({
    mutationFn: (d: any) => rate ? api.put(`/rates/${rate.id}`, d) : api.post('/rates', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); toast(rate ? 'Actualizado' : 'Criado'); onClose(); },
    onError: () => toast('Erro', 'error'),
  });
  return (
    <Modal open={open} onClose={onClose} title={rate ? 'Editar Tarifa' : 'Nova Tarifa'} size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!form.name || !form.amount || mut.isPending} onClick={() => mut.mutate({ ...form, duration_min: Number(form.duration_min), amount: Number(form.amount) })}>{mut.isPending ? '...' : 'Guardar'}</button></>}>
      <div className="form-group"><label className="label">Nome *</label><input className="input" placeholder="ex: Solo 1h" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label className="label">Modo</label>
          <select className="input" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
            <option value="Solo">Solo</option><option value="Accompanied">Acompanhado</option>
          </select>
        </div>
        <div className="form-group"><label className="label">Duração (min)</label><input className="input font-mono" type="number" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: Number(e.target.value) }))} /></div>
        <div className="form-group"><label className="label">Preço (MZN)</label><input className="input font-mono" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
