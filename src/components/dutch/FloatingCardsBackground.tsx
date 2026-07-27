import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function FloatingCardsBackground() {
  const [cards] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 12 + Math.random() * 12,
      rotate: (Math.random() - 0.5) * 40,
      scale: 0.6 + Math.random() * 0.9,
      suit: (["♠", "♥", "♦", "♣"] as const)[i % 4],
    })),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-90" />
      {cards.map((c) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{
            opacity: [0, 0.7, 0.7, 0],
            y: [40, -120],
            rotate: [c.rotate, c.rotate + 20],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            transform: `scale(${c.scale})`,
          }}
          className="absolute h-24 w-16 rounded-xl gradient-card border border-white/10 shadow-2xl"
        >
          <div className="grid h-full w-full place-items-center text-2xl text-white/40">
            {c.suit}
          </div>
        </motion.div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--background)] via-transparent to-transparent" />
    </div>
  );
}
