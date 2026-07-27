import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Repeat2, Sparkles, Flag, Layers, Users } from "lucide-react";
import { DutchLogo } from "@/components/dutch/DutchLogo";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial — DUTCH" },
      { name: "description", content: "Aprenda as regras do DUTCH: objetivo, cartas especiais e como vencer a rodada." },
      { property: "og:title", content: "Tutorial — DUTCH" },
      { property: "og:description", content: "Guia rápido para dominar o DUTCH em minutos." },
    ],
  }),
  component: Tutorial,
});

const STEPS = [
  { Icon: Flag, title: "Objetivo", body: "Termine a rodada com a menor soma de pontos. O primeiro a atingir a pontuação máxima perde a partida." },
  { Icon: Layers, title: "Cartas & pontos", body: "Cartas numéricas valem seu número. J = 11, Q = 12, K = 0, Coringa = -1." },
  { Icon: Eye, title: "Memória", body: "Você só vê algumas de suas cartas no início. Depois todas ficam viradas — memorize bem!" },
  { Icon: Sparkles, title: "Cartas especiais", body: "Algumas cartas dão poderes ao serem descartadas: olhar, revelar ou trocar." },
  { Icon: Repeat2, title: "Trocar & descartar", body: "No seu turno: compre uma carta e escolha se troca por uma sua ou descarta." },
  { Icon: Users, title: "Chamar DUTCH", body: "Se acha que tem a menor pontuação, chame DUTCH. Se acertar, ganha bônus. Se errar, penalidade!" },
];

function Tutorial() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <DutchLogo size="sm" />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <h1 className="font-display text-4xl font-black text-gradient-neon md:text-5xl">Como jogar</h1>
          <p className="mt-3 text-sm text-white/60">Regras essenciais do DUTCH em 6 passos rápidos.</p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="glass-strong rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl gradient-neon text-black">
                  <s.Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Passo {i + 1}</div>
                  <h3 className="font-display text-lg font-bold">{s.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/70">{s.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link to="/create-room" className="rounded-full gradient-neon px-8 py-3 font-display font-bold text-black glow-neon">
            Criar uma partida
          </Link>
        </div>
      </div>
    </main>
  );
}
