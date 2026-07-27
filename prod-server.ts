import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket-handler";
import type { ClientToServerEvents, ServerToClientEvents } from "./src/game/types";

const REAL_PORT = Number(process.env.PORT || 3000);

async function start() {
  // Evita conflito de porta com o listener padrão do srvx
  process.env.PORT = "0";

  // 1. Carrega o build de produção do Nitro
  // @ts-ignore
  await import("./.output/server/index.mjs");

  // @ts-ignore
  const nitroApp = globalThis.__nitro__?.default;
  if (!nitroApp) {
    throw new Error("Não foi possível carregar a instância do Nitro");
  }

  // 2. Cria o servidor HTTP de produção da aplicação
  const server = createServer((req, res) => {
    // Se a requisição for do Socket.IO, deixa o engine.io tratar
    if (req.url?.startsWith("/socket.io")) return;

    // Entrega todas as requisições HTTP e SSR para o Nitro
    if (typeof nitroApp.h3?.handler === "function") {
      nitroApp.h3.handler(req, res);
    }
  });

  // 3. Inicializa o Socket.IO com suporte completo a WebSockets e Polling
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);

  // 4. Inicia o servidor na porta de produção (ex: 3000 ou porta do Render/Railway)
  server.listen(REAL_PORT, () => {
    console.log(`🚀 DUTCH Production Server rodando na porta ${REAL_PORT}`);
    console.log(`🎴 Socket.IO ativado e escutando conexões WebSocket em tempo real`);
  });
}

start().catch(console.error);
