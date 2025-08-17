import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';

export default function NewTicket() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'|'critical'>('low');
  const [body, setBody] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/suporte/tickets', { title, priority, bodyMensagemInicial: body });
    nav('/suporte');
  };

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-6">Novo Ticket</h1>
      <form onSubmit={submit} className="space-y-4 max-w-xl">
        <div>
          <label className="text-sm">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm">Prioridade</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full border rounded px-3 py-2">
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Mensagem inicial</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border rounded px-3 py-2" rows={5} />
        </div>
        <Button type="submit">Abrir</Button>
      </form>
    </main>
  );
}
