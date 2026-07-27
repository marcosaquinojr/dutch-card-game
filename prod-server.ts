import { createServer } from "node:http";
import { initializeSocketIO } from "./src/server/middleware";

const PORT = Number(process.env.PORT || 3000);

async function startProdServer() {
  // Configura a porta antes de importar o index do nitro para consistência
  process.env.PORT = String(PORT);

  // Importa o servidor Nitro gerado no build
  // @ts-ignore
  await import("./.output/server/index.mjs");

  console.log(`🎴 Servidor DUTCH rodando na porta ${PORT}`);
}

startProdServer().catch(console.error);
