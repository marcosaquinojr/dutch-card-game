import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Repeat2, Lock } from "lucide-react";
import { useState } from "react";
import type { CardModel, ClientPlayer } from "@/game/types";
import { CardBack } from "./PlayingCard";
import { PlayerAvatar } from "./PlayerAvatar";
import { cn } from "@/lib/utils";

export type SpecialKind = "peek" | "swap";

interface Props {
  open: boolean;
  kind: SpecialKind | null;
  players: ClientPlayer[];
  myPlayerId: string;
  yourHand: CardModel[];
  onClose: () => void;
  onConfirmPeek: (cardIndex: number) => void;
  onConfirmJackSwap: (
    player1Id: string,
    cardIndex1: number,
    player2Id: string,
    cardIndex2: number,
  ) => void;
}

export function SpecialCardModal({
  open,
  kind,
  players,
  myPlayerId,
  yourHand,
  onClose,
  onConfirmPeek,
  onConfirmJackSwap,
}: Props) {
  // Estado para Peek (Dama)
  const [peekIndex, setPeekIndex] = useState<number | null>(null);

  // Estado para Swap (Valete): Seleção da Carta 1 e Carta 2
  const [target1, setTarget1] = useState<{ playerId: string; cardIndex: number } | null>(null);
  const [target2, setTarget2] = useState<{ playerId: string; cardIndex: number } | null>(null);

  if (!kind) return null;

  const isPeek = kind === "peek";
  const isSwap = kind === "swap";

  const handleConfirm = () => {
    if (isPeek && peekIndex !== null) {
      onConfirmPeek(peekIndex);
      setPeekIndex(null);
    } else if (isSwap && target1 !== null && target2 !== null) {
      onConfirmJackSwap(target1.playerId, target1.cardIndex, target2.playerId, target2.cardIndex);
      setTarget1(null);
      setTarget2(null);
    }
  };

  const isCardSelected = (playerId: string, cardIndex: number) => {
    if (target1?.playerId === playerId && target1?.cardIndex === cardIndex) return 1;
    if (target2?.playerId === playerId && target2?.cardIndex === cardIndex) return 2;
    return 0;
  };

  const handleCardClick = (playerId: string, cardIndex: number, isLocked?: boolean) => {
    if (isLocked) return;

    if (!target1) {
      setTarget1({ playerId, cardIndex });
    } else if (target1.playerId === playerId && target1.cardIndex === cardIndex) {
      setTarget1(null);
    } else if (!target2) {
      setTarget2({ playerId, cardIndex });
    } else if (target2.playerId === playerId && target2.cardIndex === cardIndex) {
      setTarget2(null);
    } else {
      // Se ambos já estavam selecionados, substitui o segundo
      setTarget2({ playerId, cardIndex });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="glass-strong relative w-full max-w-2xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl text-black font-extrabold",
                  isPeek ? "gradient-neon" : "gradient-gold",
                )}
              >
                {isPeek ? <Eye className="h-6 w-6" /> : <Repeat2 className="h-6 w-6" />}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                  {isPeek ? "Dama (Rainha)" : "Valete (Jack)"}
                </div>
                <h3 className="font-display text-2xl font-bold">
                  {isPeek ? "Espiar uma Carta da sua Grade" : "Trocar Quaisquer 2 Cartas da Mesa"}
                </h3>
              </div>
            </div>

            <p className="mt-2 text-xs text-white/70">
              {isPeek
                ? "Escolha uma de suas cartas viradas para baixo para olhar por 5 segundos."
                : "Selecione duas cartas quaisquer na mesa para trocar entre si. Cartas de quem bateu Dutch estão travadas 🔒."}
            </p>

            {/* Conteúdo para a Dama (Peek) */}
            {isPeek && (
              <div className="mt-6">
                <div className="mb-3 text-xs uppercase tracking-widest text-white/60 font-semibold text-center">
                  Suas cartas (escolha uma para espiar):
                </div>
                <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                  {yourHand.map((c, i) => (
                    <button
                      key={c.id || i}
                      type="button"
                      onClick={() => setPeekIndex(i)}
                      className={cn(
                        "relative flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer",
                        peekIndex === i
                          ? "border-[color:var(--neon)] glow-neon bg-white/10 scale-105"
                          : "border-white/10 hover:border-white/30",
                      )}
                    >
                      <CardBack size="md" />
                      <span className="mt-1 text-[10px] text-white/70 font-bold uppercase">
                        Carta {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conteúdo para o Valete (Swap livre entre quaisquer 2 cartas na mesa) */}
            {isSwap && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between text-xs font-bold text-white/80 border-b border-white/10 pb-2">
                  <div className={cn(target1 ? "text-[color:var(--neon)]" : "text-white/40")}>
                    Carta 1: {target1 ? "Selecionada ✓" : "Escolha..."}
                  </div>
                  <div className={cn(target2 ? "text-[color:var(--gold)]" : "text-white/40")}>
                    Carta 2: {target2 ? "Selecionada ✓" : "Escolha..."}
                  </div>
                </div>

                <div className="space-y-4">
                  {players.map((p) => {
                    const isYou = p.id === myPlayerId;
                    const cardCount = isYou ? yourHand.length : p.cardsCount;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-2xl p-3 border transition-all",
                          p.isLocked
                            ? "border-amber-500/30 bg-amber-500/5 opacity-60"
                            : "border-white/10 glass",
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={p.name} avatar={p.avatar} size="sm" />
                            <span className="text-xs font-bold text-white">
                              {p.name} {isYou && "(Você)"}
                            </span>
                          </div>
                          {p.isLocked && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                              <Lock className="h-3 w-3" /> Travado
                            </span>
                          )}
                        </div>

                        {/* Cartas do jogador */}
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: cardCount }).map((_, idx) => {
                            const selNum = isCardSelected(p.id, idx);
                            return (
                              <button
                                key={idx}
                                disabled={p.isLocked}
                                onClick={() => handleCardClick(p.id, idx, p.isLocked)}
                                className={cn(
                                  "relative p-1.5 rounded-xl border transition-all cursor-pointer disabled:cursor-not-allowed",
                                  selNum === 1
                                    ? "border-[color:var(--neon)] glow-neon bg-[color:var(--neon)]/10 scale-105"
                                    : selNum === 2
                                      ? "border-yellow-400 glow-gold bg-yellow-400/10 scale-105"
                                      : "border-white/10 hover:border-white/30",
                                )}
                              >
                                <CardBack size="sm" />
                                {selNum > 0 && (
                                  <span
                                    className={cn(
                                      "absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-black shadow-md",
                                      selNum === 1 ? "bg-[color:var(--neon)]" : "bg-yellow-400",
                                    )}
                                  >
                                    {selNum}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 px-6 py-2.5 text-xs font-bold text-white/80 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isPeek ? peekIndex === null : target1 === null || target2 === null}
                onClick={handleConfirm}
                className={cn(
                  "rounded-full px-6 py-2.5 font-display text-xs font-bold text-black cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                  isPeek ? "gradient-neon glow-neon" : "gradient-gold glow-gold",
                )}
              >
                Confirmar {isPeek ? "Espiada" : "Troca"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
