import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { CardBack, PlayingCard } from "./PlayingCard";
import type { CardModel } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  cards: CardModel[];
  faceDown?: boolean;
  revealedIndexes?: number[];
  onCardClick?: (i: number) => void;
  onMatchClick?: (i: number) => void;
  selectedIndex?: number;
  size?: "sm" | "md" | "lg" | "xl";
  compact?: boolean;
  layout?: "grid" | "row";
  isLocked?: boolean;
  canMatch?: boolean;
  swapActive?: boolean;
  className?: string;
}

export function PlayerHand({
  cards,
  faceDown = true,
  revealedIndexes = [],
  onCardClick,
  onMatchClick,
  selectedIndex,
  size = "md",
  compact = false,
  layout = "row",
  isLocked = false,
  canMatch = false,
  swapActive = false,
  className,
}: Props) {
  const isGridLayout = layout === "grid" && cards.length <= 4 && !compact;

  const getPositionName = (i: number, total: number) => {
    if (total === 4) {
      const names = ["1. Cima Esq", "2. Cima Dir", "3. Baixo Esq", "4. Baixo Dir"];
      return names[i] || `${i + 1}`;
    }
    return `Carta ${i + 1}`;
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {isLocked && (
        <div className="mb-2 flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-md shadow-lg">
          <Lock className="h-3 w-3" /> Mão Travada (Dutch) 🔒
        </div>
      )}

      <div
        className={cn(
          isGridLayout
            ? "grid grid-cols-2 gap-2.5 sm:gap-3.5 max-w-[260px]"
            : cn("flex items-end justify-center", compact ? "-space-x-5" : "gap-2.5 sm:gap-4 flex-nowrap"),
        )}
      >
        {cards.map((c, i) => {
          const revealed = revealedIndexes.includes(i);
          return (
            <motion.div
              key={c.id || i}
              initial={{ y: 20, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                rotate: compact && !isGridLayout ? (i - (cards.length - 1) / 2) * 4 : 0,
              }}
              whileHover={swapActive ? { scale: 1.05, y: -4 } : undefined}
              whileTap={swapActive ? { scale: 0.96 } : undefined}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 240, damping: 22 }}
              className={cn(
                "relative group flex flex-col items-center cursor-pointer",
                swapActive && "ring-2 ring-[color:var(--neon)] ring-offset-2 ring-offset-black/70 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-pulse",
                selectedIndex === i && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black/70 rounded-xl scale-105 shadow-[0_0_20px_rgba(250,204,21,0.8)] z-20",
              )}
              onClick={() => {
                if (onCardClick) onCardClick(i);
              }}
            >
              {selectedIndex === i && (
                <span className="absolute -top-2.5 -right-1 text-[9px] bg-yellow-400 text-black font-extrabold px-1.5 py-0.5 rounded-full shadow-lg z-20 animate-bounce">
                  1ª Carta 📌
                </span>
              )}
              {faceDown && !revealed ? (
                <CardBack
                  size={size}
                  className={swapActive ? "hover:brightness-110 transition-all" : undefined}
                />
              ) : (
                <PlayingCard
                  card={c}
                  size={size}
                  selected={selectedIndex === i}
                  className={swapActive ? "hover:brightness-110 transition-all" : undefined}
                />
              )}

              {/* Tag com posição/número da carta */}
              <span
                className={cn(
                  "mt-1.5 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap",
                  selectedIndex === i
                    ? "bg-yellow-400/25 text-yellow-300 border border-yellow-400/50 font-extrabold shadow-sm"
                    : swapActive
                      ? "bg-[color:var(--neon)]/20 text-[color:var(--neon)] border border-[color:var(--neon)]/50 font-extrabold shadow-sm"
                      : "text-white/60 group-hover:text-white/95 bg-black/40 border border-white/10",
                )}
              >
                {selectedIndex === i
                  ? `Selecionada (${i + 1})`
                  : swapActive
                    ? `Trocar ${i + 1}`
                    : isGridLayout
                      ? getPositionName(i, cards.length)
                      : `Carta ${i + 1}`}
              </span>

              {/* Botão de Descarte Igual (Snap) se habilitado e não em modo troca */}
              {canMatch && onMatchClick && !isLocked && !swapActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatchClick(i);
                  }}
                  title="Descartar esta carta se for igual ao descarte (Snap)"
                  className="absolute -top-1.5 -right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg hover:scale-115 active:scale-95 transition-all border border-black/40 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
