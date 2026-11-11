export function getGenreBadgeClass(genreName: string): {
  container: string;
  dot: string;
} {
  const g = genreName.toLowerCase().trim();

  if (g.includes('action')) {
    return {
      container: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 shadow-sm shadow-red-500/10',
      dot: 'bg-red-400',
    };
  }
  if (g.includes('adventure')) {
    return {
      container: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-sm shadow-emerald-500/10',
      dot: 'bg-emerald-400',
    };
  }
  if (g.includes('fantasy') || g.includes('magic')) {
    return {
      container: 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 shadow-sm shadow-purple-500/10',
      dot: 'bg-purple-400',
    };
  }
  if (g.includes('reincarnat') || g.includes('regress') || g.includes('transmigrat') || g.includes('isekai') || g.includes('time')) {
    return {
      container: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-sm shadow-cyan-500/10',
      dot: 'bg-cyan-400',
    };
  }
  if (g.includes('revenge')) {
    return {
      container: 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 shadow-sm shadow-rose-500/10',
      dot: 'bg-rose-400',
    };
  }
  if (g.includes('martial') || g.includes('murim') || g.includes('wuxia') || g.includes('cultivat')) {
    return {
      container: 'bg-orange-500/10 text-orange-300 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 shadow-sm shadow-orange-500/10',
      dot: 'bg-orange-400',
    };
  }
  if (g.includes('comedy') || g.includes('parody')) {
    return {
      container: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 shadow-sm shadow-amber-500/10',
      dot: 'bg-amber-400',
    };
  }
  if (g.includes('romance') || g.includes('shoujo') || g.includes('harem')) {
    return {
      container: 'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/50 shadow-sm shadow-pink-500/10',
      dot: 'bg-pink-400',
    };
  }
  if (g.includes('sci-fi') || g.includes('mecha') || g.includes('cyber')) {
    return {
      container: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 shadow-sm shadow-blue-500/10',
      dot: 'bg-blue-400',
    };
  }
  if (g.includes('drama') || g.includes('tragedy') || g.includes('psychological')) {
    return {
      container: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-sm shadow-indigo-500/10',
      dot: 'bg-indigo-400',
    };
  }

  // Default vibrant glass pill
  return {
    container: 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 shadow-sm shadow-amber-500/10',
    dot: 'bg-amber-400',
  };
}

