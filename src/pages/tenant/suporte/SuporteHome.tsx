import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequireModule } from '@/guards/RequireModule';
import { Plus, Inbox, User } from 'lucide-react';

export default function SuporteHome() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <RequireModule module="suporte">
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Suporte</h1>
                <p className="text-muted-foreground">Gestão de tickets e atendimento</p>
              </div>
              <Button asChild>
                <Link to={`/t/${slug}/suporte/novo`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Ticket
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="flex-1">Meus Tickets</CardTitle>
                <User className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Visualize e acompanhe seus tickets abertos
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/t/${slug}/suporte/meus`}>
                    Ver Meus Tickets
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="flex-1">Inbox</CardTitle>
                <Inbox className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Tickets para atendimento (apenas suporte/admin)
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/t/${slug}/suporte/inbox`}>
                    Ver Inbox
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="flex-1">Novo Ticket</CardTitle>
                <Plus className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Abrir um novo ticket de suporte
                </p>
                <Button asChild className="w-full">
                  <Link to={`/t/${slug}/suporte/novo`}>
                    Abrir Ticket
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Button variant="outline" asChild>
              <Link to={`/t/${slug}/home`}>
                ← Voltar ao Hub
              </Link>
            </Button>
          </div>
        </main>
      </div>
    </RequireModule>
  );
}