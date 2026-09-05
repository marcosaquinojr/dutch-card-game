import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  shape: "circle" | "spark" | "square";
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  alpha: number;
  speed: number;
}

interface GameJuiceOverlayProps {
  dutchAlert?: { playerId: string; playerName: string } | null;
  matchResult?: { success: boolean; message: string } | null;
}

export function GameJuiceOverlay({ dutchAlert, matchResult }: GameJuiceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  const spawnDutchShockwave = (cx: number, cy: number) => {
    // 2 Anéis concêntricos de choque dourado
    ringsRef.current.push({
      x: cx,
      y: cy,
      radius: 10,
      maxRadius: Math.max(cx, cy) * 1.6,
      color: "#facc15",
      lineWidth: 8,
      alpha: 1,
      speed: 18,
    });
    ringsRef.current.push({
      x: cx,
      y: cy,
      radius: 5,
      maxRadius: Math.max(cx, cy) * 1.3,
      color: "#fbbf24",
      lineWidth: 4,
      alpha: 0.8,
      speed: 12,
    });

    // Faíscas douradas e brasas de impacto
    const colors = ["#facc15", "#fbbf24", "#fef08a", "#f97316", "#ffffff"];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? "spark" : "circle",
      });
    }
  };

  const spawnSnapBurst = (cx: number, cy: number, success: boolean) => {
    const count = success ? 45 : 25;
    const colors = success
      ? ["#38bdf8", "#67e8f9", "#facc15", "#fef08a", "#ffffff"]
      : ["#ef4444", "#f87171", "#fb7185", "#ffa3a3"];

    // Pequeno anel de impacto
    ringsRef.current.push({
      x: cx,
      y: cy,
      radius: 10,
      maxRadius: 180,
      color: success ? "#38bdf8" : "#ef4444",
      lineWidth: 5,
      alpha: 0.9,
      speed: 9,
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 7 + 2;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (success ? 2 : 0),
        size: Math.random() * 6 + 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.025 + 0.015,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.3 ? "spark" : "circle",
      });
    }
  };

  // Reage ao Alerta de Dutch
  useEffect(() => {
    if (dutchAlert && canvasRef.current) {
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      spawnDutchShockwave(w / 2, h / 2);
    }
  }, [dutchAlert]);

  // Reage ao Match Snap
  useEffect(() => {
    if (matchResult && canvasRef.current) {
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      // Posiciona a explosão ligeiramente à direita do centro (onde fica o descarte)
      spawnSnapBurst(w / 2 + 60, h / 2, matchResult.success);
    }
  }, [matchResult]);

  // Loop de Animação e Renderização no Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);

      // Limpa canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Atualiza e desenha anéis de choque
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const ring = ringsRef.current[i];
        ring.radius += ring.speed;
        ring.alpha -= 0.025;
        if (ring.radius >= ring.maxRadius || ring.alpha <= 0) {
          ringsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = Math.max(0, ring.alpha);
        ctx.lineWidth = ring.lineWidth;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }

      // Atualiza e desenha partículas
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravidade sutil
        p.vx *= 0.97; // Resistência do ar
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        if (p.shape === "spark") {
          // Estrela de 4 pontas / faísca cintilante
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.6);
          ctx.quadraticCurveTo(0, 0, p.size * 1.6, 0);
          ctx.quadraticCurveTo(0, 0, 0, p.size * 1.6);
          ctx.quadraticCurveTo(0, 0, -p.size * 1.6, 0);
          ctx.quadraticCurveTo(0, 0, 0, -p.size * 1.6);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    };

    render();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30 h-full w-full select-none"
    />
  );
}
