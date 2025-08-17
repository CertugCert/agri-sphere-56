import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { masterApi } from '@/services/api-multitenant';
import { toast } from '@/hooks/use-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@master.com');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await masterApi.login(email, password);
      toast({
        title: 'Login realizado',
        description: 'Bem-vindo ao console master!'
      });
      navigate('/admin/tenants');
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
    <div className="min-h-screen bg-gradient-to-br from-destructive/10 to-orange-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Console Master</CardTitle>
            <p className="text-sm text-muted-foreground">Acesso administrativo</p>
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
                {loading ? 'Entrando...' : 'Entrar como Master'}
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