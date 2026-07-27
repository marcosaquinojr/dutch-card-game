import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Volume2, Flag, Sparkles, Repeat2, Eye, MessageSquare } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayerHand } from "@/components/dutch/PlayerHand";
import { Deck, DiscardPile } from "@/components/dutch/Deck";
import { TurnIndicator } from "@/components/dutch/TurnIndicator";
import { SpecialCardModal, type SpecialKind } from "@/components/dutch/SpecialCardModal";
import { useGame, useRoom } from "@/lib/socket-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CardModel } from "@/game/types";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Mesa — DUTCH" },
      { name: "description", content: "Partida em andamento: compre, descarte, use habilidades e chame Dutch quando estiver pronto." },
      { property: "og:title", content: "Mesa — DUTCH" },
      { property: "og:description", content: "Partida cinematográfica em andamento. Chame Dutch para encerrar a rodada." },
    ],
  }),
  component: Game,
});

function Game() {
  const nav = useNavigate();
  const { roomState } = useRoom();
  const {
    gameState,
    drawnCard,
    roundResults,
    gameResults,
    drawFromDeck,
    drawFromDiscard,
    discardCard,
    swapCard,
    useSpecial,
    callDutch,
  } = useGame();

  const [modalKind, setModalKind] = useState<SpecialKind | null>(null);

  // Redirecionamentos quando a rodada ou jogo terminam
  useEffect(() => {
    if (roundResults) {
      nav({ to: "/round-end" });
    }
  }, [roundResults, nav]);

  useEffect(() => {
    if (gameResults) {
      nav({ to: "/game-end" });
    }
  }, [gameResults, nav]);

  // Se não temos um estado do jogo nem roomState, fallback ou redireciona pro menu
  if (!gameState) {
    return (
      <main className="relative min-h-screen grid place-items-center bg-black/80">
        <div className="text-center space-y-4">
          <DutchLogo size="lg" />
          <p className="text-white/60 animate-pulse">Aguardando início da partida...</p>
          <Link to="/lobby" className="inline-block text-xs text-[color:var(--neon)] underline">
            Voltar ao lobby
          </Link>
        </div>
      </main>
    );
  }

  const playerName = localStorage.getItem("dutch_playerName") || "Você";
  const me = gameState.players.find((p) => p.name === playerName) || gameState.players[0];
  const isMyTurn = gameState.currentTurnPlayerId === me?.id;
  const activePlayer = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId) || me;

  const others = gameState.players.filter((p) => p.id !== me?.id);
  const positions = [
    "top-6 left-1/2 -translate-x-1/2", // top center
    "top-1/2 left-6 -translate-y-1/2", // left
    "top-1/2 right-6 -translate-y-1/2", // right
    "top-24 left-1/4", // top-left
    "top-24 right-1/4", // top-right
  ];

  const handleDrawDeck = () => {
    if (!isMyTurn) {
      toast.error("Não é o seu turno!");
      return;
    }
    drawFromDeck();
    toast("Você comprou uma carta do monte", { icon: "🃏" });
  };

  const handleDrawDiscard = () => {
    if (!isMyTurn) {
      toast.error("Não é o seu turno!");
      return;
    }
    drawFromDiscard();
    toast("Você comprou do descarte", { icon: "📥" });
  };

  const handleDiscardHandCard = (index: number) => {
    if (!isMyTurn) return;
    discardCard(index);
    toast.success("Carta descartada");
  };

  const handleSwapHandCard = (index: number) => {
    if (!isMyTurn) return;
    swapCard(index);
    toast.success("Carta trocada!");
  };

  const handleCallDutch = () => {
    if (!isMyTurn) {
      toast.error("Você só pode chamar DUTCH no seu turno!");
      return;
    }
    callDutch();
    toast.success("Você chamou DUTCH! 🚩");
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 gradient-felt" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, oklch(0 0 0 / 0.6) 100%)",
        }}
      />

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Link to="/lobby" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <DutchLogo size="sm" />
        </div>

        <TurnIndicator name={activePlayer.name} seconds={gameState.turnTimeRemaining} />

        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <Volume2 className="h-4 w-4" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <MessageSquare className="h-4 w-4" />
          </button>
          <Link to="/lobby" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Area da Mesa */}
      <div className="relative mx-auto h-[calc(100vh-80px)] max-w-6xl">
        {/* Oponentes */}
        {others.map((p, i) => (
          <div key={p.id} className={cn("absolute z-10", positions[i % positions.length])}>
            <div
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl glass px-4 py-3 transition-all",
                gameState.currentTurnPlayerId === p.id ? "ring-2 ring-[color:var(--neon)] glow-neon" : "border border-white/10",
              )}
            >
              <PlayerAvatar name={p.name} avatar={p.avatar} size="md" isActive={gameState.currentTurnPlayerId === p.id} score={p.score} />
              <div className="flex -space-x-4">
                {Array.from({ length: p.cardsCount }).map((_, cardIdx) => (
                  <div key={cardIdx} className="scale-75">
                    <div
                      className="h-24 w-16 rounded-lg border border-white/15 shadow-md"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.32 0.10 265), oklch(0.18 0.06 280))",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Centro: Monte de Compras + Descarte */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-end gap-8 rounded-3xl glass-strong px-8 py-6">
            <Deck count={gameState.deckCount} onClick={handleDrawDeck} />
            <DiscardPile top={gameState.discardTop || { id: "top", value: "K", suit: "♠", points: 0 }} onClick={handleDrawDiscard} />
          </div>
        </div>

        {/* Você (Parte Inferior) */}
        <div className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-4 px-4">
          <div className="flex items-center gap-3 rounded-full glass-strong px-4 py-2">
            <PlayerAvatar name={me.name} avatar={me.avatar} size="sm" isActive={isMyTurn} isHost={me.isHost} score={me.score} />
            <div className="hidden text-xs text-white/70 sm:block">
              <div className={cn("font-bold", isMyTurn ? "text-[color:var(--neon)] animate-pulse" : "text-white")}>
                {isMyTurn ? "Sua vez de jogar!" : "Aguardando turno..."}
              </div>
              <div>Mão: {gameState.yourHand.length} cartas · {me.score} pts acumulados</div>
            </div>
          </div>

          {/* Carta recém-comprada (se houver) */}
          {drawnCard && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 bg-white/10 rounded-2xl p-2 border border-[color:var(--neon)]">
              <span className="text-xs text-white/80 font-bold px-2">Comprada: {drawnCard.value}{drawnCard.suit}</span>
              <button onClick={() => handleDiscardHandCard(0)} className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full font-bold">Descartar</button>
            </motion.div>
          )}

          <PlayerHand
            cards={gameState.yourHand}
            faceDown
            revealedIndexes={gameState.yourKnownCards}
            size="lg"
            compact
            onCardClick={(index: number) => {
              if (drawnCard) {
                handleSwapHandCard(index);
              } else {
                handleDiscardHandCard(index);
              }
            }}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ActionButton onClick={handleDrawDeck} label="Comprar Monte" tone="neon" />
            <ActionButton onClick={handleDrawDiscard} label="Comprar Descarte" tone="ghost" />
            <ActionButton onClick={() => setModalKind("peek")} label="Olhar" Icon={Eye} tone="ghost" />
            <ActionButton onClick={() => setModalKind("swap")} label="Trocar" Icon={Repeat2} tone="ghost" />
            <ActionButton onClick={() => setModalKind("reveal")} label="Revelar" Icon={Sparkles} tone="ghost" />
            <ActionButton onClick={handleCallDutch} label="DUTCH!" Icon={Flag} tone="gold" />
          </div>
        </div>
      </div>

      {/* Overlay de Memorização Inicial */}
      <AnimatePresence>
        {gameState.phase === "memorize" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-lg"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6 font-display text-4xl font-black text-gradient-neon md:text-6xl"
              >
                MEMORIZE SUAS CARTAS
              </motion.div>
              <p className="mb-8 text-sm uppercase tracking-[0.4em] text-white/60">
                Você pode ver {gameState.yourKnownCards.length} carta(s) por 5 segundos
              </p>
              <div className="flex justify-center gap-4">
                {gameState.yourHand.map((c, i) => (
                  <div key={c.id || i} className="w-24">
                    <div className="gradient-card flex h-36 flex-col justify-between rounded-xl border border-white/20 p-2 glow-neon">
                      <div className="flex justify-between font-display font-bold text-white">
                        <span>{c.value}</span><span>{c.suit}</span>
                      </div>
                      <div className="grid place-items-center text-4xl">{c.suit}</div>
                      <div className="text-right text-xs text-white/70">{c.points}pt</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SpecialCardModal
        open={modalKind !== null}
        kind={modalKind}
        players={gameState.players as any}
        yourHand={gameState.yourHand}
        onClose={() => setModalKind(null)}
        onConfirm={(targetPlayerId, targetCardIndex) => {
          if (modalKind) {
            useSpecial(modalKind, targetPlayerId, targetCardIndex);
            toast.success("Habilidade utilizada!");
          }
          setModalKind(null);
        }}
      />
    </main>
  );
}

function ActionButton({ onClick, label, Icon, tone = "ghost" }: {
  onClick?: () => void; label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  tone?: "neon" | "gold" | "ghost";
}) {
  const styles = {
    neon: "gradient-neon text-black glow-neon",
    gold: "gradient-gold text-black glow-gold",
    ghost: "glass border border-white/10 text-white hover:bg-white/10",
  }[tone];
  return (
    <motion.button
      whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold cursor-pointer", styles)}
    >
      {Icon && <Icon className="h-4 w-4" />}{label}
    </motion.button>
  );
}
