import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendTyping: () => {},
  stopTyping: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(`https://${process.env.EXPO_PUBLIC_DOMAIN}`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));
    newSocket.on("connect_error", (err) => console.warn("Socket error:", err.message));

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const joinConversation = (conversationId: string) => {
    socketRef.current?.emit("conversation:join", { conversationId });
  };

  const leaveConversation = (conversationId: string) => {
    socketRef.current?.emit("conversation:leave", { conversationId });
  };

  const sendTyping = (conversationId: string) => {
    socketRef.current?.emit("typing:start", { conversationId });
  };

  const stopTyping = (conversationId: string) => {
    socketRef.current?.emit("typing:stop", { conversationId });
  };

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, joinConversation, leaveConversation, sendTyping, stopTyping }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
