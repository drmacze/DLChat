import { logger } from "./logger.js";

interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<void> {
  if (messages.length === 0) return;

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, "Expo push notification failed");
        return;
      }

      const result = (await response.json()) as { data: ExpoPushTicket[] };
      const errors = result.data?.filter((t) => t.status === "error") ?? [];
      if (errors.length > 0) {
        logger.warn({ errors }, "Some push notifications failed");
      }
    } catch (err) {
      logger.error({ err }, "Failed to send push notifications");
    }
  }
}

export async function sendPushToUsers(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;

  const validTokens = tokens.filter(
    (t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")
  );

  if (validTokens.length === 0) {
    logger.warn("No valid Expo push tokens, skipping push");
    return;
  }

  await sendExpoPushNotifications(
    validTokens.map((to) => ({
      to,
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: "high",
      channelId: "messages",
    }))
  );
}
