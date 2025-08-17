import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tenantApi } from '@/services/api-multitenant';
import { toast } from '@/hooks/use-toast';
import { 
  Sprout, 
  HeadphonesIcon, 
  TrendingUp, 
  Wheat, 
  Bug, 
  Activity,
  LogOut 
} from 'lucide-react';

interface TenantMe {
  user: { id: string; empresa_id: string; nome: string; email: string };
  roles: string[];
  permissions: string[];
  allowedModules: string[];
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  moduleKey: string;
  allowedModules: string[];
  slug: string;
}

function ModuleCard({ title, description, icon, path, moduleKey, allowedModules, slug }: ModuleCardProps) {
  const navigate = useNavigate();
  const isEnabled = allowedModules.includes(moduleKey);
  
  const handleClick = () => {
    if (isEnabled) {
      navigate(`/t/${slug}${path}`);
    }
  };

  return (
    <Card 
      className={`transition-all cursor-pointer ${
        isEnabled 
          ? 'hover:shadow-lg hover:scale-105' 
          : 'opacity-50 cursor-not-allowed bg-muted'
      }`}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        {!isEnabled && (
          <p className="text-xs text-destructive mt-2">Módulo não habilitado</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TenantHome() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [me, setMe] = useState<TenantMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchMe = async () => {
      try {
        const data = await tenantApi.get<TenantMe>('/me', slug);
        setMe(data);
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar informações do usuário',
          variant: 'destructive'
        });
        navigate(`/t/${slug}/login`);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [slug, navigate]);

  const handleLogout = () => {
    if (slug) {
      tenantApi.logout(slug);
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!me || !slug) {
    return null;
  }

  const modules = [
    {
      title: 'Solo & Adubação',
      description: 'Análises de solo e recomendações de adubação',
      icon: <Sprout className="h-6 w-6" />,
      path: '/solo',
      moduleKey: 'solo_adubacao'
    },
    {
      title: 'Suporte',
      description: 'Abrir tickets e acompanhar atendimentos',
      icon: <HeadphonesIcon className="h-6 w-6" />,
      path: '/suporte',
      moduleKey: 'suporte'
    },
    {
      title: 'Econômico',
      description: 'KPIs e lançamentos financeiros',
      icon: <TrendingUp className="h-6 w-6" />,
      path: '/economico',
      moduleKey: 'economico'
    },
    {
      title: 'Híbridos de Milho',
      description: 'Catálogo e recomendações de híbridos',
      icon: <Wheat className="h-6 w-6" />,
      path: '/hibridos',
      moduleKey: 'hibridos_milho'
    },
    {
      title: 'Pragas & Doenças',
      description: 'Monitoramento e controle de pragas',
      icon: <Bug className="h-6 w-6" />,
      path: '/pragas-doencas',
      moduleKey: 'pragas_doencas_milho'
    },
    {
      title: 'Fungos & NDVI',
      description: 'Análises de fungos e índices de vegetação',
      icon: <Activity className="h-6 w-6" />,
      path: '/fungos-ndvi',
      moduleKey: 'fungos_ndvi'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">TAgri Hub</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {me.user.nome} • {slug}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Módulos Disponíveis</h2>
          <p className="text-muted-foreground">
            Selecione um módulo para começar a trabalhar
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.moduleKey}
              title={module.title}
              description={module.description}
              icon={module.icon}
              path={module.path}
              moduleKey={module.moduleKey}
              allowedModules={me.allowedModules}
              slug={slug}
            />
          ))}
        </div>

        {me.allowedModules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum módulo habilitado para sua conta.
              <br />
              Entre em contato com o administrador.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}