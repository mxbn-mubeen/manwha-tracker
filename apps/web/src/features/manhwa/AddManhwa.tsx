import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddManhwaForm } from '@/features/manhwa/components/AddManhwaForm';
import { usePageTitle } from '@/lib/usePageTitle';


export function AddManhwaPage() {
  usePageTitle('Add Manhwa');
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 mt-6">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
          <Link to="/library">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Add Manhwa</h1>
          <p className="text-muted-foreground text-sm">Manually add a title. Connect Telegram or websites afterward.</p>
        </div>
      </div>

      <Card className="p-8 bg-[#161719] border-border/30 rounded-2xl">
        <AddManhwaForm />
      </Card>
    </div>
  );
}