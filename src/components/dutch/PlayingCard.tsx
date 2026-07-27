import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CardModel } from "@/lib/dutch-mock";
import { Eye, Repeat2, Sparkles, Users } from "lucide-react";

interface Props {
  card?: CardModel;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE = {
  sm: "w-12 h-16 text-xs rounded-md",
  md: "w-16 h-24 text-sm rounded-lg",
  lg: "w-24 h-36 text-lg rounded-xl",
  xl: "w-32 h-48 text-2xl rounded-2xl",
};

function suitColor(suit: string) {
  return suit === "♥" || suit === "♦" ? "text-rose-400" : "text-slate-100";
}

function SpecialIcon({ kind }: { kind: NonNullable<CardModel["special"]> }) {
  const Icon = kind === "peek" ? Eye : kind === "swap" ? Repeat2 : kind === "steal" ? Users : Sparkles;
  return <Icon className="h-3.5 w-3.5" />;
}

export function PlayingCard({ card, faceDown, size = "lg", selected, highlight, onClick, className }: Props) {
  const s = SIZE[size];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={onClick ? { y: -8, scale: 1.04 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      animate={selected ? { y: -14 } : { y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "relative shrink-0 select-none [perspective:1000px] outline-none",
        s,
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
          faceDown ? "" : "[transform:rotateY(180deg)]",
        )}
      >
        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 [backface-visibility:hidden] rounded-[inherit] overflow-hidden",
            "border border-white/15 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]",
            highlight && "animate-pulse-glow",
          )}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.32 0.10 265) 0%, oklch(0.18 0.06 280) 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 8px, oklch(1 0 0 / 0.06) 8px 9px), repeating-linear-gradient(-45deg, transparent 0 8px, oklch(1 0 0 / 0.06) 8px 9px)",
          }} />
          <div className="absolute inset-2 rounded-[calc(inherit-4px)] border border-white/10" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-gradient-neon text-lg font-bold tracking-widest">D</span>
          </div>
        </div>

        {/* Face */}
        <div
          className={cn(
            "absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[inherit]",
            "gradient-card border border-white/15",
            selected && "ring-2 ring-[color:var(--neon)] glow-neon",
            highlight && "ring-2 ring-[color:var(--gold)] glow-gold",
          )}
        >
          <div className="flex h-full w-full flex-col justify-between p-2">
            <div className={cn("flex items-center justify-between font-display font-bold", suitColor(card?.suit ?? ""))}>
              <span>{card?.value ?? "?"}</span>
              <span>{card?.suit}</span>
            </div>
            <div className={cn("grid place-items-center text-3xl", suitColor(card?.suit ?? ""))}>
              {card?.suit}
            </div>
            <div className={cn("flex items-center justify-between text-[10px] font-semibold text-white/70")}>
              {card?.special ? (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-white">
                  <SpecialIcon kind={card.special} />
                  {card.special}
                </span>
              ) : (
                <span className="opacity-60">{card?.points}pt</span>
              )}
              <span className={cn("rotate-180 font-display", suitColor(card?.suit ?? ""))}>{card?.value}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function CardBack({ size = "lg", className }: { size?: Props["size"]; className?: string }) {
  return <PlayingCard faceDown size={size} className={className} />;
}
