import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { masterApi } from '@/services/api-multitenant';
import { toast } from '@/hooks/use-toast';
import { Plus, Settings, LogOut } from 'lucide-react';

interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface CreateTenantForm {
  name: string;
  slug: string;
  initialFarmName: string;
  adminEmail: string;
  adminPassword: string;
  modules: string[];
}

const AVAILABLE_MODULES = [
  { key: 'solo_adubacao', label: 'Solo & Adubação' },
  { key: 'suporte', label: 'Suporte' },
  { key: 'economico', label: 'Econômico' },
  { key: 'hibridos_milho', label: 'Híbridos de Milho' },
  { key: 'pragas_doencas_milho', label: 'Pragas & Doenças' },
  { key: 'fungos_ndvi', label: 'Fungos & NDVI' }
];

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Org | null>(null);
  const [tenantModules, setTenantModules] = useState<string[]>([]);

  const [form, setForm] = useState<CreateTenantForm>({
    name: '',
    slug: '',
    initialFarmName: '',
    adminEmail: '',
    adminPassword: '',
    modules: ['suporte']
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await masterApi.get<{ orgs: Org[] }>('/tenants');
      setTenants(data.orgs || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar organizações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await masterApi.post('/tenants', form);
      toast({
        title: 'Sucesso',
        description: `Organização "${form.name}" criada com sucesso!`
      });
      setShowCreateDialog(false);
      setForm({
        name: '',
        slug: '',
        initialFarmName: '',
        adminEmail: '',
        adminPassword: '',
        modules: ['suporte']
      });
      loadTenants();
    } catch (err: any) {
      toast({
        title: 'Erro na criação',
        description: err?.error?.message || 'Falha ao criar organização',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const openModulesSheet = async (tenant: Org) => {
    setSelectedTenant(tenant);
    // Para simplicidade, assumimos que todos os módulos estão habilitados por padrão
    // Em um cenário real, você faria uma chamada para GET /tenants/:slug/modules
    setTenantModules(['suporte']);
  };

  const handleUpdateModules = async () => {
    if (!selectedTenant) return;

    try {
      await masterApi.put(`/tenants/${selectedTenant.slug}/modules`, {
        modules: tenantModules
      });
      toast({
        title: 'Módulos atualizados',
        description: `Módulos da organização "${selectedTenant.name}" foram atualizados.`
      });
      setSelectedTenant(null);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.error?.message || 'Falha ao atualizar módulos',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = () => {
    masterApi.logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Console Master</h1>
            <p className="text-muted-foreground">Gerenciamento de organizações</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Organizações</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Organização</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="exemplo: fazenda-abc"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="farmName">Nome da Fazenda</Label>
                  <Input
                    id="farmName"
                    value={form.initialFarmName}
                    onChange={(e) => setForm({ ...form, initialFarmName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="adminEmail">E-mail do Admin</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="adminPassword">Senha do Admin</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Módulos Iniciais</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_MODULES.map((module) => (
                      <div key={module.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={module.key}
                          checked={form.modules.includes(module.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm({ ...form, modules: [...form.modules, module.key] });
                            } else {
                              setForm({ ...form, modules: form.modules.filter(m => m !== module.key) });
                            }
                          }}
                        />
                        <Label htmlFor={module.key} className="text-sm">{module.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar Organização'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando organizações...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Card key={tenant.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {tenant.name}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModulesSheet(tenant)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Módulos - {selectedTenant?.name}</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 mt-6">
                          {AVAILABLE_MODULES.map((module) => (
                            <div key={module.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`sheet-${module.key}`}
                                checked={tenantModules.includes(module.key)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTenantModules([...tenantModules, module.key]);
                                  } else {
                                    setTenantModules(tenantModules.filter(m => m !== module.key));
                                  }
                                }}
                              />
                              <Label htmlFor={`sheet-${module.key}`}>{module.label}</Label>
                            </div>
                          ))}
                          <Button onClick={handleUpdateModules} className="w-full">
                            Salvar Módulos
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Slug:</strong> {tenant.slug}</div>
                    <div><strong>Criado:</strong> {new Date(tenant.created_at).toLocaleDateString()}</div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-primary"
                      onClick={() => window.open(`/t/${tenant.slug}/login`, '_blank')}
                    >
                      Acessar como tenant →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}