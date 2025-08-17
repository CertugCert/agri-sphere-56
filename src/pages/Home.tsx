import { useAuth } from '@/store/auth';
import { ModuleCard } from '@/components/ModuleCard';
import InstallPWAButton from '@/components/InstallPWAButton';

export default function Home() {
  const { me, logout } = useAuth();
  const allowed = new Set(me?.allowedModules || []);

  return (
    <main className="min-h-screen container py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">TAgri — Hub</h1>
          <p className="text-muted-foreground">Bem-vindo, {me?.user.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <InstallPWAButton />
          <button onClick={logout} className="underline text-sm">Sair</button>
        </div>
      </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard title="Suporte" description="Abra e acompanhe seus chamados" to="/suporte" disabled={!allowed.has('suporte')} />
        <ModuleCard title="Híbridos de Milho" description="Catálogo e recomendações" to="#" disabled={!allowed.has('hibridos_milho')} />
        <ModuleCard title="Solo & Adubação" description="Amostras e recomendações" to="/solo/amostras" disabled={!allowed.has('solo_adubacao')} />
        <ModuleCard title="Pragas & Doenças" description="Monitoramentos e controles" to="#" disabled={!allowed.has('pragas_doencas_milho')} />
        <ModuleCard title="Fungos & NDVI" description="Análises e relatórios" to="#" disabled={!allowed.has('fungos_ndvi')} />
        <ModuleCard title="Econômico" description="KPIs e lançamentos" to="#" disabled={!allowed.has('economico')} />
      </section>
    </main>
  );
}
