import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { getProxiedImageUrl } from '@/utils/image';

interface ManhwaCoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspect?: string;
}

export function ManhwaCoverImage({
  src,
  alt,
  className,
}: ManhwaCoverImageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const proxiedUrl = getProxiedImageUrl(src);

  if (!proxiedUrl || imgFailed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 select-none p-1">
        <ImageOff className="w-4 h-4 text-zinc-600 mb-0.5" />
        <span className="text-[9px] font-medium tracking-tight uppercase text-zinc-600">
          No Cover
        </span>
      </div>
    );
  }

  return (
    <img
      src={proxiedUrl}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={className || 'w-full h-full object-cover'}
    />
  );
}

