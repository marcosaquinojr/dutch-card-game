import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <h1 className="font-display text-gradient-neon text-7xl font-black">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Página perdida no baralho</h2>
        <p className="mt-2 text-sm text-white/60">Essa carta não existe na mesa.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full gradient-neon px-6 py-2 text-sm font-bold text-black glow-neon"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-bold">A partida sofreu um crash</h1>
        <p className="mt-2 text-sm text-white/60">Reembaralhe e tente de novo.</p>
        {error?.message && (
          <p className="mt-2 rounded-xl bg-red-500/10 p-3 text-xs font-mono text-red-300 border border-red-500/20 text-left overflow-auto max-h-32">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full gradient-neon px-5 py-2 text-sm font-bold text-black"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DUTCH — Jogo de Cartas Online" },
      { name: "description", content: "DUTCH: um jogo de cartas online premium, moderno e cinematográfico. Crie salas, desafie amigos e conquiste a menor pontuação." },
      { property: "og:title", content: "DUTCH — Jogo de Cartas Online" },
      { property: "og:description", content: "Interface premium inspirada em Marvel Snap, Hearthstone e Balatro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
