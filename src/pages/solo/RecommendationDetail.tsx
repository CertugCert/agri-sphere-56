import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/store/auth';
import { api } from '@/services/api';

interface Recommendation {
  id: string;
  cultura: string;
  objetivo_produtividade: number;
  npk_kg_ha: {
    N: number;
    P2O5: number;
    K2O: number;
  };
  calagem_t_ha?: number;
  gessagem_t_ha?: number;
  gerada_por_nome: string;
  gerada_em: string;
  // Dados da amostra
  data_coleta: string;
  talhao_nome?: string;
  fazenda_nome?: string;
  ph?: number;
  p_mehlich?: number;
  k_mehlich?: number;
  ca_cmol?: number;
  mg_cmol?: number;
  s?: number;
  ctc_cmol?: number;
  mo_g_kg?: number;
  argila_pct?: number;
}

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { me } = useAuth();
  const { toast } = useToast();

  const hasExportPermission = me?.permissions?.includes('solo.recomendacao:export') ?? false;

  const { data: recommendation, isLoading, error } = useQuery<Recommendation>({
    queryKey: ['soil-recommendation', id],
    queryFn: () => api.get<Recommendation>(`/solo/recomendacoes/${id}`),
    enabled: !!id,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/solo/recomendacoes/${id}/export/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      return response.blob();
    },
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recomendacao-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'PDF baixado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.error?.message || 'Erro ao gerar PDF',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando recomendação...</p>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Recomendação não encontrada</h1>
        <Button onClick={() => navigate('/solo/amostras')}>
          Voltar para amostras
        </Button>
      </div>
    );
  }

  const interpretLevel = (value: number | undefined, type: 'p' | 'k' | 'ph') => {
    if (!value) return { level: 'N/A', color: 'secondary' };
    
    if (type === 'ph') {
      if (value < 5.0) return { level: 'Muito Ácido', color: 'destructive' };
      if (value < 5.5) return { level: 'Ácido', color: 'secondary' };
      if (value < 6.0) return { level: 'Moderadamente Ácido', color: 'default' };
      if (value <= 7.0) return { level: 'Adequado', color: 'default' };
      if (value <= 7.5) return { level: 'Ligeiramente Alcalino', color: 'default' };
      return { level: 'Muito Alcalino', color: 'secondary' };
    }
    
    const ranges = type === 'p' 
      ? [{ max: 6, level: 'Muito Baixo', color: 'destructive' }, { max: 15, level: 'Baixo', color: 'secondary' }, { max: 30, level: 'Médio', color: 'default' }, { max: 50, level: 'Alto', color: 'default' }, { level: 'Muito Alto', color: 'default' }]
      : [{ max: 30, level: 'Muito Baixo', color: 'destructive' }, { max: 60, level: 'Baixo', color: 'secondary' }, { max: 120, level: 'Médio', color: 'default' }, { max: 180, level: 'Alto', color: 'default' }, { level: 'Muito Alto', color: 'default' }];
    
    for (const range of ranges) {
      if (range.max && value <= range.max) return range;
    }
    return ranges[ranges.length - 1];
  };

  const phLevel = interpretLevel(recommendation.ph, 'ph');
  const pLevel = interpretLevel(recommendation.p_mehlich, 'p');
  const kLevel = interpretLevel(recommendation.k_mehlich, 'k');

  return (
    <div className="container py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Recomendação de Adubação
          </h1>
          <p className="text-muted-foreground">
            Gerada por {recommendation.gerada_por_nome} em {new Date(recommendation.gerada_em).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {hasExportPermission && (
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recomendação NPK */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Recomendação NPK
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{recommendation.npk_kg_ha.N}</div>
                <div className="text-sm font-medium text-blue-600">kg/ha</div>
                <div className="text-xs text-blue-500 mt-1">Nitrogênio (N)</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{recommendation.npk_kg_ha.P2O5}</div>
                <div className="text-sm font-medium text-orange-600">kg/ha</div>
                <div className="text-xs text-orange-500 mt-1">Fósforo (P₂O₅)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="text-2xl font-bold text-red-700">{recommendation.npk_kg_ha.K2O}</div>
                <div className="text-sm font-medium text-red-600">kg/ha</div>
                <div className="text-xs text-red-500 mt-1">Potássio (K₂O)</div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cultura:</span>
                <Badge variant="outline">{recommendation.cultura}</Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-medium">Objetivo:</span>
                <span>{recommendation.objetivo_produtividade} sc/ha</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Correção do Solo */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Correção do Solo</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">Calagem</span>
                <span className="text-lg font-bold text-green-700">
                  {recommendation.calagem_t_ha || 0} t/ha
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                {recommendation.calagem_t_ha ? 'Aplicar conforme recomendação' : 'Não necessária'}
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">Gessagem</span>
                <span className="text-lg font-bold text-purple-700">
                  {recommendation.gessagem_t_ha || 0} t/ha
                </span>
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {recommendation.gessagem_t_ha ? 'Aplicar conforme recomendação' : 'Não necessária'}
              </div>
            </div>
          </div>
        </Card>

        {/* Informações da Amostra */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Dados da Amostra</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Data de Coleta:</span>
              <span className="ml-2">{new Date(recommendation.data_coleta).toLocaleDateString('pt-BR')}</span>
            </div>
            {recommendation.fazenda_nome && (
              <div>
                <span className="font-medium">Fazenda:</span>
                <span className="ml-2">{recommendation.fazenda_nome}</span>
              </div>
            )}
            {recommendation.talhao_nome && (
              <div>
                <span className="font-medium">Talhão:</span>
                <span className="ml-2">{recommendation.talhao_nome}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Análise Química Resumida */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Análise Química</h2>
          <div className="space-y-3">
            {recommendation.ph && (
              <div className="flex items-center justify-between">
                <span className="font-medium">pH: {recommendation.ph}</span>
                <Badge variant={phLevel.color as any}>{phLevel.level}</Badge>
              </div>
            )}
            {recommendation.p_mehlich && (
              <div className="flex items-center justify-between">
                <span className="font-medium">P: {recommendation.p_mehlich} mg/dm³</span>
                <Badge variant={pLevel.color as any}>{pLevel.level}</Badge>
              </div>
            )}
            {recommendation.k_mehlich && (
              <div className="flex items-center justify-between">
                <span className="font-medium">K: {recommendation.k_mehlich} mg/dm³</span>
                <Badge variant={kLevel.color as any}>{kLevel.level}</Badge>
              </div>
            )}
            {recommendation.mo_g_kg && (
              <div>
                <span className="font-medium">M.O.:</span>
                <span className="ml-2">{recommendation.mo_g_kg} g/kg</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-4">
          Esta recomendação é baseada na análise de solo e deve ser validada por um profissional habilitado.
        </div>
        {hasExportPermission && (
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Gerando PDF...' : 'Baixar Relatório Completo'}
          </Button>
        )}
      </div>
    </div>
  );
}