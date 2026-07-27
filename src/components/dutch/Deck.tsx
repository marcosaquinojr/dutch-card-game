import { motion } from "framer-motion";
import { CardBack, PlayingCard } from "./PlayingCard";
import type { CardModel } from "@/lib/dutch-mock";
import { cn } from "@/lib/utils";

export function Deck({ count = 24, onClick, className }: { count?: number; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("relative h-36 w-24", className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ transform: `translate(${i * 1.5}px, ${-i * 1.5}px)` }}
        >
          <CardBack size="lg" />
        </div>
      ))}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur">
        {count} cartas
      </div>
    </button>
  );
}

export function DiscardPile({ top, onClick, className }: { top?: CardModel; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("relative h-36 w-24", className)}>
      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/20" />
      {top && (
        <motion.div
          key={top.id}
          initial={{ y: -40, opacity: 0, rotate: -10 }}
          animate={{ y: 0, opacity: 1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="absolute inset-0"
        >
          <PlayingCard card={top} size="lg" />
        </motion.div>
      )}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur">
        Descarte
      </div>
    </button>
  );
}
