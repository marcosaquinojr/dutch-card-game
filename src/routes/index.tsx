import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, PlusCircle, LogIn, BookOpen, Settings } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { FloatingCardsBackground } from "@/components/dutch/FloatingCardsBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DUTCH — Jogo de Cartas Online Premium" },
      { name: "description", content: "Entre em partidas online do DUTCH, crie salas privadas com amigos e domine a menor pontuação." },
      { property: "og:title", content: "DUTCH — Jogo de Cartas Online Premium" },
      { property: "og:description", content: "Crie salas, desafie amigos e conquiste a menor pontuação em partidas cinematográficas." },
    ],
  }),
  component: Home,
});

const MENU = [
  { to: "/lobby", label: "Jogar Online", desc: "Encontrar oponentes agora", Icon: Play, variant: "primary" as const, search: { quick: "1" } },
  { to: "/create-room", label: "Criar Sala", desc: "Configure sua partida", Icon: PlusCircle, variant: "gold" as const },
  { to: "/lobby", label: "Entrar em Sala", desc: "Use um código de convite", Icon: LogIn, variant: "purple" as const },
  { to: "/tutorial", label: "Tutorial", desc: "Aprenda as regras", Icon: BookOpen, variant: "ghost" as const },
  { to: "/settings", label: "Configurações", desc: "Áudio, tema e conta", Icon: Settings, variant: "ghost" as const },
];

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <FloatingCardsBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center px-4 py-10 lg:py-16">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="mb-3 flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-white/70"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          12.483 jogadores online
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
          className="text-center"
        >
          <DutchLogo size="xl" />
          <p className="mt-3 max-w-xl text-balance text-sm text-white/60 md:text-base">
            Um clássico de cartas reinventado com visual cinematográfico, cartas especiais e partidas rápidas.
          </p>
        </motion.div>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 md:mt-14 md:grid-cols-2">
          {MENU.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 200 }}
              className={i === 0 ? "md:col-span-2" : ""}
            >
              <MenuButton {...m} big={i === 0} />
            </motion.div>
          ))}
        </div>

        <footer className="mt-auto pt-12 text-center text-xs text-white/40">
          v0.1 · Interface demo · Nenhum dado é enviado ao servidor.
        </footer>
      </div>
    </main>
  );
}

function MenuButton({
  to, label, desc, Icon, variant, big,
}: {
  to: string; label: string; desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "gold" | "purple" | "ghost";
  big?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "gradient-neon text-black glow-neon",
    gold: "gradient-gold text-black glow-gold",
    purple: "bg-[color:var(--royal)] text-white glow-purple",
    ghost: "glass text-white hover:bg-white/10",
  };
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${styles[variant]} ${big ? "p-6" : ""}`}
    >
      <div className={`grid ${big ? "h-14 w-14" : "h-11 w-11"} place-items-center rounded-xl bg-black/25 backdrop-blur`}>
        <Icon className={`${big ? "h-7 w-7" : "h-5 w-5"}`} />
      </div>
      <div className="flex-1 text-left">
        <div className={`font-display font-bold ${big ? "text-2xl" : "text-lg"}`}>{label}</div>
        <div className={`text-xs ${variant === "ghost" ? "text-white/60" : "text-black/70"}`}>{desc}</div>
      </div>
      <div className="absolute inset-y-0 -right-1/3 w-1/3 rotate-12 bg-white/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
