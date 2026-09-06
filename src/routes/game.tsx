import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  LogOut,
  Volume2,
  VolumeX,
  Flag,
  Sparkles,
  Zap,
  Lock,
  MessageSquare,
  Send,
  HelpCircle,
  RefreshCw,
  X,
  Box,
  History,
  Repeat2,
  Trash2,
  Play,
  Eye,
  Target,
  Hash,
  AlertCircle,
  AlertTriangle,
  Trophy,
  Clock,
} from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayerHand } from "@/components/dutch/PlayerHand";
import { Deck, DiscardPile } from "@/components/dutch/Deck";
import { PlayingCard, CardBack } from "@/components/dutch/PlayingCard";
import { TurnIndicator } from "@/components/dutch/TurnIndicator";
import { SpecialCardModal, type SpecialKind } from "@/components/dutch/SpecialCardModal";
import { GameJuiceOverlay } from "@/components/dutch/GameJuiceOverlay";
import { useGame, useRoom, useChat } from "@/lib/socket-client";
import {
  playCardDraw,
  playCardPlace,
  playCardFlip,
  playCardDiscard,
  playMatchSuccess,
  playMatchFail,
  playDutchCall,
  playYourTurn,
  playTimerTick,
  playSpecialPower,
  isSfxMuted,
  toggleSfxMuted,
} from "@/lib/sound-effects";
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
    dutchAlert,
    clearDutchAlert,
    roundResults,
    gameResults,
    drawFromDeck,
    discardDrawnCard,
    swapDrawnCard,
    matchDiscard,
    queenPeek,
    jackSwap,
    skipEffect,
    callDutch,
    syncGame,
    swapEvent,
    clearSwapEvent,
  } = useGame();

  const { messages, sendMessage } = useChat();
  const [chatInput, setChatInput] = useState("");
  const [modalKind, setModalKind] = useState<SpecialKind | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [mutedState, setMutedState] = useState(isSfxMuted());
  const [screenShake, setScreenShake] = useState(false);

  type HistoryType = "swap" | "dutch" | "snap" | "error" | "discard" | "start" | "peek";

  // Mini-histórico de jogadas no canto inferior esquerdo (sem emojis, com ícones Lucide)
  const [historyLogs, setHistoryLogs] = useState<
    Array<{
      id: string;
      time: string;
      text: string;
      isImportant?: boolean;
      type: HistoryType;
    }>
  >([]);

  const addHistoryLog = (text: string, isImportant = false, type: HistoryType = "swap") => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setHistoryLogs((prev) => [
      { id: Math.random().toString(), time, text, isImportant, type },
      ...prev.slice(0, 14),
    ]);
  };

  const renderHistoryIcon = (type: HistoryType) => {
    switch (type) {
      case "swap":
        return <Repeat2 className="h-3 w-3 text-cyan-400 shrink-0" />;
      case "dutch":
        return <Flag className="h-3 w-3 text-amber-400 shrink-0" />;
      case "snap":
        return <Zap className="h-3 w-3 text-yellow-400 fill-current shrink-0" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />;
      case "discard":
        return <Trash2 className="h-3 w-3 text-white/50 shrink-0" />;
      case "start":
        return <Play className="h-3 w-3 text-emerald-400 shrink-0" />;
      case "peek":
        return <Eye className="h-3 w-3 text-purple-400 shrink-0" />;
      default:
        return <Sparkles className="h-3 w-3 text-white/50 shrink-0" />;
    }
  };

  const persistentPlayerId = typeof window !== "undefined" ? localStorage.getItem("dutch_playerId") : null;
  const playerName = (typeof window !== "undefined" ? localStorage.getItem("dutch_playerName") : null) || "Você";
  const me =
    (persistentPlayerId && gameState?.players?.find((p) => p.id === persistentPlayerId)) ||
    gameState?.players?.find((p) => p.name === playerName) ||
    gameState?.players?.[0];
  const isMyTurn = Boolean(gameState?.currentTurnPlayerId && me?.id && gameState.currentTurnPlayerId === me.id);
  const isMeLocked = Boolean(me?.id && gameState?.lockedPlayerIds?.includes(me.id));
  const activePlayer = gameState?.players?.find((p) => p.id === gameState.currentTurnPlayerId) || me;
  const others = gameState?.players ? gameState.players.filter((p) => p.id !== me?.id) : [];

  const prevTurnPlayerIdRef = useRef<string | null>(null);
  const lastTickedSecondRef = useRef<number | null>(null);

  // Estado para troca do Valete na própria mesa (sem modal invasivo)
  const [jackMode, setJackMode] = useState<"prompt" | "selecting-first" | "selecting-second" | null>(null);
  const [jackFirstCard, setJackFirstCard] = useState<{
    playerId: string;
    cardIndex: number;
    playerName: string;
  } | null>(null);

  // Som ao mudar de turno para o jogador
  useEffect(() => {
    if (gameState?.currentTurnPlayerId && me?.id) {
      if (gameState.currentTurnPlayerId === me.id && prevTurnPlayerIdRef.current !== me.id) {
        playYourTurn();
      }
      prevTurnPlayerIdRef.current = gameState.currentTurnPlayerId;
    }
  }, [gameState?.currentTurnPlayerId, me?.id]);

  // Tique-taque nos últimos 5 segundos do turno do jogador
  useEffect(() => {
    if (isMyTurn && gameState?.turnTimeRemaining <= 5 && gameState?.turnTimeRemaining > 0) {
      if (lastTickedSecondRef.current !== gameState.turnTimeRemaining) {
        lastTickedSecondRef.current = gameState.turnTimeRemaining;
        playTimerTick();
      }
    }
  }, [isMyTurn, gameState?.turnTimeRemaining]);

  // Som ao iniciar a fase de memorização inicial
  useEffect(() => {
    if (gameState?.phase === "memorize") {
      playCardFlip();
      addHistoryLog("Rodada iniciada: memorize 2 cartas da sua mão!", false, "start");
    }
  }, [gameState?.phase]);

  // Reage a efeitos especiais pendentes (Q ou J descartados)
  useEffect(() => {
    if (pendingEffect) {
      playSpecialPower();
      if (pendingEffect.effect === "queen-peek") {
        setModalKind("peek");
        toast("Você descartou uma Dama (Q)! Escolha uma carta para espiar.");
      } else if (pendingEffect.effect === "jack-swap") {
        // Para o Valete, não abre modal: pergunta na mesa se deseja trocar
        setModalKind(null);
        setJackMode("prompt");
        setJackFirstCard(null);
      }
    } else {
      setJackMode(null);
      setJackFirstCard(null);
    }
  }, [pendingEffect]);

  // Notificações e Animação de Snap / Descarte Igual com som e tremor
  useEffect(() => {
    if (matchResult) {
      if (matchResult.success) {
        playMatchSuccess();
        addHistoryLog(`${matchResult.playerName} acertou Snap e descartou!`, matchResult.playerId === me?.id, "snap");
        toast.success(matchResult.message, { duration: 4000 });
      } else {
        playMatchFail();
        setScreenShake(true);
        const t = setTimeout(() => setScreenShake(false), 400);
        addHistoryLog(`${matchResult.playerName} errou o Snap (+1 penalidade)`, matchResult.playerId === me?.id, "error");
        toast.error(matchResult.message, { duration: 4000 });
        return () => clearTimeout(t);
      }
    }
  }, [matchResult, me?.id]);

  // Alerta sonoro, tremor de mesa (Screen Shake) e notificação dramática quando alguém chama DUTCH
  useEffect(() => {
    if (dutchAlert) {
      playDutchCall();
      setScreenShake(true);
      const timer = setTimeout(() => setScreenShake(false), 650);
      addHistoryLog(`${dutchAlert.playerName} chamou DUTCH!`, dutchAlert.playerId === me?.id, "dutch");
      toast.warning(`${dutchAlert.playerName} bateu na mesa e chamou DUTCH! Última rodada!`, {
        duration: 8000,
      });
      return () => clearTimeout(timer);
    }
  }, [dutchAlert, me?.id]);

  // Alerta e destaque visual quando qualquer participante troca uma carta (sem modal)
  useEffect(() => {
    if (swapEvent) {
      playCardPlace();
      if (swapEvent.type === "drawn-swap") {
        if (swapEvent.playerId === me?.id) {
          addHistoryLog(`Você substituiu a sua Carta #${swapEvent.handIndex + 1}`, true, "swap");
        } else {
          addHistoryLog(`${swapEvent.playerName} substituiu a Carta #${swapEvent.handIndex + 1} dele`, false, "swap");
          toast.info(`${swapEvent.playerName} comprou do monte e substituiu uma carta da mão`, { duration: 3500 });
        }
      } else if (swapEvent.type === "jack-swap") {
        const wasMeP1 = swapEvent.player1Id === me?.id;
        const wasMeP2 = swapEvent.player2Id === me?.id;
        const isMeActor = swapEvent.playerId === me?.id;

        if (wasMeP1 || wasMeP2) {
          if (isMeActor) {
            addHistoryLog(`Você usou o Valete para trocar cartas na mesa`, true, "swap");
          } else {
            const myCard = wasMeP1 ? swapEvent.cardIndex1 : swapEvent.cardIndex2;
            addHistoryLog(`${swapEvent.playerName} trocou uma carta com a sua Carta #${myCard + 1}!`, true, "swap");
            toast.warning(`${swapEvent.playerName} trocou uma carta com a sua Carta #${myCard + 1}!`, { duration: 5000 });
          }
        } else {
          addHistoryLog(`${swapEvent.playerName} trocou cartas na mesa com o Valete`, false, "swap");
          toast.info(`${swapEvent.playerName} trocou cartas na mesa com o Valete`, { duration: 4000 });
        }
      }
    }
  }, [swapEvent, me?.id]);

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
              className="flex items-center gap-1.5 rounded-full gradient-neon px-6 py-2.5 text-xs font-bold text-black glow-neon hover:scale-105 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sincronizar Partida</span>
            </button>
            <Link to="/lobby" className="inline-block text-xs text-[color:var(--neon)] underline">
              Voltar ao lobby
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
    playCardDraw();
    drawFromDeck();
    toast("Você comprou uma carta do monte");
  };

  const handleDiscardDrawn = () => {
    if (!isMyTurn) return;
    playCardDiscard();
    discardDrawnCard();
    addHistoryLog("Você comprou do monte e descartou", true, "discard");
  };

  const handleSwapCard = (index: number) => {
    if (!isMyTurn) return;
    if (!drawnCard) {
      toast.error("Compre uma carta do monte primeiro para trocar!");
      return;
    }
    playCardPlace();
    swapDrawnCard(index);
    toast.success("Carta trocada e colocada virada para baixo na sua grade.");
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
    playDutchCall();
    callDutch();
    addHistoryLog("Você chamou DUTCH!", true, "dutch");
    toast.success("Você bateu na mesa e chamou DUTCH!");
  };

  const handleCardClickForJack = (targetPlayerId: string, cardIndex: number, targetPlayerName: string) => {
    if (!jackMode || (jackMode !== "selecting-first" && jackMode !== "selecting-second")) return;

    if (jackMode === "selecting-first") {
      playCardFlip();
      setJackFirstCard({ playerId: targetPlayerId, cardIndex, playerName: targetPlayerName });
      setJackMode("selecting-second");
      toast(`1ª carta escolhida (${targetPlayerName}, posição ${cardIndex + 1}). Agora escolha a 2ª carta!`);
    } else if (jackMode === "selecting-second" && jackFirstCard) {
      if (jackFirstCard.playerId === targetPlayerId && jackFirstCard.cardIndex === cardIndex) {
        toast.error("Você selecionou a mesma carta! Escolha outra carta diferente para trocar.");
        return;
      }
      playCardPlace();
      jackSwap(jackFirstCard.playerId, jackFirstCard.cardIndex, targetPlayerId, cardIndex);
      toast.success(`Cartas de ${jackFirstCard.playerName} e ${targetPlayerName} trocadas com sucesso!`);
      setJackMode(null);
      setJackFirstCard(null);
    }
  };

  const handleCancelJack = () => {
    skipEffect();
    setJackMode(null);
    setJackFirstCard(null);
    toast("Efeito do Valete cancelado.");
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

        <TurnIndicator
          name={activePlayer?.name || "Jogador"}
          seconds={gameState.turnTimeRemaining}
          isMyTurn={isMyTurn}
        />

        <div className="flex items-center gap-2">
          {/* Botão de Som Mute/Unmute */}
          <button
            onClick={() => {
              const nextMuted = toggleSfxMuted();
              setMutedState(nextMuted);
              if (!nextMuted) playCardDraw();
            }}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10 transition-colors cursor-pointer",
              mutedState ? "text-red-400 border border-red-500/30" : "text-white/80"
            )}
            title={mutedState ? "Ativar efeitos sonoros" : "Desativar efeitos sonoros"}
          >
            {mutedState ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10 text-white/80 cursor-pointer"
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

      {/* Barra de Aviso de Dutch Ativo */}
      {gameState.phase === "dutch-called" && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-20 w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black py-1.5 px-4 text-center font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 animate-pulse"
        >
          <Flag className="h-4 w-4 shrink-0" />
          <span>
            DUTCH ATIVO: {gameState.players.find((p) => p.id === gameState.dutchCallerId)?.name || "Alguém"} BATEU NA MESA! ESTA É A ÚLTIMA RODADA PARA TODOS OS OUTROS!
          </span>
          <Flag className="h-4 w-4 shrink-0" />
        </motion.div>
      )}

      {/* Área da Mesa com Efeito de Tremor (Screen Shake) e GameJuice */}
      <motion.div
        animate={
          screenShake
            ? {
                x: [0, -14, 14, -10, 10, -6, 6, -2, 0],
                y: [0, 8, -8, 6, -6, 3, -3, 1, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto h-[calc(100vh-65px)] max-w-5xl p-2 flex flex-col justify-between overflow-hidden"
      >
        <GameJuiceOverlay dutchAlert={dutchAlert} matchResult={matchResult} />

        {/* Oponentes ao redor do topo da mesa */}
        <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-1 z-10">
          {others.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-2xl glass px-3 py-1.5 transition-all shadow-md",
                gameState.currentTurnPlayerId === p.id
                  ? "ring-2 ring-[color:var(--neon)] glow-neon bg-black/60 scale-105"
                  : p.isLocked || p.id === gameState.dutchCallerId
                    ? "border-2 border-amber-400/80 bg-amber-500/20 glow-gold shadow-lg"
                    : "border border-white/10 bg-black/30",
              )}
            >
              <PlayerAvatar
                name={p.name}
                avatar={p.avatar}
                size="sm"
                isActive={gameState.currentTurnPlayerId === p.id}
                score={p.score}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-white/90 truncate max-w-[80px]">{p.name}</span>
                  {p.isBot && (
                    <span className="text-[8px] bg-sky-500/20 text-sky-300 font-bold px-1 rounded">
                      BOT
                    </span>
                  )}
                </div>
                {p.isLocked || p.id === gameState.dutchCallerId ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-300 uppercase tracking-wider bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40 animate-pulse">
                    <Lock className="h-2.5 w-2.5" /> Bateu Dutch!
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50">{p.cardsCount} cartas</span>
                )}
              </div>

              {/* Mini grade 2x2 de cartas do oponente */}
              <div className={cn(p.cardsCount <= 4 ? "grid grid-cols-2 gap-1" : "flex -space-x-2", "scale-85 origin-right")}>
                {Array.from({ length: p.cardsCount }).map((_, cardIdx) => {
                  const isFirstSelected = jackFirstCard?.playerId === p.id && jackFirstCard?.cardIndex === cardIdx;
                  const canSelectForJack = (jackMode === "selecting-first" || jackMode === "selecting-second") && !p.isLocked;
                  return (
                    <div
                      key={cardIdx}
                      onClick={canSelectForJack ? () => handleCardClickForJack(p.id, cardIdx, p.name) : undefined}
                      className={cn(
                        "relative transition-all rounded-md",
                        canSelectForJack && "cursor-pointer hover:scale-115 hover:z-20 hover:brightness-125",
                        canSelectForJack && !isFirstSelected && "ring-1 ring-yellow-400/80 shadow-[0_0_8px_rgba(250,204,21,0.5)] animate-pulse",
                        isFirstSelected && "ring-2 ring-yellow-400 scale-115 shadow-[0_0_15px_rgba(250,204,21,0.9)] z-20",
                      )}
                      title={canSelectForJack ? `Selecionar carta de ${p.name}` : undefined}
                    >
                      {isFirstSelected && (
                        <span className="absolute -top-2 -right-1 text-[8px] bg-yellow-400 text-black font-black px-1 rounded-full shadow z-30 animate-bounce">
                          1ª
                        </span>
                      )}
                      <CardBack size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Centro da Mesa: Monte, Descarte e Carta Comprada (Layout 2D Limpo e Ultra-Rápido) */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-1">
          <div className="flex items-center gap-4 sm:gap-6 rounded-3xl glass-strong px-6 py-3 border border-white/15 shadow-2xl bg-black/40 backdrop-blur-xl">
            {/* Monte de Compras */}
            <div className="flex flex-col items-center gap-1">
              <Deck
                count={gameState.deckCount}
                onClick={isMyTurn && !drawnCard ? handleDrawDeck : undefined}
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                Monte ({gameState.deckCount})
              </span>
            </div>

            {/* Carta Comprada no Turno (quando ativa) */}
            <AnimatePresence>
              {drawnCard && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl bg-[color:var(--neon)]/10 border-2 border-[color:var(--neon)] glow-neon shadow-2xl"
                >
                  <span className="text-[9px] uppercase font-black tracking-widest text-[color:var(--neon)] flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Carta Comprada
                  </span>
                  <PlayingCard card={drawnCard} size="md" />
                  <span className="text-xs font-bold text-white">
                    {drawnCard.value} de {drawnCard.suit} ({drawnCard.points} pts)
                  </span>
                  {drawnCard.value === "Q" && (
                    <span className="text-[9px] font-bold text-[color:var(--neon)] flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Dama: Espie uma carta ao descartar!
                    </span>
                  )}
                  {drawnCard.value === "J" && (
                    <span className="text-[9px] font-bold text-yellow-300 flex items-center gap-1">
                      <Repeat2 className="h-3 w-3" /> Valete: Troque 2 cartas na mesa!
                    </span>
                  )}
                  <button
                    onClick={handleDiscardDrawn}
                    className="mt-1 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/50 px-3 py-1 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Descartar {drawnCard.value}{drawnCard.suit} sem trocar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Monte de Descarte */}
            <div className="flex flex-col items-center gap-1">
              <DiscardPile
                top={gameState.discardTop || { id: "top", value: "A", suit: "♠", points: 1 }}
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
                Descarte
              </span>
            </div>
          </div>

          {/* Botões de Ação do Turno (quando ainda não comprou) */}
          {isMyTurn && !drawnCard && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
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
            </div>
          )}

          {/* Valete (J): Prompt na mesa para escolher se quer trocar cartas */}
          <AnimatePresence>
            {jackMode === "prompt" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: -5 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 glow-yellow shadow-2xl backdrop-blur-xl max-w-md text-center mt-3 z-30"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                  <Repeat2 className="h-4 w-4" />
                  <span>Efeito do Valete Descartado!</span>
                </div>
                <p className="text-xs text-white/90">
                  Você descartou um Valete (J). Deseja trocar a posição de duas cartas quaisquer na mesa?
                </p>
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      setJackMode("selecting-first");
                      setJackFirstCard(null);
                      toast("Passo 1: Clique na 1ª carta na mesa (sua ou de um oponente)");
                    }}
                    className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Sim, trocar cartas
                  </button>
                  <button
                    onClick={handleCancelJack}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" /> Não, pular efeito
                  </button>
                </div>
              </motion.div>
            )}

            {(jackMode === "selecting-first" || jackMode === "selecting-second") && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-black/80 border-2 border-yellow-400 shadow-2xl backdrop-blur-xl max-w-lg w-full mt-3 z-30"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-yellow-400 text-black font-black text-sm shrink-0 shadow">
                    {jackMode === "selecting-first" ? "1/2" : "2/2"}
                  </span>
                  <div>
                    <div className="text-xs font-black text-yellow-300 uppercase tracking-wide">
                      {jackMode === "selecting-first" ? "Passo 1: Escolha a 1ª carta" : "Passo 2: Escolha a 2ª carta"}
                    </div>
                    <div className="text-[11px] text-white/80">
                      {jackMode === "selecting-first" ? (
                        "Clique em qualquer carta na mesa (sua grade ou de um oponente)"
                      ) : (
                        <span>
                          1ª selecionada: <strong className="text-yellow-300">{jackFirstCard?.playerName} (Carta {(jackFirstCard?.cardIndex ?? 0) + 1})</strong>. Agora clique na 2ª carta para trocar!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCancelJack}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Sua Área: Cartas dispostas lado a lado na horizontal */}
        <div className="relative z-10 flex flex-col items-center gap-1 pb-2">
          {drawnCard && (
            <div className="text-xs font-black uppercase tracking-widest text-[color:var(--neon)] animate-bounce flex items-center gap-1.5 bg-black/70 px-3.5 py-1 rounded-full border border-[color:var(--neon)]/50 shadow-lg">
              Clique em uma das suas cartas para substituir
            </div>
          )}

          {isMeLocked && (
            <div className="text-xs font-black uppercase tracking-widest text-amber-300 animate-pulse flex items-center gap-1.5 bg-amber-950/85 px-4 py-1.5 rounded-full border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
              <Lock className="h-3.5 w-3.5 text-amber-400" /> VOCÊ BATEU NA MESA E CHAMOU DUTCH! Suas cartas estão travadas
            </div>
          )}

          {jackMode && (
            <div className="text-xs font-black uppercase tracking-widest text-yellow-300 animate-pulse flex items-center gap-1.5 bg-black/80 px-4 py-1.5 rounded-full border border-yellow-400/60 shadow-lg">
              <Repeat2 className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              <span>
                {jackMode === "prompt"
                  ? "Responda se deseja usar o poder do Valete acima"
                  : jackMode === "selecting-first"
                    ? "Passo 1: Clique na 1ª carta (sua ou de um oponente)"
                    : "Passo 2: Clique na 2ª carta para concluir a troca"}
              </span>
            </div>
          )}

          <PlayerHand
            cards={gameState.yourHand}
            faceDown
            revealedIndexes={gameState.yourKnownCards}
            size="md"
            layout="row"
            isLocked={isMeLocked}
            canMatch={!!gameState.discardTop}
            swapActive={Boolean(drawnCard || jackMode === "selecting-first" || jackMode === "selecting-second")}
            selectedIndex={jackFirstCard?.playerId === me?.id ? jackFirstCard.cardIndex : undefined}
            onCardClick={(index: number) => {
              if (drawnCard) {
                handleSwapCard(index);
              } else if (jackMode === "selecting-first" || jackMode === "selecting-second") {
                handleCardClickForJack(me?.id || "", index, "Você");
              }
            }}
            onMatchClick={handleMatchSnap}
          />
        </div>

        {/* Histórico Pequeno no Canto Inferior Esquerdo (sem revelar valor das cartas) */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-20 pointer-events-auto max-w-[200px] sm:max-w-[250px] origin-bottom-left scale-90 sm:scale-100 hidden sm:block">
          <div className="rounded-2xl glass-strong border border-white/10 bg-black/65 backdrop-blur-xl shadow-2xl p-2.5 text-xs transition-all">
            <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-white/10">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/70">
                <History className="h-3 w-3 text-[color:var(--neon)]" /> Histórico
              </span>
              <span className="text-[9px] text-white/40 font-mono">
                {historyLogs.length > 0 ? "ao vivo" : "em espera"}
              </span>
            </div>

            {historyLogs.length === 0 ? (
              <p className="text-[10px] text-white/40 italic py-1">As jogadas aparecerão aqui...</p>
            ) : (
              <div className="space-y-1 max-h-[85px] sm:max-h-[115px] overflow-y-auto pr-1">
                {historyLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-start gap-1.5 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] leading-tight transition-all",
                      log.isImportant
                        ? "bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold"
                        : "bg-white/5 border border-white/5 text-white/75"
                    )}
                  >
                    <span className="shrink-0 mt-0.5">{renderHistoryIcon(log.type)}</span>
                    <span className="flex-1 min-w-0 break-words">{log.text}</span>
                    <span className="text-[8px] text-white/30 shrink-0 font-mono mt-0.5">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Overlay de Memorização Inicial (2 cartas visíveis por 5 segundos) */}
      <AnimatePresence>
        {gameState.phase === "memorize" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 grid place-items-center bg-black/85 backdrop-blur-xl"
          >
            <div className="text-center max-w-lg px-4">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 font-display text-3xl font-black text-gradient-neon md:text-5xl"
              >
                MEMORIZE SUAS CARTAS
              </motion.div>
              <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/70">
                Você pode ver 2 cartas por 5 segundos
              </p>
              <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
                {gameState.yourHand.map((c, i) => {
                  const isVisible = gameState.yourKnownCards.includes(i);
                  return (
                    <div key={c.id || i} className="flex flex-col items-center">
                      {isVisible ? (
                        <PlayingCard card={c} size="md" />
                      ) : (
                        <CardBack size="md" />
                      )}
                      <span className="mt-1.5 text-[10px] uppercase font-bold text-white/70">
                        Carta {i + 1}
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
          skipEffect();
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
                <button onClick={() => setShowRules(false)} className="text-white/60 hover:text-white p-1 rounded-lg transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs space-y-3 text-white/80 max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex items-start gap-2.5">
                  <Target className="h-4 w-4 text-[color:var(--neon)] shrink-0 mt-0.5" />
                  <p><strong>Objetivo</strong>: Ter a menor soma de pontos nas 4 cartas viradas para baixo à sua frente.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Hash className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p><strong>Valores das Cartas</strong>: Ás = 1 pt | 2 a 10 = valor nominal | Valete = 11 pts | Dama = 12 pts | <strong>Reis Pretos (&spades;, &clubs;) = 0 pts!</strong> | Reis Vermelhos (&hearts;, &diams;) = 13 pts.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Eye className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <p><strong>Dama (Q)</strong>: Ao descartar, espie uma de suas cartas viradas para baixo.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Repeat2 className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p><strong>Valete (J)</strong>: Ao descartar, você pode trocar quaisquer 2 cartas na mesa (sua com oponente, ou entre dois oponentes).</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p><strong>Descarte Igual (Snap)</strong>: A qualquer momento, se souber que tem uma carta igual à do topo do descarte, clique no botão de Snap nela para descartá-la e ficar com uma carta a menos! Se errar, recebe +1 carta de penalidade.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Flag className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p><strong>Bater / DUTCH</strong>: Quando achar que tem a menor pontuação, bata em vez de comprar. Suas cartas ficam <strong>travadas</strong> e os outros têm mais 1 rodada!</p>
                </div>
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




      {/* Modal de Alerta Gigante e Dramático quando alguém chama DUTCH */}
      <AnimatePresence>
        {dutchAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md px-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="glass-strong relative w-full max-w-md rounded-3xl p-6 sm:p-8 text-center border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.6)] space-y-4"
            >
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-400/50 shadow-inner animate-bounce">
                <Flag className="h-10 w-10 text-amber-400" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-[0.25em] mb-2">
                  BATIDA NA MESA!
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-black text-amber-300">
                  {dutchAlert.playerName} chamou DUTCH!
                </h2>
              </div>
              <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-white/90 space-y-2 leading-relaxed text-left">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Lock className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>As cartas de {dutchAlert.playerName} foram TRAVADAS!</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    Todos os outros jogadores têm exatamente <strong>mais 1 último turno</strong> antes da contagem dos pontos!
                  </span>
                </div>
              </div>
              <button
                onClick={clearDutchAlert}
                className="w-full rounded-2xl gradient-gold py-3.5 font-display text-sm font-black text-black shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                ENTENDI! VAMOS PARA A ÚLTIMA RODADA
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
