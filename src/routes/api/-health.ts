import { createServerFn } from '@tanstack/react-start';

/** Server function: Health check do servidor */
export const healthCheck = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});
