import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { BASE_URL } from "@/utils/api";

export interface IncomingCall {
  conversationId: string;
  callType: "voice" | "video";
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  roomId: string;
}

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type: string;
  mediaUrl?: string;
  replyToMessageId?: string;
  tempId: string;
  queuedAt: number;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  reconnectCount: number;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  initiateCall: (conversationId: string, callType: "voice" | "video") => void;
  acceptCall: (conversationId: string) => void;
  rejectCall: (conversationId: string) => void;
  endCall: (conversationId: string) => void;
  incomingCall: IncomingCall | null;
  clearIncomingCall: () => void;
  messageQueue: QueuedMessage[];
  enqueueMessage: (msg: QueuedMessage) => void;
  removeFromQueue: (tempId: string) => void;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  reconnectCount: 0,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendTyping: () => {},
  stopTyping: () => {},
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  incomingCall: null,
  clearIncomingCall: () => {},
  messageQueue: [],
  enqueueMessage: () => {},
  removeFromQueue: () => {},
  onlineUsers: new Set(),
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHeartbeat = useCallback((sock: Socket) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (sock.connected) {
        sock.emit("ping");
      }
    }, 25000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      stopHeartbeat();
      return;
    }

    const newSocket = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 30,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      setReconnectCount((c) => c + 1);
      startHeartbeat(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      stopHeartbeat();
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket error:", err.message);
    });

    newSocket.on("pong", () => {});

    newSocket.on("call:incoming", (data: IncomingCall) => setIncomingCall(data));
    newSocket.on("call:ended", () => setIncomingCall(null));
    newSocket.on("call:rejected", () => setIncomingCall(null));

    newSocket.on("user:online", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => { const next = new Set(prev); next.add(userId); return next; });
    });
    newSocket.on("user:offline", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Reconnect on app foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);

    return () => {
      sub.remove();
      stopHeartbeat();
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, startHeartbeat, stopHeartbeat]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("conversation:join", { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("conversation:leave", { conversationId });
  }, []);

  const sendTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing:start", { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing:stop", { conversationId });
  }, []);

  const initiateCall = useCallback((conversationId: string, callType: "voice" | "video") => {
    socketRef.current?.emit("call:init", { conversationId, callType });
  }, []);

  const acceptCall = useCallback((conversationId: string) => {
    socketRef.current?.emit("call:accept", { conversationId });
    setIncomingCall(null);
  }, []);

  const rejectCall = useCallback((conversationId: string) => {
    socketRef.current?.emit("call:reject", { conversationId });
    setIncomingCall(null);
  }, []);

  const endCall = useCallback((conversationId: string) => {
    socketRef.current?.emit("call:end", { conversationId });
  }, []);

  const clearIncomingCall = useCallback(() => setIncomingCall(null), []);

  const enqueueMessage = useCallback((msg: QueuedMessage) => {
    setMessageQueue((q) => [...q, msg]);
  }, []);

  const removeFromQueue = useCallback((tempId: string) => {
    setMessageQueue((q) => q.filter((m) => m.tempId !== tempId));
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket, isConnected, reconnectCount,
        joinConversation, leaveConversation,
        sendTyping, stopTyping,
        initiateCall, acceptCall, rejectCall, endCall,
        incomingCall, clearIncomingCall,
        messageQueue, enqueueMessage, removeFromQueue,
        onlineUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
