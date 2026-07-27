import { motion } from "framer-motion";
import { CardBack, PlayingCard } from "./PlayingCard";
import type { CardModel } from "@/lib/dutch-mock";
import { cn } from "@/lib/utils";

interface Props {
  cards: CardModel[];
  faceDown?: boolean;
  revealedIndexes?: number[];
  onCardClick?: (i: number) => void;
  selectedIndex?: number;
  size?: "sm" | "md" | "lg" | "xl";
  compact?: boolean;
  className?: string;
}

export function PlayerHand({ cards, faceDown = true, revealedIndexes = [], onCardClick, selectedIndex, size = "lg", compact, className }: Props) {
  return (
    <div className={cn("flex items-end justify-center", compact ? "-space-x-6" : "gap-3", className)}>
      {cards.map((c, i) => {
        const revealed = revealedIndexes.includes(i);
        return (
          <motion.div
            key={c.id}
            initial={{ y: 60, opacity: 0, rotate: 0 }}
            animate={{ y: 0, opacity: 1, rotate: compact ? (i - (cards.length - 1) / 2) * 4 : 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 20 }}
          >
            {faceDown && !revealed ? (
              <CardBack size={size} />
            ) : (
              <PlayingCard
                card={c}
                size={size}
                selected={selectedIndex === i}
                onClick={onCardClick ? () => onCardClick(i) : undefined}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
