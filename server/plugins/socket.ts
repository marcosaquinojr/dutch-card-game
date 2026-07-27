import { initializeSocketIO } from "../../src/server/middleware";

export default function socketPlugin(nitroApp: any) {
  nitroApp.hooks.hook("request", (event: any) => {
    const server = event.node?.req?.socket?.server;
    if (server) {
      initializeSocketIO(server);
    }
  });
}
