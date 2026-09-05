import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  LogOut,
  Volume2,
  Flag,
  Sparkles,
  Zap,
  Lock,
  MessageSquare,
  Send,
  HelpCircle,
} from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayerHand } from "@/components/dutch/PlayerHand";
import { Deck, DiscardPile } from "@/components/dutch/Deck";
import { PlayingCard, CardBack } from "@/components/dutch/PlayingCard";
import { TurnIndicator } from "@/components/dutch/TurnIndicator";
import { SpecialCardModal, type SpecialKind } from "@/components/dutch/SpecialCardModal";
import { useGame, useRoom, useChat } from "@/lib/socket-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Mesa — DUTCH" },
      { name: "description", content: "Partida de Dutch em tempo real: compre, descarte, troque e chame Dutch!" },
      { property: "og:title", content: "Mesa — DUTCH" },
      { property: "og:description", content: "Partida online de DUTCH com regras clássicas completas." },
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
    pendingEffect,
    setPendingEffect,
    matchResult,
    roundResults,
    gameResults,
    drawFromDeck,
    discardDrawnCard,
    swapDrawnCard,
    matchDiscard,
    queenPeek,
    jackSwap,
    callDutch,
    syncGame,
  } = useGame();

  const { messages, sendMessage } = useChat();
  const [chatInput, setChatInput] = useState("");
  const [modalKind, setModalKind] = useState<SpecialKind | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [activeMatchModal, setActiveMatchModal] = useState<any>(null);

  // Reage a efeitos especiais pendentes (Q ou J descartados)
  useEffect(() => {
    if (pendingEffect) {
      if (pendingEffect.effect === "queen-peek") {
        setModalKind("peek");
        toast("Você descartou uma Dama (Q)! Escolha uma carta para espiar.", { icon: "👁️" });
      } else if (pendingEffect.effect === "jack-swap") {
        setModalKind("swap");
        toast("Você descartou um Valete (J)! Escolha 2 cartas na mesa para trocar.", { icon: "🃏" });
      }
    }
  }, [pendingEffect]);

  // Notificações e Animação de Snap / Descarte Igual
  useEffect(() => {
    if (matchResult) {
      setActiveMatchModal(matchResult);
      if (matchResult.success) {
        toast.success(matchResult.message, { icon: "⚡" });
      } else {
        toast.error(matchResult.message, { icon: "❌" });
      }
      const timer = setTimeout(() => setActiveMatchModal(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [matchResult]);

  // Redirecionamentos de fim de rodada / jogo
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

  if (!gameState) {
    return (
      <main className="relative min-h-screen grid place-items-center bg-black/80">
        <div className="text-center space-y-4">
          <DutchLogo size="lg" />
          <p className="text-white/60 animate-pulse">Carregando dados da partida...</p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={() => syncGame()}
              className="rounded-full gradient-neon px-6 py-2.5 text-xs font-bold text-black glow-neon hover:scale-105 transition-all"
            >
              🔄 Sincronizar Partida
            </button>
            <Link to="/lobby" className="inline-block text-xs text-[color:var(--neon)] underline">
              Voltar ao lobby
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const persistentPlayerId = typeof window !== "undefined" ? localStorage.getItem("dutch_playerId") : null;
  const playerName = (typeof window !== "undefined" ? localStorage.getItem("dutch_playerName") : null) || "Você";
  const me =
    (persistentPlayerId && gameState.players.find((p) => p.id === persistentPlayerId)) ||
    gameState.players.find((p) => p.name === playerName) ||
    gameState.players[0];
  const isMyTurn = gameState.currentTurnPlayerId === me?.id;
  const isMeLocked = gameState.lockedPlayerIds?.includes(me?.id);
  const activePlayer = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId) || me;

  const others = gameState.players.filter((p) => p.id !== me?.id);
  const positions = [
    "top-4 left-1/2 -translate-x-1/2", // top center
    "top-1/3 left-4 -translate-y-1/2", // left
    "top-1/3 right-4 -translate-y-1/2", // right
    "top-16 left-1/4", // top-left
    "top-16 right-1/4", // top-right
  ];

  const handleDrawDeck = () => {
    if (!isMyTurn) {
      toast.error("Não é o seu turno!");
      return;
    }
    if (drawnCard) {
      toast.error("Você já comprou uma carta neste turno!");
      return;
    }
    drawFromDeck();
    toast("Você comprou uma carta do monte", { icon: "🃏" });
  };

  const handleDiscardDrawn = () => {
    if (!isMyTurn) return;
    discardDrawnCard();
  };

  const handleSwapCard = (index: number) => {
    if (!isMyTurn) return;
    if (!drawnCard) {
      toast.error("Compre uma carta do monte primeiro para trocar!");
      return;
    }
    swapDrawnCard(index);
    toast.success("Carta trocada com sua grade!");
  };

  const handleMatchSnap = (index: number) => {
    if (!gameState.discardTop) {
      toast.error("Ainda não há cartas no descarte para parear!");
      return;
    }
    if (isMeLocked) {
      toast.error("Suas cartas estão travadas!");
      return;
    }
    matchDiscard(index);
  };

  const handleCallDutch = () => {
    if (!isMyTurn) {
      toast.error("Você só pode chamar DUTCH no seu turno e antes de comprar!");
      return;
    }
    if (drawnCard) {
      toast.error("Você já comprou carta! Chame DUTCH no início do seu próximo turno.");
      return;
    }
    callDutch();
    toast.success("Você bateu na mesa e chamou DUTCH! 🚩");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput.trim());
    setChatInput("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden select-none">
      {/* Backdrop de mesa de feltro */}
      <div className="absolute inset-0 gradient-felt" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, oklch(0 0 0 / 0.65) 100%)",
        }}
      />

      {/* Barra Superior */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link to="/lobby" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <DutchLogo size="sm" />
        </div>

        <TurnIndicator name={activePlayer.name} seconds={gameState.turnTimeRemaining} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10 text-white/80"
            title="Regras do Dutch"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Drawer de Chat */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="relative grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10 text-white/80 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black/90 border-l border-white/15 text-white flex flex-col p-4 w-80">
              <SheetHeader>
                <SheetTitle className="text-white text-base font-bold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[color:var(--neon)]" /> Chat da Partida
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 my-4 pr-1 text-xs">
                {messages.length === 0 ? (
                  <p className="text-white/40 text-center italic mt-10">Nenhuma mensagem ainda.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl p-2.5",
                        m.system
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
                          : "bg-white/5 border border-white/10",
                      )}
                    >
                      <div className="flex justify-between items-center text-[10px] text-white/50 mb-1">
                        <span className="font-bold text-white/80">{m.author}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="break-words">{m.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="bg-white/5 border-white/15 text-xs text-white"
                />
                <button
                  type="submit"
                  className="grid h-9 w-9 place-items-center rounded-xl gradient-neon text-black shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </SheetContent>
          </Sheet>

          <Link to="/lobby" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10 text-white/80">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Área da Mesa */}
      <div className="relative mx-auto h-[calc(100vh-65px)] max-w-6xl p-2 flex flex-col justify-between">
        {/* Oponentes ao redor da mesa com suas cartas em grade */}
        <div className="relative w-full h-44">
          {others.map((p, i) => (
            <div key={p.id} className={cn("absolute z-10", positions[i % positions.length])}>
              <div
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl glass px-3 py-2 transition-all shadow-xl",
                  gameState.currentTurnPlayerId === p.id
                    ? "ring-2 ring-[color:var(--neon)] glow-neon bg-black/60"
                    : p.isLocked
                      ? "border border-amber-500/40 bg-amber-500/10"
                      : "border border-white/10 bg-black/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <PlayerAvatar
                    name={p.name}
                    avatar={p.avatar}
                    size="sm"
                    isActive={gameState.currentTurnPlayerId === p.id}
                    score={p.score}
                  />
                  {p.isLocked && (
                    <span className="flex items-center gap-1 text-[9px] font-extrabold text-amber-300 uppercase tracking-wider">
                      <Lock className="h-2.5 w-2.5" /> Dutch
                    </span>
                  )}
                </div>

                {/* Grade 2x2 de cartas viradas para baixo do oponente */}
                <div className={cn(p.cardsCount <= 4 ? "grid grid-cols-2 gap-1.5" : "flex -space-x-3")}>
                  {Array.from({ length: p.cardsCount }).map((_, cardIdx) => (
                    <div key={cardIdx} className="scale-75">
                      <CardBack size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Centro: Monte de Compras + Descarte + Botão de Descarte Igual */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="flex items-center gap-6 rounded-3xl glass-strong px-8 py-5 border border-white/15 shadow-2xl bg-black/40 backdrop-blur-xl">
            {/* Monte de Compras */}
            <div className="flex flex-col items-center gap-1.5">
              <Deck
                count={gameState.deckCount}
                onClick={isMyTurn && !drawnCard ? handleDrawDeck : undefined}
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                Monte ({gameState.deckCount})
              </span>
            </div>

            {/* Monte de Descarte */}
            <div className="flex flex-col items-center gap-1.5">
              <DiscardPile
                top={gameState.discardTop || { id: "top", value: "A", suit: "♠", points: 1 }}
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                Descarte
              </span>
            </div>
          </div>

          {/* Dica rápida de Snap */}
          {gameState.discardTop && !isMeLocked && (
            <div className="mt-2 text-[11px] font-bold text-yellow-300/80 flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 backdrop-blur-md">
              <Zap className="h-3 w-3 fill-current" />
              Sabe que tem uma carta igual a {gameState.discardTop.value}? Clique no raio ⚡ para descartar (Snap)!
            </div>
          )}
        </div>

        {/* Sua Área (Parte Inferior com Grade 2x2) */}
        <div className="relative z-10 flex flex-col items-center gap-3 pb-2">
          {/* Banner de Carta Comprada (quando o jogador comprou no seu turno) */}
          <AnimatePresence>
            {drawnCard && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-2 rounded-3xl glass-strong border-2 border-[color:var(--neon)] p-3 shadow-2xl max-w-md w-full text-center bg-black/80 backdrop-blur-xl"
              >
                <div className="text-[11px] uppercase tracking-widest text-[color:var(--neon)] font-extrabold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Carta Comprada do Monte
                </div>
                <div className="flex items-center gap-4 w-full justify-center">
                  <PlayingCard card={drawnCard} size="md" />
                  <div className="text-left space-y-1">
                    <div className="text-sm font-bold text-white">
                      {drawnCard.value} de {drawnCard.suit} ({drawnCard.points} pts)
                    </div>
                    {drawnCard.value === "Q" && (
                      <div className="text-[11px] text-[color:var(--neon)] font-semibold">
                        👁️ Dama: Ao descartar, você poderá espiar uma de suas cartas!
                      </div>
                    )}
                    {drawnCard.value === "J" && (
                      <div className="text-[11px] text-yellow-300 font-semibold">
                        🃏 Valete: Ao descartar, você poderá trocar 2 cartas quaisquer na mesa!
                      </div>
                    )}
                    <p className="text-[11px] text-white/70">
                      👉 Clique em uma das suas cartas abaixo na grade para <strong>Trocar</strong>, ou descarte-a direto.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDiscardDrawn}
                  className="w-full rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 py-2 text-xs font-bold transition-all cursor-pointer"
                >
                  Descartar {drawnCard.value}{drawnCard.suit} sem trocar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sua Grade de Cartas 2x2 */}
          <div className="flex flex-col items-center">
            {drawnCard && (
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--neon)] animate-bounce mb-1">
                👇 Clique na carta abaixo que deseja substituir 👇
              </div>
            )}
            <PlayerHand
              cards={gameState.yourHand}
              faceDown
              revealedIndexes={gameState.yourKnownCards}
              size="lg"
              layout="grid"
              isLocked={isMeLocked}
              canMatch={!!gameState.discardTop}
              onCardClick={(index: number) => {
                if (drawnCard) {
                  handleSwapCard(index);
                }
              }}
              onMatchClick={handleMatchSnap}
            />
          </div>

          {/* Botões de Ação do Turno */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {isMyTurn && !drawnCard && (
              <>
                <ActionButton
                  onClick={handleDrawDeck}
                  label="Comprar do Monte"
                  tone="neon"
                />
                {!isMeLocked && gameState.dutchCallerId === null && (
                  <ActionButton
                    onClick={handleCallDutch}
                    label="BATER NA MESA (DUTCH!)"
                    Icon={Flag}
                    tone="gold"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlay de Memorização Inicial (2 cartas visíveis por 5 segundos) */}
      <AnimatePresence>
        {gameState.phase === "memorize" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 grid place-items-center bg-black/85 backdrop-blur-xl"
          >
            <div className="text-center max-w-md px-4">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 font-display text-3xl font-black text-gradient-neon md:text-5xl"
              >
                MEMORIZE SUAS CARTAS
              </motion.div>
              <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/70">
                Você pode ver 2 cartas da sua grade por 5 segundos
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                {gameState.yourHand.map((c, i) => {
                  const isVisible = gameState.yourKnownCards.includes(i);
                  return (
                    <div key={c.id || i} className="flex flex-col items-center">
                      {isVisible ? (
                        <PlayingCard card={c} size="md" />
                      ) : (
                        <CardBack size="md" />
                      )}
                      <span className="mt-1 text-[9px] uppercase font-bold text-white/50">
                        {i === 0 ? "Cima Esq" : i === 1 ? "Cima Dir" : i === 2 ? "Baixo Esq" : "Baixo Dir"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Habilidade Especial (Dama para Olhar / Valete para Trocar 2 cartas) */}
      <SpecialCardModal
        open={modalKind !== null}
        kind={modalKind}
        players={gameState.players}
        myPlayerId={me?.id || ""}
        yourHand={gameState.yourHand}
        onClose={() => {
          setModalKind(null);
          setPendingEffect(null);
        }}
        onConfirmPeek={(cardIndex) => {
          queenPeek(cardIndex);
          toast.success("Você espiou a carta! Ela ficará visível por 5 segundos.");
          setModalKind(null);
        }}
        onConfirmJackSwap={(p1Id, idx1, p2Id, idx2) => {
          jackSwap(p1Id, idx1, p2Id, idx2);
          toast.success("Cartas trocadas com o Valete!");
          setModalKind(null);
        }}
      />

      {/* Modal explicativo das regras */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md px-4"
          >
            <div className="glass-strong max-w-md w-full rounded-3xl p-6 border border-white/15 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-[color:var(--neon)]">Regras do DUTCH</h3>
                <button onClick={() => setShowRules(false)} className="text-white/60 hover:text-white">✕</button>
              </div>
              <div className="text-xs space-y-2.5 text-white/80 max-h-[60vh] overflow-y-auto pr-1">
                <p>🎯 <strong>Objetivo</strong>: Ter a menor soma de pontos nas 4 cartas viradas para baixo à sua frente.</p>
                <p>🔢 <strong>Valores das Cartas</strong>: Ás = 1 pt | 2 a 10 = valor nominal | Valete = 11 pts | Dama = 12 pts | <strong>Reis Pretos (♠, ♣) = -1 pt!</strong> | Reis Vermelhos (♥, ♦) = 13 pts.</p>
                <p>👁️ <strong>Dama (Q)</strong>: Ao descartar, espie uma de suas cartas viradas para baixo.</p>
                <p>🃏 <strong>Valete (J)</strong>: Ao descartar, troque quaisquer 2 cartas na mesa (sua com oponente, ou entre dois oponentes).</p>
                <p>⚡ <strong>Descarte Igual (Snap)</strong>: A qualquer momento, se souber que tem uma carta igual à do topo do descarte, clique no raio ⚡ nela para descartá-la e ficar com uma carta a menos! Se errar, recebe +1 carta de penalidade.</p>
                <p>🚩 <strong>Bater / DUTCH</strong>: Quando achar que tem a menor pontuação, bata em vez de comprar. Suas cartas ficam <strong>travadas 🔒</strong> e os outros têm mais 1 rodada!</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full rounded-full gradient-neon py-2 font-display text-xs font-bold text-black"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Revelação do Descarte Igual (Snap) */}
      <AnimatePresence>
        {activeMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md px-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className={cn(
                "glass-strong relative w-full max-w-sm rounded-3xl p-6 text-center border shadow-2xl space-y-4",
                activeMatchModal.success
                  ? "border-[color:var(--neon)] glow-neon bg-emerald-950/50"
                  : "border-red-500/50 glow-red bg-rose-950/50",
              )}
            >
              <div className="text-center space-y-1">
                <div
                  className={cn(
                    "text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5",
                    activeMatchModal.success ? "text-[color:var(--neon)]" : "text-red-400",
                  )}
                >
                  <Zap className="h-4 w-4 fill-current" />
                  {activeMatchModal.success ? "Acertou o Par!" : "Errou o Par!"}
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  {activeMatchModal.playerId === me?.id ? "Você tentou o Snap" : `${activeMatchModal.playerName} tentou o Snap`}
                </h3>
              </div>

              {/* Comparação das Cartas */}
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-white/60">Sua Carta</span>
                  <PlayingCard card={activeMatchModal.card} size="md" />
                </div>
                <div className="text-lg font-black text-white/40">
                  {activeMatchModal.success ? "=" : "≠"}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-white/60">Topo do Descarte</span>
                  <PlayingCard card={activeMatchModal.topDiscard} size="md" />
                </div>
              </div>

              {/* Mensagem e Consequência */}
              <div
                className={cn(
                  "rounded-2xl p-3 text-xs font-semibold",
                  activeMatchModal.success
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-200 border border-red-500/30",
                )}
              >
                {activeMatchModal.success ? (
                  <p>🎉 <strong>Acerto perfeito!</strong> A carta foi descartada. Sua grade agora tem apenas <strong>{activeMatchModal.newCount}</strong> carta(s).</p>
                ) : (
                  <p>⚠️ <strong>Penalidade!</strong> As cartas eram diferentes ({activeMatchModal.card.value} ≠ {activeMatchModal.topDiscard.value}). Você comprou <strong>+1 carta de penalidade</strong> do monte!</p>
                )}
              </div>

              <button
                onClick={() => setActiveMatchModal(null)}
                className={cn(
                  "w-full rounded-full py-2.5 font-display text-xs font-bold text-black cursor-pointer transition-all",
                  activeMatchModal.success ? "gradient-neon" : "bg-white hover:bg-white/90",
                )}
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ActionButton({
  onClick,
  label,
  Icon,
  tone = "ghost",
}: {
  onClick?: () => void;
  label: string;
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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold cursor-pointer transition-all", styles)}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </motion.button>
  );
}
