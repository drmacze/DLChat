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
import { eq, and, isNull } from "drizzle-orm";
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
  });

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

    socket.on("conversation:join", async ({ conversationId }: { conversationId: string }) => {
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
      }
    });

    socket.on("conversation:leave", ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on(
      "typing:start",
      ({ conversationId }: { conversationId: string }) => {
        socket
          .to(`conv:${conversationId}`)
          .emit("typing:start", { userId, conversationId });
      }
    );

    socket.on(
      "typing:stop",
      ({ conversationId }: { conversationId: string }) => {
        socket
          .to(`conv:${conversationId}`)
          .emit("typing:stop", { userId, conversationId });
      }
    );

    socket.on(
      "message:read",
      async ({ messageId }: { messageId: string }) => {
        await db
          .insert(messageStatus)
          .values({ messageId, userId, status: "read" })
          .onConflictDoUpdate({
            target: [messageStatus.messageId, messageStatus.userId],
            set: { status: "read", updatedAt: new Date() },
          });
      }
    );

    socket.on("disconnect", async () => {
      logger.info({ userId }, "Socket disconnected");
      await db
        .update(users)
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

export async function broadcastMessage(
  conversationId: string,
  message: Record<string, unknown>
) {
  if (io) {
    io.to(`conv:${conversationId}`).emit("message:new", message);
  }
}

export async function notifyUser(
  userId: string,
  notification: Record<string, unknown>
) {
  if (io) {
    const sockets = await io.fetchSockets();
    const userSockets = sockets.filter(
      (s) => (s as unknown as AuthSocket).userId === userId
    );
    userSockets.forEach((s) => s.emit("notification:new", notification));
  }
}
