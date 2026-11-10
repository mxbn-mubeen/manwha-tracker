import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

export type StatAccent = 'violet' | 'amber' | 'emerald' | 'blue';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  valueClassName?: string;
  to?: string;
  accent?: StatAccent;
}

const ACCENT_STYLES: Record<StatAccent, { iconBg: string; hoverBorder: string }> = {
  violet: {
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/40',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/40',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    hoverBorder: 'hover:border-blue-500/40',
  },
};

export function StatCard({
  icon,
  label,
  value,
  valueClassName = 'text-foreground',
  to,
  accent = 'amber',
}: StatCardProps) {
  const styles = ACCENT_STYLES[accent];

  const content = (
    <Card
      className={`p-5 flex flex-col justify-between gap-3 bg-card border-border/40 shadow-sm card-hover-lift h-full transition-all ${styles.hoverBorder} group cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 duration-200 ${styles.iconBg}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${valueClassName}`}>
          {value}
        </div>
        <div className="text-sm font-medium text-muted-foreground mt-0.5">
          {label}
        </div>
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
