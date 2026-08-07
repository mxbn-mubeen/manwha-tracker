import { TelegramClient } from "teleproto";
import {
  ConnectionTCPAbridged,
  ConnectionTCPFull,
  ConnectionTCPObfuscated,
} from "teleproto/network";
import { StringSession } from "teleproto/sessions";

type TelegramConnectionMode = "auto" | "obfuscated" | "abridged" | "full";

type ConnectTelegramClientOptions = {
  connectionRetries?: number;
  retryDelay?: number;
  timeout?: number;
  autoReconnect?: boolean;
  useIPV6?: boolean;
};

function getPreferredTransportOrder(): Array<{
  name: string;
  connection: unknown;
}> {
  const mode = (
    process.env.TELEGRAM_CONNECTION_MODE || "auto"
  ).toLowerCase() as TelegramConnectionMode;

  switch (mode) {
    case "abridged":
      return [
        { name: "abridged", connection: ConnectionTCPAbridged },
        { name: "obfuscated", connection: ConnectionTCPObfuscated },
        { name: "full", connection: ConnectionTCPFull },
      ];
    case "full":
      return [
        { name: "full", connection: ConnectionTCPFull },
        { name: "obfuscated", connection: ConnectionTCPObfuscated },
        { name: "abridged", connection: ConnectionTCPAbridged },
      ];
    case "obfuscated":
      return [
        { name: "obfuscated", connection: ConnectionTCPObfuscated },
        { name: "abridged", connection: ConnectionTCPAbridged },
        { name: "full", connection: ConnectionTCPFull },
      ];
    case "auto":
    default:
      return [
        { name: "obfuscated", connection: ConnectionTCPObfuscated },
        { name: "abridged", connection: ConnectionTCPAbridged },
        { name: "full", connection: ConnectionTCPFull },
      ];
  }
}

export async function connectTelegramClient({
  session,
  apiId,
  apiHash,
  options = {},
}: {
  session: string;
  apiId: number;
  apiHash: string;
  options?: ConnectTelegramClientOptions;
}): Promise<{ client: TelegramClient; transport: string }> {
  const useIPV6 = options.useIPV6 ?? process.env.TELEGRAM_USE_IPV6 === "true";
  const transportOrder = getPreferredTransportOrder();
  let lastError: unknown;

  for (const candidate of transportOrder) {
    const client = new TelegramClient(
      new StringSession(session),
      apiId,
      apiHash,
      {
        ...options,
        useIPV6,
        connection: candidate.connection as any,
      } as any,
    );

    try {
      await client.connect();
      return { client, transport: candidate.name };
    } catch (error) {
      lastError = error;
      await client.disconnect().catch(() => {
        /* best-effort cleanup */
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to connect to Telegram with any configured transport");
}
