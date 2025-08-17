import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Calendar, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/store/auth';
import { api } from '@/services/api';

interface SoilSample {
  id: string;
  data_coleta: string;
  talhao_nome?: string;
  fazenda_nome?: string;
  ph?: number;
  p_mehlich?: number;
  k_mehlich?: number;
  created_at: string;
}

interface SoilSamplesResponse {
  data: SoilSample[];
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
}

export default function SoilSamplesList() {
  const { me } = useAuth();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    from: '',
    to: '',
    talhao_id: ''
  });

  const hasCreatePermission = me?.permissions?.includes('solo.amostras:create') ?? false;
  const hasDeletePermission = me?.permissions?.includes('solo.amostras:delete') ?? false;

  const { data, isLoading, error } = useQuery<SoilSamplesResponse>({
    queryKey: ['soil-samples', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          params.append(key, String(value));
        }
      });
      return api.get<SoilSamplesResponse>(`/solo/amostras?${params}`);
    },
  });

  const interpretLevel = (value: number | undefined, type: 'p' | 'k') => {
    if (!value) return { level: 'N/A', color: 'secondary' };
    
    const ranges = type === 'p' 
      ? [{ max: 6, level: 'Muito Baixo', color: 'destructive' }, { max: 15, level: 'Baixo', color: 'secondary' }, { max: 30, level: 'Médio', color: 'default' }, { max: 50, level: 'Alto', color: 'default' }, { level: 'Muito Alto', color: 'default' }]
      : [{ max: 30, level: 'Muito Baixo', color: 'destructive' }, { max: 60, level: 'Baixo', color: 'secondary' }, { max: 120, level: 'Médio', color: 'default' }, { max: 180, level: 'Alto', color: 'default' }, { level: 'Muito Alto', color: 'default' }];
    
    for (const range of ranges) {
      if (range.max && value <= range.max) return range;
    }
    return ranges[ranges.length - 1];
  };

  if (!me?.allowedModules?.includes('solo_adubacao')) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar o módulo Solo/Adubação.</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8" />
            Amostras de Solo
          </h1>
          <p className="text-muted-foreground">Gerencie suas análises de solo</p>
        </div>
        {hasCreatePermission && (
          <Button asChild>
            <Link to="/solo/amostras/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Amostra
            </Link>
          </Button>
        )}
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Input
          type="date"
          placeholder="Data inicial"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })}
        />
        <Input
          type="date"
          placeholder="Data final"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })}
        />
        <Select value={filters.limit.toString()} onValueChange={(v) => setFilters({ ...filters, limit: Number(v), page: 1 })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 por página</SelectItem>
            <SelectItem value="20">20 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando amostras...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-destructive">Erro ao carregar amostras</p>
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-10">
          <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma amostra encontrada</p>
          {hasCreatePermission && (
            <Button asChild className="mt-4">
              <Link to="/solo/amostras/nova">Criar primeira amostra</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.data.map((sample) => {
              const pLevel = interpretLevel(sample.p_mehlich, 'p');
              const kLevel = interpretLevel(sample.k_mehlich, 'k');

              return (
                <Card key={sample.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(sample.data_coleta).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/solo/amostras/${sample.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {hasDeletePermission && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Fazenda:</span> {sample.fazenda_nome || 'N/A'}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Talhão:</span> {sample.talhao_nome || 'N/A'}
                    </div>
                    {sample.ph && (
                      <div className="text-sm">
                        <span className="font-medium">pH:</span> {sample.ph}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {sample.p_mehlich && (
                      <Badge variant={pLevel.color as any}>
                        P: {sample.p_mehlich} ({pLevel.level})
                      </Badge>
                    )}
                    {sample.k_mehlich && (
                      <Badge variant={kLevel.color as any}>
                        K: {sample.k_mehlich} ({kLevel.level})
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {data.pagination.pages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Anterior
              </Button>
              <span className="flex items-center px-4">
                Página {filters.page} de {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                disabled={filters.page >= data.pagination.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}