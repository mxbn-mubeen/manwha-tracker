import { createTRPCRouter } from "./trpc";
import { startTelegramLogin, verifyTelegramCode, telegramStatus, disconnectTelegram } from "./modules/settings/telegram-auth.procedures";

export const workerRouter = createTRPCRouter({
  settings: createTRPCRouter({
    startTelegramLogin,
    verifyTelegramCode,
    telegramStatus,
    disconnectTelegram,
  }),
});

export type WorkerRouter = typeof workerRouter;
