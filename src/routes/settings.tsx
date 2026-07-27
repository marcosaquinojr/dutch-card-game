import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DutchLogo } from "@/components/dutch/DutchLogo";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — DUTCH" },
      { name: "description", content: "Ajuste áudio, animações e preferências do seu jogo." },
      { property: "og:title", content: "Configurações — DUTCH" },
      { property: "og:description", content: "Personalize sua experiência no DUTCH." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [music, setMusic] = useState([70]);
  const [sfx, setSfx] = useState([80]);
  const [reduce, setReduce] = useState(false);
  const [autoReady, setAutoReady] = useState(true);
  const [hints, setHints] = useState(true);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <DutchLogo size="sm" />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong space-y-6 rounded-3xl p-6 md:p-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-white/60">Personalize sua experiência.</p>
          </div>

          <Group title="Áudio">
            <SliderRow label="Música" value={music} onChange={setMusic} />
            <SliderRow label="Efeitos sonoros" value={sfx} onChange={setSfx} />
          </Group>

          <Group title="Interface">
            <ToggleRow label="Reduzir animações" desc="Menos movimento em telas cinematográficas" checked={reduce} onChange={setReduce} />
            <ToggleRow label="Dicas contextuais" desc="Mostrar tooltips durante a partida" checked={hints} onChange={setHints} />
            <ToggleRow label="Auto-pronto no lobby" desc="Marcar automaticamente como pronto ao entrar" checked={autoReady} onChange={setAutoReady} />
          </Group>
        </motion.div>
      </div>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs uppercase tracking-widest text-white/60">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="rounded-2xl glass border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-display text-sm text-[color:var(--neon)]">{value[0]}</span>
      </div>
      <Slider value={value} onValueChange={onChange} max={100} step={1} />
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl glass border border-white/10 p-4">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/55">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
