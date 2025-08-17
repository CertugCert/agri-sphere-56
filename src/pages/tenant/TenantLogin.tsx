import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tenantApi } from '@/services/api-multitenant';
import { toast } from '@/hooks/use-toast';

export default function TenantLogin() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    setLoading(true);
    try {
      await tenantApi.login(slug, email, password);
      toast({
        title: 'Login realizado',
        description: `Bem-vindo à organização ${slug}!`
      });
      navigate(`/t/${slug}/home`);
    } catch (err: any) {
      toast({
        title: 'Falha no login',
        description: err?.error?.message || 'Credenciais inválidas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Entrar na Organização</CardTitle>
            <p className="text-sm text-muted-foreground">
              {slug && (
                <>Organização: <span className="font-mono">{slug}</span></>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-4">
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-sm"
          >
            ← Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}