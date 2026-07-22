import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ManhwaPosterProps {
  coverUrl: string | null;
  title: string;
  localChapter: number;
  latestChapter: number;
  onContinueReading: () => void;
  onEdit: () => void;
}

export function ManhwaPoster({ coverUrl, title, localChapter, latestChapter, onContinueReading, onEdit }: ManhwaPosterProps) {
  // Once the reader has caught up to whatever chapters we actually know about,
  // there is nothing to "continue" to — clicking used to push localChapter past
  // latestChapter (e.g. 31/30), which then looked like a phantom unread chapter
  // even though the source (finished, or currently on hiatus) has nothing new.
  const isCaughtUp = latestChapter <= 0 || localChapter >= latestChapter;

  return (
    <div className="shrink-0 mx-auto md:mx-0 w-64 flex flex-col gap-3">
      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#161719] border border-border/30 shadow-2xl relative">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-medium">NO COVER</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f11]/80 via-transparent to-transparent pointer-events-none" />
      </div>

      <Button
        className={
          isCaughtUp
            ? 'w-full bg-zinc-800 text-zinc-400 font-semibold shadow-md h-11 cursor-default hover:bg-zinc-800'
            : 'w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold shadow-md h-11'
        }
        onClick={onContinueReading}
        disabled={isCaughtUp}
      >
        <div className="flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 19V5C4 3.89543 4.89543 3 6 3H19.4C19.7314 3 20 3.26863 20 3.6V16.7143C20 19.0812 18.0812 21 15.7143 21H6C4.89543 21 4 20.1046 4 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isCaughtUp ? 'Caught up' : `Continue Ch. ${localChapter + 1}`}
        </div>
      </Button>

      <Button
        variant="ghost"
        className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2 font-medium"
        onClick={onEdit}
      >
        <Edit className="h-4 w-4" />
        Edit Manhwa
      </Button>
    </div>
  );
}
