import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';

export type Ticket = {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_user' | 'solved' | 'closed';
  created_at: string;
};

export default function SupportList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ items: Ticket[] }>(`/suporte/tickets?mine=false&page=1&limit=20`);
        setTickets(data.items);
      } catch {
        setTickets([]);
      }
    })();
  }, []);

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Chamados</h1>
        <Button asChild>
          <Link to="/suporte/novo">Novo Ticket</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Link key={t.id} to={`/suporte/${t.id}`} className="block rounded-md border p-4 hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.title}</div>
              <div className="text-sm text-muted-foreground">{t.status} • {t.priority}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString()}</div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <div className="text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
        )}
      </div>
    </main>
  );
}
