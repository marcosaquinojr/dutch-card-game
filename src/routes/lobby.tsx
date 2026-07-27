import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, Copy, MessageSquare, Play, Send, User } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { Input } from "@/components/ui/input";
import { useRoom, useChat } from "@/lib/socket-client";
import { toast } from "sonner";

export const Route = createFileRoute("/lobby")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: (search.code as string) || "",
    quick: (search.quick as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Lobby da sala — DUTCH" },
      { name: "description", content: "Aguarde jogadores ficarem prontos, converse no chat e inicie a partida." },
      { property: "og:title", content: "Lobby da sala — DUTCH" },
      { property: "og:description", content: "Aguarde jogadores, converse no chat e inicie a partida." },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const { roomState, error, joinRoom, leaveRoom, setReady, startGame } = useRoom();
  const { messages, sendMessage } = useChat();

  const [playerName, setPlayerName] = useState(() => localStorage.getItem("dutch_playerName") || "");
  const [joinCodeInput, setJoinCodeInput] = useState(search.code || "");
  const [draft, setDraft] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Redireciona para o jogo quando a partida inicia
  useEffect(() => {
    if (roomState?.phase === "memorize" || roomState?.phase === "playing") {
      nav({ to: "/game" });
    }
  }, [roomState?.phase, nav]);

  // Exibe erros via toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      setIsJoining(false);
    }
  }, [error]);

  useEffect(() => {
    if (roomState) {
      setIsJoining(false);
    }
  }, [roomState]);

  // Se já há um código no URL e não estamos na sala, tentar entrar
  useEffect(() => {
    if (search.code && !roomState && playerName) {
      joinRoom({
        code: search.code,
        playerName,
        avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(playerName)}&backgroundColor=1e293b`,
      });
    }
  }, [search.code, roomState, playerName, joinRoom]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      toast.error("Por favor, informe seu nome primeiro");
      return;
    }
    if (!joinCodeInput.trim()) {
      toast.error("Digite o código da sala");
      return;
    }
    localStorage.setItem("dutch_playerName", playerName);
    setIsJoining(true);
    joinRoom({
      code: joinCodeInput.trim().toUpperCase(),
      playerName: playerName.trim(),
      avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(playerName.trim())}&backgroundColor=1e293b`,
    });
  };

  const handleLeave = () => {
    leaveRoom();
    nav({ to: "/" });
  };

  // Se o usuário ainda não entrou em uma sala, mostra tela de entrada por código
  if (!roomState) {
    return (
      <main className="relative min-h-screen px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <DutchLogo size="sm" />
          </div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold">Entrar em uma Sala</h1>
              <p className="text-sm text-white/60">Informe seu nome e o código de convite.</p>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Seu Nome
                </label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ex: Pedro"
                  className="glass border-white/10 h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/60">Código da Sala</label>
                <Input
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="Ex: DUTCH-K3F9"
                  className="glass border-white/10 h-11 uppercase font-mono tracking-wider"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isJoining}
                className="w-full rounded-full gradient-neon py-3 font-display font-bold text-black glow-neon"
              >
                {isJoining ? "Entrando..." : "Entrar na Sala"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </main>
    );
  }

  // Descobre se eu sou o host e meu status de pronto
  const me = roomState.players.find((p) => p.name === playerName) || roomState.players[0];
  const isHost = me?.isHost;
  const isReady = me?.ready;
  const readyCount = roomState.players.filter((p) => p.ready).length;
  const canStart = isHost && roomState.players.length >= 2 && roomState.players.every((p) => p.ready);

  return (
    <main className="relative min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={handleLeave} className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Sair da sala
          </button>
          <DutchLogo size="sm" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Painel da Sala */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-strong rounded-3xl p-6 md:p-8"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-white/50">Sala privada</div>
                <h1 className="truncate font-display text-2xl font-bold md:text-3xl">{roomState.name}</h1>
                <div className="mt-1 text-xs text-white/60">
                  {roomState.settings.maxPlayers} jogadores max · {roomState.settings.cardsPerPlayer} cartas · {roomState.settings.turnTimeSeconds}s por turno · até {roomState.settings.maxScore} pts
                </div>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(roomState.code); toast.success("Código copiado!"); }}
                className="shrink-0 flex items-center gap-2 rounded-full glass border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" /> {roomState.code}
              </button>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Jogadores ({roomState.players.length}/{roomState.settings.maxPlayers})</span>
                <span>{readyCount} pronto{readyCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {roomState.players.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    className={`relative flex flex-col items-center gap-3 rounded-2xl glass border border-white/10 p-4 ${p.isHost ? "ring-1 ring-[color:var(--gold)]/50" : ""}`}
                  >
                    <PlayerAvatar name={p.name} avatar={p.avatar} isHost={p.isHost} ready={p.ready} size="lg" />
                    <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.ready ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {p.ready ? "Pronto" : "Aguardando"}
                    </span>
                  </motion.div>
                ))}
                {Array.from({ length: Math.max(0, roomState.settings.maxPlayers - roomState.players.length) }).map((_, i) => (
                  <div key={i} className="grid h-full min-h-[172px] place-items-center rounded-2xl border border-dashed border-white/15 text-xs text-white/40">
                    Aguardando…
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <button
                onClick={() => setReady(!isReady)}
                className={`rounded-full border px-6 py-3 text-sm font-semibold transition-all ${isReady ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}
              >
                {isReady ? "Não estou pronto" : "Estou Pronto!"}
              </button>
              {isHost && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  disabled={!canStart}
                  className={`flex items-center justify-center gap-2 rounded-full px-8 py-3 font-display font-bold ${canStart ? "gradient-neon text-black glow-neon cursor-pointer" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
                >
                  <Play className="h-4 w-4" /> Iniciar Partida
                </motion.button>
              )}
            </div>
          </motion.section>

          {/* Chat em tempo real */}
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-strong flex h-[600px] flex-col rounded-3xl"
          >
            <header className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              <MessageSquare className="h-4 w-4 text-[color:var(--neon)]" />
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">Chat em Tempo Real</h2>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={m.system ? "text-center text-[10px] uppercase tracking-widest text-white/40" : ""}
                  >
                    {m.system ? m.text : (
                      <div>
                        <div className="mb-0.5 flex items-baseline gap-2">
                          <span className={`text-xs font-bold ${m.author === playerName ? "text-[color:var(--neon)]" : "text-white/80"}`}>{m.author}</span>
                          <span className="text-[10px] text-white/40">{m.time}</span>
                        </div>
                        <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/90">{m.text}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                sendMessage(draft.trim());
                setDraft("");
              }}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Mensagem…"
                className="flex-1 rounded-full bg-white/5 px-4 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
              />
              <button className="grid h-10 w-10 place-items-center rounded-full gradient-neon text-black">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
