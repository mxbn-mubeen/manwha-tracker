/** Returns a Tailwind class set for a given adapter key badge */
export function getAdapterBadgeClass(adapterKey: string): string {
  const map: Record<string, string> = {
    asurascans:      "bg-orange-500/20 text-orange-400 border-orange-500/30",
    reaperscans:     "bg-red-500/20 text-red-400 border-red-500/30",
    webtoon:         "bg-sky-500/20 text-sky-400 border-sky-500/30",
    thunderscans:    "bg-violet-500/20 text-violet-400 border-violet-500/30",
    manhuaus:        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    infinitelevelup: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    mgeko:           "bg-pink-500/20 text-pink-400 border-pink-500/30",
    arenascans:      "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    roliascan:       "bg-lime-500/20 text-lime-400 border-lime-500/30",
    comixto:         "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
    mgread:          "bg-rose-500/20 text-rose-400 border-rose-500/30",
    ultimateofallages:"bg-teal-500/20 text-teal-400 border-teal-500/30",
    telegram:        "bg-blue-500/20 text-blue-400 border-blue-500/30",
    generic:         "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return map[adapterKey] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}
