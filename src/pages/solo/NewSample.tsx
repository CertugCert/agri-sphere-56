import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TestTube, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/store/auth';
import { api } from '@/services/api';

const sampleSchema = z.object({
  talhao_id: z.string().optional(),
  data_coleta: z.string().min(1, 'Data de coleta é obrigatória'),
  profundidade_cm: z.coerce.number().positive().optional(),
  ph: z.coerce.number().min(0).max(14).optional(),
  p_mehlich: z.coerce.number().min(0).optional(),
  k_mehlich: z.coerce.number().min(0).optional(),
  ca_cmol: z.coerce.number().min(0).optional(),
  mg_cmol: z.coerce.number().min(0).optional(),
  s: z.coerce.number().min(0).optional(),
  ctc_cmol: z.coerce.number().min(0).optional(),
  mo_g_kg: z.coerce.number().min(0).optional(),
  argila_pct: z.coerce.number().min(0).max(100).optional(),
});

type SampleFormData = z.infer<typeof sampleSchema>;

interface Talhao {
  id: string;
  nome: string;
  fazenda_nome?: string;
}

export default function NewSample() {
  const { me } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<SampleFormData>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      data_coleta: new Date().toISOString().split('T')[0],
      profundidade_cm: 20,
    },
  });

  const { data: talhoes } = useQuery<Talhao[]>({
    queryKey: ['talhoes'],
    queryFn: () => api.get<{ data: Talhao[] }>('/base/talhoes').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: SampleFormData) => api.post('/solo/amostras', data),
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Amostra criada com sucesso',
      });
      navigate('/solo/amostras');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error?.error?.message || 'Erro ao criar amostra',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SampleFormData) => {
    // Remove campos vazios
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
    );
    createMutation.mutate(cleanData as SampleFormData);
  };

  if (!me?.permissions?.includes('solo.amostras:create')) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para criar amostras.</p>
      </div>
    );
  }

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
            Nova Amostra de Solo
          </h1>
          <p className="text-muted-foreground">Registre uma nova análise de solo</p>
        </div>
      </header>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="data_coleta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Coleta *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="talhao_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talhão</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um talhão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {talhoes?.map((talhao) => (
                          <SelectItem key={talhao.id} value={talhao.id}>
                            {talhao.nome} {talhao.fazenda_nome && `(${talhao.fazenda_nome})`}
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
                name="profundidade_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profundidade (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ph"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>pH</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="14" 
                        placeholder="6.5" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="p_mehlich"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>P Mehlich (mg/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="15.2" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="k_mehlich"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>K Mehlich (mg/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="85.0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ca_cmol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ca (cmolc/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="2.8" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mg_cmol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mg (cmolc/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="0.9" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="s"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>S (mg/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="8.2" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ctc_cmol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTC (cmolc/dm³)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="6.5" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mo_g_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>M.O. (g/kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        placeholder="28.5" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="argila_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Argila (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="100" 
                        placeholder="45.0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Salvando...' : 'Salvar Amostra'}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}