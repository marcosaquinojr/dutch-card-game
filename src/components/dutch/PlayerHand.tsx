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
  className?: string;
}

export function PlayerHand({
  cards,
  faceDown = true,
  revealedIndexes = [],
  onCardClick,
  onMatchClick,
  selectedIndex,
  size = "lg",
  compact = false,
  layout = "grid",
  isLocked = false,
  canMatch = false,
  className,
}: Props) {
  const isGridLayout = layout === "grid" && cards.length <= 4 && !compact;

  const getPositionName = (i: number, total: number) => {
    if (total === 4) {
      const names = ["Cima Esq", "Cima Dir", "Baixo Esq", "Baixo Dir"];
      return names[i] || `${i + 1}`;
    }
    return `${i + 1}`;
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {isLocked && (
        <div className="mb-2 flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-md">
          <Lock className="h-3 w-3" /> Mão Travada (Dutch)
        </div>
      )}

      <div
        className={cn(
          isGridLayout
            ? "grid grid-cols-2 gap-3 max-w-[280px]"
            : cn("flex items-end justify-center", compact ? "-space-x-5" : "gap-3"),
        )}
      >
        {cards.map((c, i) => {
          const revealed = revealedIndexes.includes(i);
          return (
            <motion.div
              key={c.id || i}
              initial={{ y: 30, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                rotate: compact && !isGridLayout ? (i - (cards.length - 1) / 2) * 4 : 0,
              }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 220, damping: 20 }}
              className="relative group flex flex-col items-center"
            >
              {faceDown && !revealed ? (
                <CardBack
                  size={size}
                  onClick={onCardClick ? () => onCardClick(i) : undefined}
                />
              ) : (
                <PlayingCard
                  card={c}
                  size={size}
                  selected={selectedIndex === i}
                  onClick={onCardClick ? () => onCardClick(i) : undefined}
                />
              )}

              {/* Tag da posição na grade */}
              {isGridLayout && (
                <span className="mt-1 text-[9px] uppercase font-bold tracking-wider text-white/40 group-hover:text-white/80 transition-colors">
                  {getPositionName(i, cards.length)}
                </span>
              )}

              {/* Botão de Descarte Igual (Snap) se habilitado */}
              {canMatch && onMatchClick && !isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatchClick(i);
                  }}
                  title="Descartar esta carta se for igual ao descarte (Snap)"
                  className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-black shadow-lg hover:scale-110 active:scale-95 transition-all border border-black/40 cursor-pointer"
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
