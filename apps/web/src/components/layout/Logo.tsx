export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 group select-none ${className || ''}`}>
      {/* ── Left Side: Box M (Vibrant Golden Gradient Squircle from Design 1) ── */}
      <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all duration-300 overflow-hidden shrink-0">
        {/* Top gloss shine highlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 pointer-events-none" />

        {/* Custom Stylized Webtoon M Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4.5 h-4.5 text-zinc-950 drop-shadow-sm transition-transform group-hover:scale-105"
        >
          <path
            d="M3.5 18.5V6.5C3.5 5.4 4.4 4.5 5.5 4.5H7.2C7.9 4.5 8.6 4.9 8.9 5.5L12 11L15.1 5.5C15.4 4.9 16.1 4.5 16.8 4.5H18.5C19.6 4.5 20.5 5.4 20.5 6.5V18.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 12V19.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7" r="1.1" fill="currentColor" />
        </svg>
      </div>

      {/* ── Right Side: Brand Typography & Pulsing Radar Beacon (from Design 2) ── */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-[15px] sm:text-[16px] tracking-tight text-white group-hover:text-amber-300 transition-colors">
            MANHWA
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-400" />
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9px] font-bold tracking-[0.2em] text-amber-400/90 font-mono uppercase">
            TRACKER
          </span>
        </div>
      </div>
    </div>
  );
}
