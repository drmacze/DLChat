import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
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

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
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
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
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
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

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

    const newSocket = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on("connect", () => setIsConnected(true));
    newSocket.on("disconnect", () => setIsConnected(false));
    newSocket.on("connect_error", (err) => console.warn("Socket error:", err.message));
    newSocket.on("call:incoming", (data: IncomingCall) => setIncomingCall(data));
    newSocket.on("call:ended", () => setIncomingCall(null));
    newSocket.on("call:rejected", () => setIncomingCall(null));

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

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

  return (
    <SocketContext.Provider
      value={{
        socket, isConnected,
        joinConversation, leaveConversation,
        sendTyping, stopTyping,
        initiateCall, acceptCall, rejectCall, endCall,
        incomingCall, clearIncomingCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
