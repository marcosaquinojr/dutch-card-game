import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Repeat2, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import type { CardModel, Player } from "@/lib/dutch-mock";
import { PlayingCard } from "./PlayingCard";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

export type SpecialKind = "peek" | "swap" | "reveal" | "steal";

interface Props {
  open: boolean;
  kind: SpecialKind | null;
  players: Player[];
  yourHand: CardModel[];
  onClose: () => void;
  onConfirm: () => void;
}

const META: Record<SpecialKind, { title: string; desc: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  peek: { title: "Olhar Carta", desc: "Escolha uma das suas cartas para dar uma espiada.", Icon: Eye, color: "gradient-neon" },
  swap: { title: "Trocar Cartas", desc: "Selecione uma carta sua e uma de um oponente para trocar.", Icon: Repeat2, color: "gradient-gold" },
  reveal: { title: "Revelar Carta", desc: "Escolha uma carta de um oponente para revelar apenas para você.", Icon: Sparkles, color: "gradient-neon" },
  steal: { title: "Escolher Jogador", desc: "Selecione o alvo do seu efeito especial.", Icon: Users, color: "gradient-gold" },
};

export function SpecialCardModal({ open, kind, players, yourHand, onClose, onConfirm }: Props) {
  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null);
  const [pickedCard, setPickedCard] = useState<number | null>(null);
  if (!kind) return null;
  const M = META[kind];
  const needPlayer = kind === "swap" || kind === "reveal" || kind === "steal";
  const needCard = kind === "peek" || kind === "swap";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="glass-strong relative w-full max-w-3xl rounded-3xl p-6 md:p-8"
          >
            <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className={cn("grid h-14 w-14 place-items-center rounded-2xl text-black", M.color)}>
                <M.Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Habilidade</div>
                <h3 className="font-display text-2xl font-bold">{M.title}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/70">{M.desc}</p>

            {needPlayer && (
              <div className="mt-6">
                <div className="mb-3 text-xs uppercase tracking-widest text-white/60">Alvo</div>
                <div className="flex flex-wrap gap-3">
                  {players.filter((p) => !p.isYou).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPickedPlayer(p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all",
                        pickedPlayer === p.id ? "border-[color:var(--neon)] glow-neon bg-white/5" : "border-white/10 glass hover:bg-white/10",
                      )}
                    >
                      <PlayerAvatar name={p.name} avatar={p.avatar} size="md" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {needCard && (
              <div className="mt-6">
                <div className="mb-3 text-xs uppercase tracking-widest text-white/60">Sua carta</div>
                <div className="flex flex-wrap gap-3">
                  {yourHand.map((c, i) => (
                    <PlayingCard
                      key={c.id}
                      card={c}
                      faceDown
                      size="md"
                      selected={pickedCard === i}
                      onClick={() => setPickedCard(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={onClose} className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5">
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { onConfirm(); setPickedCard(null); setPickedPlayer(null); }}
                className={cn("rounded-full px-6 py-2.5 font-display font-bold text-black glow-neon", M.color)}
              >
                Confirmar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
