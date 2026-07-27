import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

interface Props {
  name: string;
  avatar: string;
  isActive?: boolean;
  isHost?: boolean;
  ready?: boolean;
  size?: "sm" | "md" | "lg";
  score?: number;
  className?: string;
}

const SIZE = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-20 w-20" };

export function PlayerAvatar({ name, avatar, isActive, isHost, ready, size = "md", score, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative">
        <motion.div
          animate={isActive ? { boxShadow: [
            "0 0 0 0 rgba(120,180,255,0.6)",
            "0 0 0 12px rgba(120,180,255,0)",
          ] } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
          className={cn(
            "rounded-full p-[2px]",
            isActive ? "gradient-neon" : "bg-white/10",
          )}
        >
          <img
            src={avatar}
            alt={name}
            className={cn(
              "rounded-full bg-[color:var(--surface)] object-cover",
              SIZE[size],
            )}
          />
        </motion.div>
        {isHost && (
          <div className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full gradient-gold text-black shadow-md">
            <Crown className="h-3.5 w-3.5" />
          </div>
        )}
        {ready !== undefined && (
          <div className={cn(
            "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--background)]",
            ready ? "bg-emerald-400" : "bg-amber-400",
          )} />
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-white/90 leading-tight">{name}</div>
        {score !== undefined && (
          <div className="text-[10px] text-white/50">{score} pts</div>
        )}
      </div>
    </div>
  );
}
