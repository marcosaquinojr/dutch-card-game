import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayingCard } from "@/components/dutch/PlayingCard";
import { useGame } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/round-end")({
  head: () => ({
    meta: [
      { title: "Fim da rodada — DUTCH" },
      { name: "description", content: "Confira os pontos, o vencedor da rodada e prepare-se para a próxima." },
      { property: "og:title", content: "Fim da rodada — DUTCH" },
      { property: "og:description", content: "Cartas reveladas e placar atualizado. Próxima rodada em segundos." },
    ],
  }),
  component: RoundEnd,
});

function RoundEnd() {
  const nav = useNavigate();
  const { roundResults, gameState, nextRound } = useGame();

  const resultsList = roundResults?.results || [];
  const winner = [...resultsList].sort((a, b) => a.roundTotal - b.roundTotal)[0] || {
    playerName: "Alguém",
    playerId: "",
  };

  const handleNextRound = () => {
    nextRound();
    nav({ to: "/game" });
  };

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <DutchLogo size="sm" />
          <div className="text-xs uppercase tracking-widest text-white/50">
            Rodada {gameState?.round || 1}
          </div>
        </div>

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-white/70">
            Fim da rodada
          </div>
          <h1 className="mt-3 font-display text-4xl font-black text-gradient-neon md:text-6xl">
            {winner.playerName} venceu a rodada!
          </h1>
          <p className="mt-2 text-sm text-white/60">Menor pontuação leva a rodada 🏆</p>
        </motion.div>

        <div className="mt-10 space-y-4">
          {resultsList.map((p: any, i: number) => {
            const isWinner = p.playerId === winner.playerId;
            return (
              <motion.div
                key={p.playerId || i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4 md:p-5",
                  isWinner ? "gradient-gold border-transparent text-black glow-gold" : "glass border-white/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar name={p.playerName} avatar={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(p.playerName)}&backgroundColor=1e293b`} size="md" isHost={isWinner} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(p.hand || []).map((c: any) => (
                    <motion.div key={c.id} initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ delay: 0.4 + Math.random() * 0.3 }}>
                      <PlayingCard card={c} size="sm" />
                    </motion.div>
                  ))}
                </div>
                <div className="text-right">
                  <div className={cn("text-[10px] uppercase tracking-widest", isWinner ? "text-black/70" : "text-white/50")}>
                    Pontos Rodada
                  </div>
                  <div className={cn("font-display text-3xl font-black", isWinner ? "text-black" : "text-white")}>
                    {p.roundTotal}
                  </div>
                  <div className={cn("text-[10px]", isWinner ? "text-black/70" : "text-white/50")}>
                    Total: {p.cumulativeScore}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <Link to="/lobby" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            Voltar ao lobby
          </Link>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleNextRound}
            className="flex items-center gap-2 rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon"
          >
            Próxima Rodada <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
