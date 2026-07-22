import { Card } from '@/components/ui/card';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  valueClassName?: string;
}

export function StatCard({ icon, label, value, valueClassName = "text-foreground" }: StatCardProps) {
  return (
    <Card className="p-5 flex flex-col gap-3 bg-card border-border/50 shadow-sm transition-all hover:bg-white/[0.02]">
      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${valueClassName}`}>{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
