import { TelegramClient, Api } from "teleproto";
import { NewMessage } from "teleproto/events";
import { Raw } from "teleproto/events/Raw";

export function setupEventHandlers(
  client: TelegramClient,
  touchActivity: () => void,
  channelMap: Map<string, any>,
  handleNewMessage: (event: any) => Promise<void>,
  handleReadUpdate: (client: TelegramClient, chatId: string, maxId: number) => Promise<void>
) {
  client.addEventHandler((event) => {
    touchActivity();
    return handleNewMessage(event);
  }, new NewMessage({}));

  client.addEventHandler((update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateReadChannelInbox) {
      touchActivity();
      const chatId = update.channelId.toString();
      if (channelMap.has(chatId)) {
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error("[watcher] handleReadUpdate error:", e),
        );
      }
    } else if (update instanceof Api.UpdateReadHistoryInbox) {
      touchActivity();
      const chatId =
        (update.peer as any)?.channelId?.toString() ??
        (update.peer as any)?.chatId?.toString();
      if (chatId && channelMap.has(chatId)) {
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error("[watcher] handleReadUpdate error:", e),
        );
      }
    }
  }, new Raw({}));
}
