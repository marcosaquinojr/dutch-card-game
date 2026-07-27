import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Copy, MessageSquare, Play, Send } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { PlayerAvatar } from "@/components/dutch/PlayerAvatar";
import { MOCK_CHAT, MOCK_PLAYERS, type ChatMessage } from "@/lib/dutch-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/lobby")({
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
  const [players] = useState(MOCK_PLAYERS.slice(0, 4));
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [draft, setDraft] = useState("");
  const code = "DUTCH-K3F9";

  const readyCount = players.filter((p) => p.ready).length;

  return (
    <main className="relative min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Sair da sala
          </Link>
          <DutchLogo size="sm" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-strong rounded-3xl p-6 md:p-8"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-white/50">Sala privada</div>
                <h1 className="truncate font-display text-2xl font-bold md:text-3xl">Mesa da Nina</h1>
                <div className="mt-1 text-xs text-white/60">
                  4 jogadores · 4 cartas · 45s por turno · até 100 pts
                </div>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(code); toast.success("Código copiado!"); }}
                className="shrink-0 flex items-center gap-2 rounded-full glass border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" /> {code}
              </button>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Jogadores ({players.length}/6)</span>
                <span>{readyCount} pronto{readyCount > 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {players.map((p) => (
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
                {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <div key={i} className="grid h-full min-h-[172px] place-items-center rounded-2xl border border-dashed border-white/15 text-xs text-white/40">
                    Aguardando…
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <button className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
                Não estou pronto
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => nav({ to: "/game" })}
                className="flex items-center justify-center gap-2 rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon"
              >
                <Play className="h-4 w-4" /> Iniciar Partida
              </motion.button>
            </div>
          </motion.section>

          {/* Chat */}
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-strong flex h-[600px] flex-col rounded-3xl"
          >
            <header className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              <MessageSquare className="h-4 w-4 text-[color:var(--neon)]" />
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">Chat</h2>
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
                          <span className={`text-xs font-bold ${m.author === "Você" ? "text-[color:var(--neon)]" : "text-white/80"}`}>{m.author}</span>
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
                setMessages((prev) => [...prev, { id: String(Date.now()), author: "Você", text: draft, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
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
