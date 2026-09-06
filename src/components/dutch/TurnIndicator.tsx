import { motion } from "framer-motion";
import { Timer, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function TurnIndicator({
  name,
  seconds,
  total = 45,
  isMyTurn = false,
}: {
  name: string;
  seconds: number;
  total?: number;
  isMyTurn?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const isUrgent = seconds <= 5 && seconds > 0;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "flex items-center gap-3 rounded-full px-4 py-2 transition-all duration-300",
        isMyTurn
          ? "glass-strong ring-2 ring-[color:var(--neon)] glow-neon bg-emerald-950/80 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-105"
          : "glass-strong"
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full font-bold transition-all",
          isMyTurn
            ? "gradient-neon text-black shadow-lg animate-pulse"
            : "bg-white/10 text-white"
        )}
      >
        {isMyTurn ? <Zap className="h-4 w-4 fill-current" /> : <Timer className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[10px] uppercase tracking-widest font-black",
            isMyTurn ? "text-[color:var(--neon)] animate-pulse" : "text-white/60"
          )}
        >
          {isMyTurn ? "🎯 SUA VEZ!" : "Vez de"}
        </div>
        <div
          className={cn(
            "truncate text-sm font-bold",
            isMyTurn ? "text-white font-black" : "text-white/90"
          )}
        >
          {isMyTurn ? "Você" : name}
        </div>
      </div>
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle cx="20" cy="20" r="16" strokeWidth="4" className="stroke-white/10" fill="none" />
          <motion.circle
            cx="20"
            cy="20"
            r="16"
            strokeWidth="4"
            fill="none"
            className={isUrgent ? "stroke-red-500 animate-pulse" : "stroke-[color:var(--neon)]"}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 grid place-items-center text-xs font-bold",
            isUrgent ? "text-red-400 font-black animate-pulse" : "text-white"
          )}
        >
          {seconds}
        </div>
      </div>
    </motion.div>
  );
}
