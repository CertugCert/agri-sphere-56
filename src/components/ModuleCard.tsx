import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ModuleCard({ title, description, to, disabled }: { title: string; description: string; to: string; disabled?: boolean }) {
  const content = (
    <Card
      className={cn(
        'group relative overflow-hidden p-6 transition-all hover:shadow-lg',
        disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
      )}
    >
      <div className="text-2xl font-semibold mb-2">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
      <ArrowRight className="absolute right-4 bottom-4 h-5 w-5 transition-transform group-hover:translate-x-1" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );

  return disabled ? content : <Link to={to} aria-label={`Ir para ${title}`}>{content}</Link>;
}
