import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicApi } from '@/services/api-multitenant';
import { toast } from '@/hooks/use-toast';

export default function Landing() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;

    setLoading(true);
    try {
      const { exists } = await publicApi.checkTenantExists(slug);
      if (exists) {
        navigate(`/t/${slug}/login`);
      } else {
        toast({
          title: 'Organização não encontrada',
          description: `O slug "${slug}" não corresponde a nenhuma organização ativa.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao verificar a organização. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">TAgri Hub</h1>
          <p className="text-muted-foreground">Sistema Integrado de Gestão Agrícola</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso da Organização</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEnterTenant} className="space-y-4">
              <div>
                <Label htmlFor="slug">Slug da Organização</Label>
                <Input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="exemplo: fazenda-abc"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => navigate('/admin/login')}
            className="text-sm"
          >
            Sou Master Admin
          </Button>
        </div>
      </div>
    </div>
  );
}