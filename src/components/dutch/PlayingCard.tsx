import { useState } from "react";
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

const SPECIAL_LABEL: Record<NonNullable<CardModel["special"]>, string> = {
  peek: "Espiar 👁️",
  swap: "Trocar 🔄",
  reveal: "Revelar",
  steal: "Roubar",
};

function SpecialIcon({ kind }: { kind: NonNullable<CardModel["special"]> }) {
  const Icon = kind === "peek" ? Eye : kind === "swap" ? Repeat2 : kind === "steal" ? Users : Sparkles;
  return <Icon className="h-3.5 w-3.5" />;
}

export function PlayingCard({ card, faceDown, size = "lg", selected, highlight, onClick, className }: Props) {
  const s = SIZE[size];
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width - 0.5) * 2;
    const py = (y / rect.height - 0.5) * 2;
    setTilt({
      rx: -py * 14,
      ry: px * 14,
      gx: (x / rect.width) * 100,
      gy: (y / rect.height) * 100,
      glare: 0.35,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 });
  };

  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onPointerMove={handlePointerMove as any}
      onPointerLeave={handlePointerLeave as any}
      whileHover={onClick ? { y: -8, scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      animate={selected ? { y: -14 } : { y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "relative shrink-0 select-none [perspective:800px] outline-none",
        s,
        className,
      )}
    >
      <div
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry + (faceDown ? 0 : 180)}deg)`,
          transition: "transform 0.14s ease-out",
        }}
      >
        {/* Holographic Glare Sheen */}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-200"
          style={{
            opacity: tilt.glare,
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`,
            mixBlendMode: "overlay",
          }}
        />
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
            <div className={cn("grid place-items-center font-bold leading-none", size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl", suitColor(card?.suit ?? ""))}>
              {card?.suit}
            </div>
            <div className={cn("flex items-center justify-between text-[10px] font-semibold text-white/70")}>
              {card?.special ? (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-white">
                  <SpecialIcon kind={card.special} />
                  {SPECIAL_LABEL[card.special]}
                </span>
              ) : (
                <span className="opacity-60">{card?.points}pt</span>
              )}
              <span className={cn("rotate-180 font-display", suitColor(card?.suit ?? ""))}>{card?.value}</span>
            </div>
          </div>
        </div>
      </div>
    </Tag>
  );
}

export function CardBack({ size = "lg", className, onClick }: { size?: Props["size"]; className?: string; onClick?: () => void }) {
  return <PlayingCard faceDown size={size} className={className} onClick={onClick} />;
}
