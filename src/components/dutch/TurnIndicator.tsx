import { motion } from "framer-motion";
import { Timer } from "lucide-react";

export function TurnIndicator({ name, seconds, total = 45 }: { name: string; seconds: number; total?: number }) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-strong flex items-center gap-3 rounded-full px-4 py-2"
    >
      <div className="grid h-9 w-9 place-items-center rounded-full gradient-neon text-black">
        <Timer className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-white/60">Vez de</div>
        <div className="truncate text-sm font-bold text-white">{name}</div>
      </div>
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle cx="20" cy="20" r="16" strokeWidth="4" className="stroke-white/10" fill="none" />
          <motion.circle
            cx="20" cy="20" r="16" strokeWidth="4" fill="none"
            className="stroke-[color:var(--neon)]"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-xs font-bold text-white">{seconds}</div>
      </div>
    </motion.div>
  );
}
