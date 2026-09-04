import { getAdapterBadgeClass } from "../utils/adapterColors";

export function adapterDotColor(adapterKey: string): string {
  const cls = getAdapterBadgeClass(adapterKey);
  if (cls.includes("text-orange-400") || cls.includes("text-amber-400")) return "bg-orange-500";
  if (cls.includes("text-blue-400"))   return "bg-blue-500";
  if (cls.includes("text-emerald-400") || cls.includes("text-green-400")) return "bg-emerald-500";
  if (cls.includes("text-purple-400")) return "bg-purple-500";
  if (cls.includes("text-rose-400") || cls.includes("text-red-400")) return "bg-rose-500";
  if (cls.includes("text-cyan-400") || cls.includes("text-sky-400")) return "bg-cyan-500";
  return "bg-zinc-600";
}

export function getHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}
