import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken, hashToken } from "../lib/jwt.js";
import { db } from "@workspace/db";
import {
  sessions,
  users,
  conversationMembers,
  messages,
  messageStatus,
  notifications,
} from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

let io: SocketServer;

interface AuthSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

export function setupSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: { origin: "*", credentials: true },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  io.use(async (socket: AuthSocket, next) => {
    try {
      const token =
        (socket.handshake.auth as Record<string, string>).token ||
        (socket.handshake.headers.authorization as string)?.replace("Bearer ", "");

      if (!token) return next(new Error("No token"));

      const payload = verifyToken(token);
      const tokenHash = hashToken(token);

      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.id, payload.sessionId),
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt)
          )
        )
        .limit(1);

      if (!session) return next(new Error("Session invalid"));

      socket.userId = payload.userId;
      socket.sessionId = payload.sessionId;
      next();
    } catch {
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", async (socket: AuthSocket) => {
    const userId = socket.userId!;
    logger.info({ userId }, "Socket connected");

    await db.update(users).set({ isOnline: true }).where(eq(users.id, userId));
    socket.broadcast.emit("user:online", { userId });

    // ── Application-level heartbeat ──────────────────────────────────────────
    socket.on("ping", () => {
      socket.emit("pong", { ts: Date.now() });
    });

    socket.on("conversation:join", async ({ conversationId }: { conversationId: string }) => {
      try {
        const [member] = await db
          .select()
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, conversationId),
              eq(conversationMembers.userId, userId)
            )
          )
          .limit(1);

        if (member) {
          await socket.join(`conv:${conversationId}`);

          // Mark unread messages as "delivered" for this user
          const undelivered = await db.execute(sql`
            SELECT m.id, m.sender_id
            FROM messages m
            WHERE m.conversation_id = ${conversationId}
              AND m.deleted_at IS NULL
              AND m.sender_id != ${userId}
              AND m.id NOT IN (
                SELECT message_id FROM message_status
                WHERE user_id = ${userId}::uuid
              )
            ORDER BY m.created_at DESC
            LIMIT 50
          `);

          if (undelivered.rows.length > 0) {
            const msgIds = undelivered.rows.map((r) => (r as { id: string }).id);
            await db.execute(sql`
              INSERT INTO message_status (message_id, user_id, status)
              SELECT unnest(${msgIds}::uuid[]), ${userId}::uuid, 'delivered'
              ON CONFLICT (message_id, user_id) DO NOTHING
            `);

            // Notify senders that messages were delivered
            socket.to(`conv:${conversationId}`).emit("message:delivered", {
              conversationId,
              messageIds: msgIds,
              deliveredTo: userId,
            });
          }
        }
      } catch (err) {
        logger.error({ err }, "conversation:join error");
      }
    });

    socket.on("conversation:leave", ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      const key = `${userId}:${conversationId}`;
      const existing = typingTimeouts.get(key);
      if (existing) clearTimeout(existing);
      socket.to(`conv:${conversationId}`).emit("typing:start", { userId, conversationId });
      const timeout = setTimeout(() => {
        socket.to(`conv:${conversationId}`).emit("typing:stop", { userId, conversationId });
        typingTimeouts.delete(key);
      }, 5000);
      typingTimeouts.set(key, timeout);
    });

    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      const key = `${userId}:${conversationId}`;
      const existing = typingTimeouts.get(key);
      if (existing) { clearTimeout(existing); typingTimeouts.delete(key); }
      socket.to(`conv:${conversationId}`).emit("typing:stop", { userId, conversationId });
    });

    socket.on("message:read", async ({ messageId, conversationId }: { messageId: string; conversationId?: string }) => {
      try {
        await db.insert(messageStatus)
          .values({ messageId, userId, status: "read" })
          .onConflictDoUpdate({
            target: [messageStatus.messageId, messageStatus.userId],
            set: { status: "read", updatedAt: new Date() },
          });
        if (conversationId) {
          const [msg] = await db.select({ senderId: messages.senderId })
            .from(messages).where(eq(messages.id, messageId)).limit(1);
          if (msg?.senderId && msg.senderId !== userId) {
            socket.to(`conv:${conversationId}`).emit("message:read", { messageId, readBy: userId });
          }
        }
      } catch (err) {
        logger.error({ err }, "message:read socket error");
      }
    });

    // ── Voice/Video Call Signaling ──────────────────────────────────────────
    socket.on("call:init", async ({ conversationId, callType }: { conversationId: string; callType: "voice" | "video" }) => {
      try {
        const [member] = await db.select().from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
          .limit(1);
        if (!member) return;
        const [caller] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        socket.to(`conv:${conversationId}`).emit("call:incoming", {
          conversationId,
          callType,
          callerId: userId,
          callerName: caller?.displayName ?? "Unknown",
          callerAvatar: caller?.avatarUrl ?? null,
          roomId: `dlchat-${conversationId}`,
        });
      } catch (err) {
        logger.error({ err }, "call:init error");
      }
    });

    socket.on("call:accept", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("call:accepted", { conversationId, userId });
    });

    socket.on("call:reject", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("call:rejected", { conversationId, userId });
    });

    socket.on("call:end", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("call:ended", { conversationId, userId });
    });

    socket.on("call:busy", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("call:busy", { conversationId, userId });
    });

    socket.on("message:pin", ({ conversationId, messageId, isPinned }: { conversationId: string; messageId: string; isPinned: boolean }) => {
      socket.to(`conv:${conversationId}`).emit("message:pin", { conversationId, messageId, isPinned });
    });

    socket.on("disconnect", async () => {
      logger.info({ userId }, "Socket disconnected");
      for (const [key, timeout] of typingTimeouts.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(timeout);
          typingTimeouts.delete(key);
          const convId = key.split(":")[1];
          socket.broadcast.emit("typing:stop", { userId, conversationId: convId });
        }
      }
      await db.update(users)
        .set({ isOnline: false, lastSeenAt: new Date() })
        .where(eq(users.id, userId));
      socket.broadcast.emit("user:offline", { userId, lastSeenAt: new Date().toISOString() });
    });
  });

  return io;
}

export function getIO(): SocketServer {
  return io;
}

export async function broadcastMessage(conversationId: string, message: Record<string, unknown>) {
  if (io) io.to(`conv:${conversationId}`).emit("message:new", message);
}

export async function broadcastMessageUpdate(conversationId: string, message: Record<string, unknown>) {
  if (io) io.to(`conv:${conversationId}`).emit("message:updated", message);
}

export async function broadcastMessageDeleted(conversationId: string, messageId: string) {
  if (io) io.to(`conv:${conversationId}`).emit("message:deleted", { messageId, conversationId });
}

export async function broadcastReaction(conversationId: string, data: Record<string, unknown>) {
  if (io) io.to(`conv:${conversationId}`).emit("message:reaction", data);
}

export async function notifyUser(userId: string, notification: Record<string, unknown>) {
  if (io) {
    const sockets = await io.fetchSockets();
    const userSockets = sockets.filter((s) => (s as unknown as AuthSocket).userId === userId);
    userSockets.forEach((s) => s.emit("notification:new", notification));
  }
}
