import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Zap, Flag, Sparkles } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayingCard } from "@/components/dutch/PlayingCard";
import { useGame, getSocket, getPersistentPlayerId } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/round-end")({
  head: () => ({
    meta: [
      { title: "Fim da rodada — DUTCH" },
      { name: "description", content: "Confira os pontos, o vencedor da rodada e as cartas reveladas de todos os jogadores." },
      { property: "og:title", content: "Fim da rodada — DUTCH" },
      { property: "og:description", content: "Cartas reveladas e placar atualizado. Próxima rodada em segundos." },
    ],
  }),
  component: RoundEnd,
});

function RoundEnd() {
  const nav = useNavigate();
  const { roundResults, gameState, nextRound } = useGame();

  // Emite sync se roundResults ainda não chegou por algum motivo
  useEffect(() => {
    if (!roundResults) {
      const s = getSocket();
      s?.emit("game:sync", {
        playerId: getPersistentPlayerId(),
        roomCode: gameState?.code,
      });
    }
  }, [roundResults, gameState?.code]);

  // Monta lista de resultados (prioriza roundResults do servidor, fallback para gameState.players)
  const resultsList = (roundResults?.results && roundResults.results.length > 0)
    ? roundResults.results
    : (gameState?.players || []).map((p: any) => {
        const hand = p.hand || [];
        const handScore = hand.reduce(
          (acc: number, c: any) => acc + (typeof c?.points === "number" ? c.points : 0),
          0
        );
        return {
          playerId: p.id,
          playerName: p.name,
          hand,
          handScore,
          bonusOrPenalty: p.isDutchCaller ? (handScore === 0 ? -5 : 0) : 0,
          roundTotal: handScore,
          cumulativeScore: p.score ?? handScore,
          reason: hand.length === 0 ? "Descartou todas as cartas (0 pts)! ⚡" : undefined,
        };
      });

  // Localiza vencedor
  let winner = resultsList.find((p: any) => p.playerId === roundResults?.winnerId);
  if (!winner) {
    winner = [...resultsList].sort((a: any, b: any) => a.roundTotal - b.roundTotal)[0];
  }
  if (!winner && roundResults?.winnerName) {
    winner = {
      playerName: roundResults.winnerName,
      playerId: roundResults.winnerId || "",
      hand: [],
      handScore: 0,
      bonusOrPenalty: 0,
      roundTotal: 0,
      cumulativeScore: 0,
    };
  }
  if (!winner) {
    winner = {
      playerName: "Vencedor",
      playerId: "",
      hand: [],
      handScore: 0,
      bonusOrPenalty: 0,
      roundTotal: 0,
      cumulativeScore: 0,
    };
  }

  // Identifica razão da vitória
  const winnerHand = winner.hand || [];
  const winnerZeroCards = winnerHand.length === 0;
  const isWinnerDutchCaller = gameState?.dutchCallerId === winner.playerId;

  let victoryHeadline = "🏆 Venceu a rodada com a menor pontuação!";
  let victorySubtitle = `${winner.roundTotal} ponto(s) nesta rodada`;
  let victoryBadgeType: "zero" | "dutch" | "score" = "score";

  if (winnerZeroCards) {
    victoryBadgeType = "zero";
    victoryHeadline = `⚡ ${winner.playerName} descartou TODAS as cartas!`;
    victorySubtitle = "Zerou as cartas da mão e venceu imediatamente com 0 pontos!";
  } else if (isWinnerDutchCaller) {
    victoryBadgeType = "dutch";
    victoryHeadline = `🚩 ${winner.playerName} pediu DUTCH e venceu!`;
    victorySubtitle = `Teve a menor pontuação da mesa com ${winner.roundTotal} ponto(s)!`;
  } else if (gameState?.dutchCallerId && gameState.dutchCallerId !== winner.playerId) {
    const callerName = resultsList.find((p: any) => p.playerId === gameState.dutchCallerId)?.playerName || "Outro jogador";
    victoryHeadline = `🎯 ${winner.playerName} venceu a rodada!`;
    victorySubtitle = `${callerName} pediu Dutch, mas ${winner.playerName} tinha a menor mão (${winner.roundTotal} pts)!`;
  }

  const handleNextRound = () => {
    nextRound();
    nav({ to: "/game" });
  };

  return (
    <main className="min-h-screen px-4 py-8 bg-slate-950/80 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <DutchLogo size="sm" />
          <div className="text-xs uppercase tracking-widest text-white/50">
            Rodada {gameState?.round || 1}
          </div>
        </div>

        {/* Winner Hero Banner */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center rounded-3xl p-6 md:p-8 glass border border-white/10 relative overflow-hidden shadow-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-white/70">
            Fim da Rodada {gameState?.round || 1}
          </div>

          <h1 className="mt-3 font-display text-3xl md:text-5xl font-black text-gradient-neon">
            {victoryHeadline}
          </h1>

          {/* Special victory pill */}
          <div className="mt-3 flex justify-center">
            {victoryBadgeType === "zero" && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-sm md:text-base shadow-lg animate-pulse">
                <Zap className="h-5 w-5 fill-emerald-400" />
                <span>0 cartas na mão — Vitória absoluta com 0 pontos!</span>
              </div>
            )}
            {victoryBadgeType === "dutch" && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-black text-sm md:text-base shadow-lg">
                <Flag className="h-5 w-5 fill-yellow-400" />
                <span>Dutch confirmado com a menor pontuação ({winner.roundTotal} pts)!</span>
              </div>
            )}
            {victoryBadgeType === "score" && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/20 border border-blue-400 text-blue-300 font-bold text-sm md:text-base shadow-lg">
                <Trophy className="h-5 w-5 fill-blue-400" />
                <span>{victorySubtitle}</span>
              </div>
            )}
          </div>

          {roundResults?.reason && roundResults.reason !== victorySubtitle && (
            <p className="mt-2 text-xs md:text-sm text-white/70">
              📌 {roundResults.reason}
            </p>
          )}
        </motion.div>

        {/* Players & Revealed Hands */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-white/50">
            <span>Jogador & Status</span>
            <span>Cartas Reveladas na Mão</span>
            <span className="text-right">Pontuação</span>
          </div>

          {resultsList.map((p: any, i: number) => {
            const isWinner = p.playerId === winner.playerId;
            const handCards = p.hand || [];
            const cardSum = handCards.reduce(
              (sum: number, c: any) => sum + (typeof c?.points === "number" ? c.points : 0),
              0
            );
            const bonus = typeof p.bonusOrPenalty === "number" ? p.bonusOrPenalty : 0;
            const roundScore = typeof p.roundTotal === "number" ? p.roundTotal : cardSum + bonus;
            const isDutchCaller = bonus !== 0 || (gameState?.dutchCallerId === p.playerId);

            return (
              <motion.div
                key={p.playerId || i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "flex flex-col md:grid md:grid-cols-[260px_1fr_160px] items-start md:items-center gap-4 rounded-2xl border p-4 md:p-5 transition-all shadow-md",
                  isWinner
                    ? "gradient-gold border-yellow-300/80 text-black glow-gold shadow-2xl scale-[1.01]"
                    : "glass border-white/10 text-white"
                )}
              >
                {/* Column 1: Player info */}
                <div className="flex items-center gap-3 w-full">
                  <PlayerAvatar
                    name={p.playerName}
                    avatar={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(p.playerName)}&backgroundColor=1e293b`}
                    size="md"
                    isHost={isWinner}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold text-base", isWinner ? "text-black" : "text-white")}>
                        {p.playerName}
                      </span>
                      {isWinner && (
                        <span className="text-[10px] font-black uppercase bg-black text-yellow-400 px-2 py-0.5 rounded-full shadow inline-flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Vencedor
                        </span>
                      )}
                    </div>

                    {/* Status badges */}
                    {handCards.length === 0 && (
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 fill-current" /> Zerou a mão (0 cartas)
                      </span>
                    )}
                    {isDutchCaller && (
                      <span className={cn(
                        "text-[11px] font-bold flex items-center gap-1",
                        isWinner ? "text-emerald-950 font-black" : "text-yellow-400"
                      )}>
                        <Flag className="h-3.5 w-3.5 fill-current" /> Pediu Dutch
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 2: Revealed Hand Cards */}
                <div className="flex flex-col gap-1 w-full py-1">
                  <div className={cn("text-[10px] font-bold uppercase tracking-wider", isWinner ? "text-black/70" : "text-white/50")}>
                    {handCards.length === 0 ? "Cartas da Mão" : `Cartas Reveladas (Soma: ${cardSum} pts)`}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {handCards.length === 0 ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black">
                        <Sparkles className="h-4 w-4" /> Sem cartas na mão (todas descartadas!)
                      </div>
                    ) : (
                      handCards.map((c: any, cardIdx: number) => (
                        <div key={c.id || cardIdx} className="flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15 + cardIdx * 0.05 }}
                          >
                            <PlayingCard card={c} size="md" faceDown={false} />
                          </motion.div>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              isWinner ? "bg-black/20 text-black" : "bg-white/10 text-white/70"
                            )}
                          >
                            {c.points} {c.points === 1 ? "pt" : "pts"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Score Breakdown */}
                <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-t-0 pt-2 md:pt-0 border-white/10 min-w-[150px]">
                  <div>
                    <div className={cn("text-[10px] uppercase tracking-widest font-bold", isWinner ? "text-black/70" : "text-white/50")}>
                      Pontos Rodada
                    </div>
                    <div className={cn("text-3xl font-black tabular-nums font-sans leading-tight", isWinner ? "text-black" : "text-white")}>
                      {roundScore} <span className="text-sm font-bold">pts</span>
                    </div>

                    <div className={cn("text-[11px] font-medium mt-0.5 whitespace-nowrap", isWinner ? "text-black/70" : "text-white/60")}>
                      {handCards.length === 0 ? "0 pts (zerou a mão)" : `${cardSum} pts nas cartas`}
                    </div>
                  </div>

                  <div className={cn("text-xs font-semibold mt-1", isWinner ? "text-black/80" : "text-white/60")}>
                    Total do Jogo: <span className="font-bold">{p.cumulativeScore} pts</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex justify-center gap-4">
          <Link
            to="/lobby"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 transition-colors"
          >
            Voltar ao lobby
          </Link>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNextRound}
            className="flex items-center gap-2 rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon shadow-lg cursor-pointer"
          >
            Próxima Rodada <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </main>
  );
}

