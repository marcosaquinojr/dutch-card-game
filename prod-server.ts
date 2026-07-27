import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket-handler.ts";
import type { ClientToServerEvents, ServerToClientEvents } from "./src/game/types.ts";

const PORT = Number(process.env.PORT || 3000);

async function start() {
  process.env.PORT = "0";

  // 1. Carrega o build de produção do Nitro dinamicamente no runtime (ignora no build time)
  const serverPath = "./.output/server/index.mjs";
  // @ts-ignore
  await import(/* @vite-ignore */ serverPath);

  // @ts-ignore
  const nitroApp = globalThis.__nitro__?.default;
  if (!nitroApp) {
    throw new Error("Não foi possível carregar a instância do Nitro");
  }

  // 2. Cria o servidor HTTP de produção
  const server = createServer(async (req, res) => {
    // Requisições do Socket.IO são tratadas pelo engine.io
    if (req.url?.startsWith("/socket.io")) return;

    try {
      const url = `http://${req.headers.host || "localhost"}${req.url || "/"}`;
      const method = req.method || "GET";
      const headers = new Headers();

      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      const hasBody = method !== "GET" && method !== "HEAD";
      const webReq = new Request(url, {
        method,
        headers,
        body: hasBody ? (req as any) : undefined,
        duplex: hasBody ? "half" : undefined,
      });

      const webRes = await nitroApp.fetch(webReq);

      res.statusCode = webRes.status;
      webRes.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (webRes.body) {
        const reader = webRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error("Erro no processamento da requisição:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  });

  // 3. Inicializa o Socket.IO no servidor HTTP de produção
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);

  // 4. Escuta na porta da aplicação
  server.listen(PORT, () => {
    console.log(`🚀 DUTCH Production Server rodando na porta ${PORT}`);
    console.log(`🎴 Socket.IO ativado e escutando conexões WebSocket em tempo real`);
  });
}

start().catch(console.error);
