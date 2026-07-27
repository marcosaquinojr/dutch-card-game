import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, Volume2, Flag, Sparkles, Repeat2, Eye, MessageSquare } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { PlayerHand } from "@/components/dutch/PlayerHand";
import { Deck, DiscardPile } from "@/components/dutch/Deck";
import { TurnIndicator } from "@/components/dutch/TurnIndicator";
import { SpecialCardModal, type SpecialKind } from "@/components/dutch/SpecialCardModal";
import { MOCK_PLAYERS, randomCard, type CardModel } from "@/lib/dutch-mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const players = useMemo(() => MOCK_PLAYERS.slice(0, 4), []);
  const you = players[0];

  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const cardsPerHand = you.hand.length;
  const initialVisibleCount = cardsPerHand <= 4 ? 1 : 2;
  const visibleIdx = useMemo(
    () => Array.from({ length: initialVisibleCount }, (_, i) => i),
    [initialVisibleCount],
  );

  const [revealed, setRevealed] = useState<number[]>([]);
  const [discardTop, setDiscardTop] = useState<CardModel>(() => randomCard());
  const [turnIdx, setTurnIdx] = useState(0);
  const [seconds, setSeconds] = useState(45);
  const [modalKind, setModalKind] = useState<SpecialKind | null>(null);
  const [deckCount, setDeckCount] = useState(24);

  // Intro sequence
  useEffect(() => {
    if (phase !== "intro") return;
    const t1 = setTimeout(() => setRevealed(visibleIdx), 900);
    const t2 = setTimeout(() => setRevealed([]), 4200);
    const t3 = setTimeout(() => setPhase("playing"), 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase, visibleIdx]);

  // Turn timer
  useEffect(() => {
    if (phase !== "playing") return;
    setSeconds(45);
    const i = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setTurnIdx((t) => (t + 1) % players.length);
          return 45;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [turnIdx, phase, players.length]);

  const activePlayer = players[turnIdx];

  function handleDraw() {
    setDeckCount((c) => Math.max(0, c - 1));
    toast("Você comprou uma carta", { icon: "🃏" });
  }
  function handleDiscard() {
    setDiscardTop(randomCard());
    toast.success("Descarte atualizado");
  }
  function nextTurn() {
    setTurnIdx((t) => (t + 1) % players.length);
  }
  function callDutch() {
    toast("Você chamou DUTCH!", { description: "Todos verão suas cartas ao final da rodada." });
    setTimeout(() => nav({ to: "/round-end" }), 800);
  }

  // Position other players around the table
  const others = players.slice(1);
  const positions = [
    "top-6 left-1/2 -translate-x-1/2",        // top center
    "top-1/2 left-6 -translate-y-1/2",        // left
    "top-1/2 right-6 -translate-y-1/2",       // right
    "top-24 left-1/4",                         // top-left
    "top-24 right-1/4",                        // top-right
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Table backdrop */}
      <div className="absolute inset-0 gradient-felt" />
      <div className="pointer-events-none absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 45%, oklch(0 0 0 / 0.6) 100%)",
      }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Link to="/lobby" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <DutchLogo size="sm" />
        </div>
        <TurnIndicator name={activePlayer.name} seconds={seconds} />
        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10"><Volume2 className="h-4 w-4" /></button>
          <button className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10"><MessageSquare className="h-4 w-4" /></button>
          <button onClick={() => nav({ to: "/game-end" })} className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="relative mx-auto h-[calc(100vh-80px)] max-w-6xl">
        {/* Opponents */}
        {others.map((p, i) => (
          <div key={p.id} className={cn("absolute z-10", positions[i])}>
            <div className={cn(
              "flex flex-col items-center gap-2 rounded-2xl glass px-4 py-3 transition-all",
              turnIdx === i + 1 ? "ring-2 ring-[color:var(--neon)] glow-neon" : "border border-white/10",
            )}>
              <PlayerAvatar name={p.name} avatar={p.avatar} size="md" isActive={turnIdx === i + 1} score={p.score} />
              <div className="flex -space-x-4">
                {p.hand.map((c) => (
                  <div key={c.id} className="scale-75">
                    <div className="h-24 w-16 rounded-lg border border-white/15 shadow-md" style={{
                      background: "linear-gradient(135deg, oklch(0.32 0.10 265), oklch(0.18 0.06 280))",
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Center: deck + discard */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-end gap-8 rounded-3xl glass-strong px-8 py-6">
            <Deck count={deckCount} onClick={handleDraw} />
            <DiscardPile top={discardTop} onClick={handleDiscard} />
          </div>
        </div>

        {/* You */}
        <div className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-4 px-4">
          <div className="flex items-center gap-3 rounded-full glass-strong px-4 py-2">
            <PlayerAvatar name={you.name} avatar={you.avatar} size="sm" isActive={turnIdx === 0} isHost score={you.score} />
            <div className="hidden text-xs text-white/70 sm:block">
              <div className="font-bold text-white">Sua vez em breve</div>
              <div>Mão: {you.hand.length} cartas · {you.score} pts</div>
            </div>
          </div>

          <PlayerHand
            cards={you.hand}
            faceDown
            revealedIndexes={revealed}
            size="lg"
            compact
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ActionButton onClick={handleDraw} label="Comprar" tone="neon" />
            <ActionButton onClick={handleDiscard} label="Descartar" tone="ghost" />
            <ActionButton onClick={() => setModalKind("peek")} label="Olhar" Icon={Eye} tone="ghost" />
            <ActionButton onClick={() => setModalKind("swap")} label="Trocar" Icon={Repeat2} tone="ghost" />
            <ActionButton onClick={() => setModalKind("reveal")} label="Revelar" Icon={Sparkles} tone="ghost" />
            <ActionButton onClick={nextTurn} label="Passar" tone="ghost" />
            <ActionButton onClick={callDutch} label="DUTCH!" Icon={Flag} tone="gold" />
          </div>
        </div>
      </div>

      {/* Intro cinematic overlay */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-lg"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180 }}
                className="mb-6 font-display text-4xl font-black text-gradient-neon md:text-6xl"
              >
                MEMORIZE SUAS CARTAS
              </motion.div>
              <p className="mb-8 text-sm uppercase tracking-[0.4em] text-white/60">
                Você verá {initialVisibleCount} carta{initialVisibleCount > 1 ? "s" : ""} por alguns segundos
              </p>
              <div className="flex justify-center gap-4">
                {you.hand.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ y: 60, opacity: 0, rotateY: 180 }}
                    animate={visibleIdx.includes(i) ? { y: 0, opacity: 1, rotateY: 0 } : { y: 0, opacity: 0.6, rotateY: 180 }}
                    transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 160, damping: 18 }}
                  >
                    <div className="[perspective:1000px]">
                      {visibleIdx.includes(i) ? (
                        <div className="w-24">
                          <div className="gradient-card flex h-36 flex-col justify-between rounded-xl border border-white/20 p-2 glow-neon">
                            <div className="flex justify-between font-display font-bold text-white">
                              <span>{c.value}</span><span>{c.suit}</span>
                            </div>
                            <div className="grid place-items-center text-4xl">{c.suit}</div>
                            <div className="text-right text-xs text-white/70">{c.points}pt</div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 w-24 rounded-xl border border-white/15" style={{
                          background: "linear-gradient(135deg, oklch(0.32 0.10 265), oklch(0.18 0.06 280))",
                        }} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SpecialCardModal
        open={modalKind !== null}
        kind={modalKind}
        players={players}
        yourHand={you.hand}
        onClose={() => setModalKind(null)}
        onConfirm={() => { toast.success("Habilidade utilizada"); setModalKind(null); }}
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
      className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold", styles)}
    >
      {Icon && <Icon className="h-4 w-4" />}{label}
    </motion.button>
  );
}
