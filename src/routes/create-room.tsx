import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Users, Clock, Trophy, Lock, Eye, User } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRoom } from "@/lib/socket-client";
import { toast } from "sonner";

export const Route = createFileRoute("/create-room")({
  head: () => ({
    meta: [
      { title: "Criar sala — DUTCH" },
      { name: "description", content: "Configure sua partida privada: número de jogadores, cartas, tempo por turno e regras especiais." },
      { property: "og:title", content: "Criar sala — DUTCH" },
      { property: "og:description", content: "Configure regras, tempo e cartas especiais para sua partida privada." },
    ],
  }),
  component: CreateRoom,
});

const MAX_PLAYERS = [2, 3, 4, 5, 6];
const CARD_COUNTS = [3, 4, 5, 6];
const TURN_TIMES = [30, 45, 60, 90];
const MAX_SCORES = [50, 100, 150, 200];

function CreateRoom() {
  const nav = useNavigate();
  const { createRoom, roomState, error } = useRoom();

  const [playerName, setPlayerName] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("dutch_playerName") : null) || "Jogador 1");
  const [name, setName] = useState("Mesa do Dutch");
  const [pwd, setPwd] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [cards, setCards] = useState(4);
  const [turn, setTurn] = useState(45);
  const [maxScore, setMaxScore] = useState(100);
  const [special, setSpecial] = useState(true);
  const [simDiscard, setSimDiscard] = useState(true);

  const visible = cards <= 4 ? 1 : 2;

  useEffect(() => {
    if (roomState?.code) {
      if (typeof window !== "undefined") {
        localStorage.setItem("dutch_playerName", playerName);
      }
      nav({ to: "/lobby", search: { code: roomState.code } });
    }
  }, [roomState, nav, playerName]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleCreate = () => {
    if (!playerName.trim()) {
      toast.error("Digite seu nome");
      return;
    }
    createRoom({
      playerName: playerName.trim(),
      avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(playerName)}&backgroundColor=1e293b`,
      roomName: name.trim() || "Mesa do Dutch",
      password: pwd || undefined,
      settings: {
        maxPlayers,
        cardsPerPlayer: cards,
        turnTimeSeconds: turn,
        maxScore,
        specialCards: special,
        simultaneousDiscard: simDiscard,
      },
    });
  };

  return (
    <main className="relative min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <DutchLogo size="sm" />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-strong rounded-3xl p-6 md:p-10"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl gradient-neon text-black">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">Criar Partida</h1>
              <p className="text-sm text-white/60">Ajuste as regras para o seu grupo.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Seu Nome / Nickname" icon={<User className="h-3.5 w-3.5" />} full>
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Seu nome" className="glass border-white/10 h-11" />
            </Field>

            <Field label="Nome da sala">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="glass border-white/10 h-11" />
            </Field>
            <Field label="Senha (opcional)" icon={<Lock className="h-3.5 w-3.5" />}>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="deixe em branco para pública" className="glass border-white/10 h-11" />
            </Field>

            <Field label="Jogadores máximos" icon={<Users className="h-3.5 w-3.5" />} full>
              <Chips options={MAX_PLAYERS} value={maxPlayers} onChange={setMaxPlayers} />
            </Field>

            <Field label="Cartas por jogador" full>
              <Chips options={CARD_COUNTS} value={cards} onChange={setCards} />
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                <Eye className="h-3.5 w-3.5 text-[color:var(--neon)]" />
                Você verá <strong className="text-white">{visible} carta{visible > 1 ? "s" : ""}</strong> inicialmente.
              </div>
            </Field>

            <Field label="Tempo por turno" icon={<Clock className="h-3.5 w-3.5" />} full>
              <Chips options={TURN_TIMES} value={turn} onChange={setTurn} suffix="s" />
            </Field>

            <Field label="Pontuação máxima" icon={<Trophy className="h-3.5 w-3.5" />} full>
              <Chips options={MAX_SCORES} value={maxScore} onChange={setMaxScore} />
            </Field>

            <Toggle
              label="Cartas especiais"
              desc="Habilita cartas com poderes (olhar, trocar, revelar…)"
              checked={special}
              onChange={setSpecial}
            />
            <Toggle
              label="Descarte simultâneo"
              desc="Vários jogadores podem descartar ao mesmo tempo"
              checked={simDiscard}
              onChange={setSimDiscard}
            />
          </div>

          <div className="mt-10 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <Link to="/" className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold text-white/80 hover:bg-white/5">
              Cancelar
            </Link>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              className="rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon"
            >
              Criar Partida
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Field({ label, children, icon, full }: { label: string; children: React.ReactNode; icon?: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-2", full && "md:col-span-2")}>
      <Label className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/60">
        {icon}{label}
      </Label>
      {children}
    </div>
  );
}

function Chips<T extends string | number>({ options, value, onChange, suffix }: { options: T[]; value: T; onChange: (v: T) => void; suffix?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={String(o)}
            onClick={() => onChange(o)}
            className={cn(
              "min-w-[3rem] rounded-xl border px-4 py-2.5 text-sm font-bold transition-all",
              active
                ? "gradient-neon border-transparent text-black glow-neon"
                : "glass border-white/10 text-white/80 hover:border-white/25 hover:bg-white/10",
            )}
          >
            {o}{suffix}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl glass border border-white/10 p-4 md:col-span-1">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/55">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
