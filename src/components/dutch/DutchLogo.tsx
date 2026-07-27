import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function DutchLogo({ size = "md", className }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const t = { sm: "text-2xl", md: "text-4xl", lg: "text-6xl", xl: "text-8xl" }[size];
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2 font-display font-black tracking-widest", t, className)}>
      <span className="text-gradient-neon drop-shadow-[0_0_18px_rgba(120,180,255,0.35)]">DUTCH</span>
      <span className="text-gradient-gold">·</span>
    </Link>
  );
}
