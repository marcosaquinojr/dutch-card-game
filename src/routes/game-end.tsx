import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { useGame, useRoom } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/game-end")({
  head: () => ({
    meta: [
      { title: "Vitória — DUTCH" },
      { name: "description", content: "Ranking final da partida com pódio e estatísticas dos jogadores." },
      { property: "og:title", content: "Vitória — DUTCH" },
      { property: "og:description", content: "Confira o pódio e o ranking completo da partida." },
    ],
  }),
  component: GameEnd,
});

function GameEnd() {
  const nav = useNavigate();
  const { gameResults, gameState, nextRound } = useGame();
  const { roomState } = useRoom();

  const resultsList = gameResults?.results || gameState?.players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    score: p.score,
    cumulativeScore: p.score,
  })) || [];

  const ranked = [...resultsList].sort((a, b) => (a.cumulativeScore ?? a.score) - (b.cumulativeScore ?? b.score));
  const first = ranked[0] || { playerName: "Vencedor", cumulativeScore: 0 };
  const second = ranked[1] || { playerName: "-", cumulativeScore: 0 };
  const third = ranked[2] || { playerName: "-", cumulativeScore: 0 };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <Confetti />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <DutchLogo size="sm" />
          <span className="text-xs uppercase tracking-widest text-white/50">Fim de partida</span>
        </div>

        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180 }} className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-gold text-black glow-gold">
            <Trophy className="h-10 w-10" />
          </div>
          <h1 className="mt-4 font-display text-4xl font-black text-gradient-gold md:text-6xl">
            {first.playerName} venceu a partida!
          </h1>
          <p className="mt-2 text-sm text-white/60">Menor pontuação total da partida</p>
        </motion.div>

        {/* Podio */}
        <div className="mt-14 grid grid-cols-3 items-end gap-4 md:gap-8">
          <Podium player={second} rank={2} height="h-32 md:h-44" tint="from-slate-400/20 to-slate-400/5" delay={0.15} />
          <Podium player={first} rank={1} height="h-48 md:h-64" tint="from-[color:var(--gold)]/40 to-transparent" delay={0} big />
          <Podium player={third} rank={3} height="h-24 md:h-36" tint="from-amber-700/25 to-amber-700/5" delay={0.3} />
        </div>

        {/* Ranking Completo */}
        <div className="mt-12">
          <h2 className="mb-4 font-display text-sm uppercase tracking-widest text-white/60">Ranking final</h2>
          <div className="space-y-2">
            {ranked.map((p, i) => (
              <motion.div
                key={p.playerId || i}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className={cn(
                  "flex items-center justify-between rounded-2xl border border-white/10 glass p-4",
                  i === 0 && "ring-1 ring-[color:var(--gold)]/50",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "grid h-9 w-9 place-items-center rounded-full font-display font-bold",
                    i === 0 ? "gradient-gold text-black" : "bg-white/10 text-white",
                  )}>{i + 1}</div>
                  <PlayerAvatar name={p.playerName || p.name} avatar={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(p.playerName || p.name)}&backgroundColor=1e293b`} size="sm" />
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-white/50">Pontuação Total</div>
                    <div className="font-display text-2xl font-black">{p.cumulativeScore ?? p.score}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            <Home className="h-4 w-4" /> Menu principal
          </Link>
          <Link to="/lobby" className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
            Voltar ao lobby
          </Link>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { nextRound(); nav({ to: "/game" }); }}
            className="flex items-center justify-center gap-2 rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon"
          >
            <RotateCcw className="h-4 w-4" /> Jogar novamente
          </motion.button>
        </div>
      </div>
    </main>
  );
}

function Podium({ player, rank, height, tint, delay, big }: { player: any; rank: number; height: string; tint: string; delay: number; big?: boolean }) {
  const score = player.cumulativeScore ?? player.score ?? 0;
  const name = player.playerName || player.name || "-";
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 180 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative">
        {rank === 1 && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-gold text-black glow-gold">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        )}
        <PlayerAvatar name={name} avatar={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=1e293b`} size={big ? "lg" : "md"} isHost={rank === 1} score={score} />
      </div>
      <div className={cn("w-full rounded-t-2xl border-x border-t border-white/10 bg-gradient-to-t p-4 text-center", tint, height)}>
        <div className={cn("font-display font-black", big ? "text-4xl" : "text-2xl")}>{rank}º</div>
        <div className="text-xs text-white/60">{score} pts</div>
      </div>
    </motion.div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -40, x: `${Math.random() * 100}%`, rotate: 0, opacity: 0 }}
          animate={{ y: "110vh", rotate: 360, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4 + Math.random() * 3, delay: Math.random() * 2, repeat: Infinity, ease: "linear" }}
          className="absolute h-3 w-2 rounded-sm"
          style={{
            backgroundColor: ["#7cc4ff", "#c084fc", "#facc15", "#f472b6"][i % 4],
          }}
        />
      ))}
    </div>
  );
}
