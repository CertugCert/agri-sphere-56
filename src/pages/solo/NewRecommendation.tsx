import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/store/auth';
import { api } from '@/services/api';

const recommendationSchema = z.object({
  amostra_id: z.string().uuid('ID da amostra inválido'),
  objetivo_produtividade: z.coerce.number().positive('Objetivo deve ser positivo').default(150),
  parametros: z.object({}).optional(),
});

type RecommendationFormData = z.infer<typeof recommendationSchema>;

interface SoilSample {
  id: string;
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

export default function NewRecommendation() {
  const { me } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedSampleId = searchParams.get('amostra_id');
  
  const form = useForm<RecommendationFormData>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      amostra_id: preSelectedSampleId || '',
      objetivo_produtividade: 150,
    },
  });

  const selectedSampleId = form.watch('amostra_id');

  const { data: samples } = useQuery<SoilSample[]>({
    queryKey: ['soil-samples-simple'],
    queryFn: () => api.get<{ data: SoilSample[] }>('/solo/amostras?limit=100').then(r => r.data),
  });

  const { data: selectedSample } = useQuery<SoilSample>({
    queryKey: ['soil-sample', selectedSampleId],
    queryFn: () => api.get<SoilSample>(`/solo/amostras/${selectedSampleId}`),
    enabled: !!selectedSampleId,
  });

  const createMutation = useMutation({
    mutationFn: (data: RecommendationFormData) => api.post('/solo/recomendacoes', data),
    onSuccess: (response: any) => {
      toast({
        title: 'Sucesso',
        description: 'Recomendação gerada com sucesso',
      });
      navigate(`/solo/recomendacoes/${response.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.error?.message || 'Erro ao gerar recomendação',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RecommendationFormData) => {
    createMutation.mutate(data);
  };

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

  if (!me?.permissions?.includes('solo.recomendacao:create')) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para criar recomendações.</p>
      </div>
    );
  }

  const pLevel = interpretLevel(selectedSample?.p_mehlich, 'p');
  const kLevel = interpretLevel(selectedSample?.k_mehlich, 'k');

  return (
    <div className="container py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Nova Recomendação
          </h1>
          <p className="text-muted-foreground">Gere uma recomendação de adubação baseada na análise de solo</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Parâmetros da Recomendação</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amostra_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amostra de Solo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma amostra" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {samples?.map((sample) => (
                          <SelectItem key={sample.id} value={sample.id}>
                            {new Date(sample.data_coleta).toLocaleDateString('pt-BR')} - {sample.talhao_nome || 'Sem talhão'} 
                            {sample.fazenda_nome && ` (${sample.fazenda_nome})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objetivo_produtividade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo de Produtividade (sc/ha)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        step="1"
                        placeholder="150" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-sm text-muted-foreground">
                      Sacas por hectare esperadas para a cultura do milho
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !selectedSampleId}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? 'Gerando...' : 'Gerar Recomendação'}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {selectedSample && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Dados da Amostra Selecionada</h2>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Data de Coleta:</span>
                <span className="ml-2">{new Date(selectedSample.data_coleta).toLocaleDateString('pt-BR')}</span>
              </div>
              
              {selectedSample.fazenda_nome && (
                <div>
                  <span className="font-medium">Fazenda:</span>
                  <span className="ml-2">{selectedSample.fazenda_nome}</span>
                </div>
              )}
              
              {selectedSample.talhao_nome && (
                <div>
                  <span className="font-medium">Talhão:</span>
                  <span className="ml-2">{selectedSample.talhao_nome}</span>
                </div>
              )}

              {selectedSample.ph && (
                <div>
                  <span className="font-medium">pH:</span>
                  <span className="ml-2">{selectedSample.ph}</span>
                </div>
              )}

              {selectedSample.p_mehlich && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">P Mehlich:</span>
                    <span className="ml-2">{selectedSample.p_mehlich} mg/dm³</span>
                  </div>
                  <Badge variant={pLevel.color as any}>{pLevel.level}</Badge>
                </div>
              )}

              {selectedSample.k_mehlich && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">K Mehlich:</span>
                    <span className="ml-2">{selectedSample.k_mehlich} mg/dm³</span>
                  </div>
                  <Badge variant={kLevel.color as any}>{kLevel.level}</Badge>
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Previsão de Recomendação</h3>
                <div className="text-sm text-muted-foreground">
                  A recomendação será calculada automaticamente baseada nos níveis de nutrientes da amostra e no objetivo de produtividade informado.
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}