import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, TestTube, Calculator, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/store/auth';
import { api } from '@/services/api';

interface SoilSample {
  id: string;
  data_coleta: string;
  talhao_nome?: string;
  fazenda_nome?: string;
  profundidade_cm?: number;
  ph?: number;
  p_mehlich?: number;
  k_mehlich?: number;
  ca_cmol?: number;
  mg_cmol?: number;
  s?: number;
  ctc_cmol?: number;
  mo_g_kg?: number;
  argila_pct?: number;
  created_at: string;
}

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { me } = useAuth();

  const hasRecommendationPermission = me?.permissions?.includes('solo.recomendacao:create') ?? false;

  const { data: sample, isLoading, error } = useQuery<SoilSample>({
    queryKey: ['soil-sample', id],
    queryFn: () => api.get<SoilSample>(`/solo/amostras/${id}`),
    enabled: !!id,
  });

  const interpretLevel = (value: number | undefined, type: 'p' | 'k' | 'ph') => {
    if (!value) return { level: 'N/A', color: 'secondary', description: 'Não informado' };
    
    if (type === 'ph') {
      if (value < 5.0) return { level: 'Muito Ácido', color: 'destructive', description: 'Correção urgente necessária' };
      if (value < 5.5) return { level: 'Ácido', color: 'secondary', description: 'Recomenda-se correção' };
      if (value < 6.0) return { level: 'Moderadamente Ácido', color: 'default', description: 'Aceitável para muitas culturas' };
      if (value <= 7.0) return { level: 'Adequado', color: 'default', description: 'Ideal para a maioria das culturas' };
      if (value <= 7.5) return { level: 'Ligeiramente Alcalino', color: 'default', description: 'Ainda aceitável' };
      return { level: 'Muito Alcalino', color: 'secondary', description: 'Pode limitar alguns nutrientes' };
    }
    
    const ranges = type === 'p' 
      ? [
          { max: 6, level: 'Muito Baixo', color: 'destructive', description: 'Deficiência severa' },
          { max: 15, level: 'Baixo', color: 'secondary', description: 'Abaixo do ideal' },
          { max: 30, level: 'Médio', color: 'default', description: 'Adequado para a maioria das culturas' },
          { max: 50, level: 'Alto', color: 'default', description: 'Bom nível' },
          { level: 'Muito Alto', color: 'default', description: 'Excelente disponibilidade' }
        ]
      : [
          { max: 30, level: 'Muito Baixo', color: 'destructive', description: 'Deficiência severa' },
          { max: 60, level: 'Baixo', color: 'secondary', description: 'Abaixo do ideal' },
          { max: 120, level: 'Médio', color: 'default', description: 'Adequado para a maioria das culturas' },
          { max: 180, level: 'Alto', color: 'default', description: 'Bom nível' },
          { level: 'Muito Alto', color: 'default', description: 'Excelente disponibilidade' }
        ];
    
    for (const range of ranges) {
      if (range.max && value <= range.max) return range;
    }
    return ranges[ranges.length - 1];
  };

  if (isLoading) {
    return (
      <div className="container py-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando amostra...</p>
      </div>
    );
  }

  if (error || !sample) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Amostra não encontrada</h1>
        <Button onClick={() => navigate('/solo/amostras')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const phLevel = interpretLevel(sample.ph, 'ph');
  const pLevel = interpretLevel(sample.p_mehlich, 'p');
  const kLevel = interpretLevel(sample.k_mehlich, 'k');

  return (
    <div className="container py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8" />
            Detalhes da Amostra
          </h1>
          <p className="text-muted-foreground">
            Coletada em {new Date(sample.data_coleta).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {hasRecommendationPermission && (
          <Button asChild>
            <Link to={`/solo/recomendacoes/nova?amostra_id=${sample.id}`}>
              <Calculator className="h-4 w-4 mr-2" />
              Gerar Recomendação
            </Link>
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações Gerais */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informações Gerais</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Data de Coleta:</span>
              <span className="ml-2">{new Date(sample.data_coleta).toLocaleDateString('pt-BR')}</span>
            </div>
            {sample.fazenda_nome && (
              <div>
                <span className="font-medium">Fazenda:</span>
                <span className="ml-2">{sample.fazenda_nome}</span>
              </div>
            )}
            {sample.talhao_nome && (
              <div>
                <span className="font-medium">Talhão:</span>
                <span className="ml-2">{sample.talhao_nome}</span>
              </div>
            )}
            {sample.profundidade_cm && (
              <div>
                <span className="font-medium">Profundidade:</span>
                <span className="ml-2">{sample.profundidade_cm} cm</span>
              </div>
            )}
          </div>
        </Card>

        {/* Análise Química */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Análise Química</h2>
          <div className="space-y-4">
            {sample.ph && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">pH:</span>
                  <span className="ml-2">{sample.ph}</span>
                </div>
                <div className="text-right">
                  <Badge variant={phLevel.color as any}>{phLevel.level}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{phLevel.description}</div>
                </div>
              </div>
            )}

            {sample.p_mehlich && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">P Mehlich:</span>
                  <span className="ml-2">{sample.p_mehlich} mg/dm³</span>
                </div>
                <div className="text-right">
                  <Badge variant={pLevel.color as any}>{pLevel.level}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{pLevel.description}</div>
                </div>
              </div>
            )}

            {sample.k_mehlich && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">K Mehlich:</span>
                  <span className="ml-2">{sample.k_mehlich} mg/dm³</span>
                </div>
                <div className="text-right">
                  <Badge variant={kLevel.color as any}>{kLevel.level}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{kLevel.description}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Nutrientes Secundários */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Nutrientes Secundários</h2>
          <div className="space-y-3">
            {sample.ca_cmol && (
              <div>
                <span className="font-medium">Cálcio (Ca):</span>
                <span className="ml-2">{sample.ca_cmol} cmolc/dm³</span>
              </div>
            )}
            {sample.mg_cmol && (
              <div>
                <span className="font-medium">Magnésio (Mg):</span>
                <span className="ml-2">{sample.mg_cmol} cmolc/dm³</span>
              </div>
            )}
            {sample.s && (
              <div>
                <span className="font-medium">Enxofre (S):</span>
                <span className="ml-2">{sample.s} mg/dm³</span>
              </div>
            )}
            {sample.ctc_cmol && (
              <div>
                <span className="font-medium">CTC:</span>
                <span className="ml-2">{sample.ctc_cmol} cmolc/dm³</span>
              </div>
            )}
          </div>
        </Card>

        {/* Propriedades Físicas */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Propriedades Físicas</h2>
          <div className="space-y-3">
            {sample.mo_g_kg && (
              <div>
                <span className="font-medium">Matéria Orgânica:</span>
                <span className="ml-2">{sample.mo_g_kg} g/kg</span>
              </div>
            )}
            {sample.argila_pct && (
              <div>
                <span className="font-medium">Argila:</span>
                <span className="ml-2">{sample.argila_pct}%</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Amostra registrada em {new Date(sample.created_at).toLocaleDateString('pt-BR')}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link to={`/solo/amostras/${sample.id}/edit`}>
              Editar
            </Link>
          </Button>
          {hasRecommendationPermission && (
            <Button asChild>
              <Link to={`/solo/recomendacoes/nova?amostra_id=${sample.id}`}>
                <Calculator className="h-4 w-4 mr-2" />
                Gerar Recomendação
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}