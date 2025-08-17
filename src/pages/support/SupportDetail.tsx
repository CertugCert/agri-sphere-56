import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';

export default function SupportDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const data = await api.get<{ ticket: any; messages: any[] }>(`/suporte/tickets/${id}`);
        setTicket(data.ticket);
        setMessages(data.messages);
      } catch {
        // ignore
      }
    })();
  }, [id]);

  const sendMessage = async () => {
    if (!id || !body.trim()) return;
    try {
      await api.post(`/suporte/tickets/${id}/messages`, { body });
      setBody('');
      const data = await api.get<{ ticket: any; messages: any[] }>(`/suporte/tickets/${id}`);
      setMessages(data.messages);
    } catch {}
  };

  if (!ticket) return <main className="container py-8">Carregando…</main>;

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-4">{ticket.title}</h1>
      <div className="text-sm text-muted-foreground mb-6">{ticket.status} • {ticket.priority}</div>

      <div className="space-y-3 mb-6">
        {messages.map((m) => (
          <div key={m.id} className="rounded-md border p-3">
            <div className="text-sm">{m.body}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva uma mensagem" />
        <Button onClick={sendMessage}>Enviar</Button>
      </div>
    </main>
  );
}
