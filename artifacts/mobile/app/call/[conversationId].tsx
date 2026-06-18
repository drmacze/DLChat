import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Avatar from "@/components/common/Avatar";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BASE_URL } from "@/utils/api";

export default function CallScreen() {
  const { conversationId, type = "voice", displayName, avatarUrl, isIncoming, callerName, roomId: paramRoomId } = useLocalSearchParams<{
    conversationId: string;
    type: string;
    displayName: string;
    avatarUrl: string;
    isIncoming: string;
    callerName: string;
    roomId: string;
  }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { socket, initiateCall, acceptCall, rejectCall, endCall } = useSocket();
  const { user } = useAuth();
  const [callState, setCallState] = useState<"calling" | "ringing" | "connected" | "ended">(
    isIncoming === "true" ? "ringing" : "calling"
  );
  const [duration, setDuration] = useState(0);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;

  const roomId = paramRoomId ?? `dlchat-${conversationId}`;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = animate(ring1, 0);
    const a2 = animate(ring2, 400);
    const a3 = animate(ring3, 800);
    if (callState === "calling" || callState === "ringing") {
      a1.start(); a2.start(); a3.start();
    }
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [callState]);

  useEffect(() => {
    if (callState === "calling" && conversationId) {
      initiateCall(conversationId, type as "voice" | "video");
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onAccepted = () => {
      setCallState("connected");
      durationTimer.current = setInterval(() => setDuration((d) => d + 1), 1000);
      openJitsi();
    };
    const onRejected = () => {
      setCallState("ended");
      setTimeout(() => router.back(), 1500);
    };
    const onEnded = () => {
      setCallState("ended");
      if (durationTimer.current) clearInterval(durationTimer.current);
      setTimeout(() => router.back(), 1500);
    };
    socket.on("call:accepted", onAccepted);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);
    return () => {
      socket.off("call:accepted", onAccepted);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
    };
  }, [socket]);

  useEffect(() => {
    return () => { if (durationTimer.current) clearInterval(durationTimer.current); };
  }, []);

  const openJitsi = async () => {
    const jitsiUrl = `https://meet.jit.si/${roomId}`;
    await WebBrowser.openBrowserAsync(jitsiUrl);
  };

  const handleAccept = async () => {
    acceptCall(conversationId!);
    setCallState("connected");
    durationTimer.current = setInterval(() => setDuration((d) => d + 1), 1000);
    await openJitsi();
  };

  const handleReject = () => {
    rejectCall(conversationId!);
    router.back();
  };

  const handleEnd = () => {
    endCall(conversationId!);
    if (durationTimer.current) clearInterval(durationTimer.current);
    setCallState("ended");
    setTimeout(() => router.back(), 800);
  };

  const formatDuration = (secs: number) =>
    `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  const name = isIncoming === "true" ? (callerName ?? "Someone") : (displayName ?? "Contact");
  const stateLabel = callState === "calling" ? "Memanggil..." :
    callState === "ringing" ? `Panggilan ${type === "video" ? "Video" : "Suara"} Masuk` :
    callState === "connected" ? formatDuration(duration) :
    "Panggilan Berakhir";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bg} />

      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Feather name="chevron-down" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {(callState === "calling" || callState === "ringing") && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ring1 }], opacity: ring1.interpolate({ inputRange: [1, 1.6], outputRange: [0.3, 0] }) }]} />
              <Animated.View style={[styles.ring, { transform: [{ scale: ring2 }], opacity: ring2.interpolate({ inputRange: [1, 1.6], outputRange: [0.2, 0] }) }]} />
              <Animated.View style={[styles.ring, { transform: [{ scale: ring3 }], opacity: ring3.interpolate({ inputRange: [1, 1.6], outputRange: [0.1, 0] }) }]} />
            </>
          )}
          <Avatar uri={avatarUrl !== "undefined" ? avatarUrl : undefined} name={name} size={100} />
        </View>
        <Text style={styles.callerName}>{name}</Text>
        <View style={styles.stateRow}>
          {callState === "calling" && <Feather name={type === "video" ? "video" : "phone"} size={14} color="rgba(255,255,255,0.7)" />}
          <Text style={styles.stateLabel}>{stateLabel}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        {callState === "ringing" ? (
          <View style={styles.incomingControls}>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={[styles.controlBtn, styles.rejectBtn]} onPress={handleReject}>
                <Feather name="phone-off" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>Tolak</Text>
            </View>
            <View style={styles.controlGroup}>
              <TouchableOpacity style={[styles.controlBtn, styles.acceptBtn]} onPress={handleAccept}>
                <Feather name="phone" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>Angkat</Text>
            </View>
          </View>
        ) : callState === "calling" || callState === "connected" ? (
          <View style={styles.activeControls}>
            {callState === "connected" && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={openJitsi}>
                <Feather name="external-link" size={22} color="#fff" />
                <Text style={styles.secondaryLabel}>Buka Kamera</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={handleEnd}>
              <Feather name="phone-off" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Tutup</Text>
          </View>
        ) : (
          <Text style={styles.endedLabel}>Panggilan berakhir</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "space-between", paddingBottom: 60 },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#1a1a2e" },
  backBtn: { position: "absolute", left: 16, zIndex: 10 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  avatarContainer: { alignItems: "center", justifyContent: "center", width: 160, height: 160 },
  ring: { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  callerName: { fontSize: 28, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stateLabel: { fontSize: 16, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  controls: { width: "100%", alignItems: "center", paddingBottom: 20 },
  incomingControls: { flexDirection: "row", gap: 80 },
  activeControls: { alignItems: "center", gap: 12 },
  controlGroup: { alignItems: "center", gap: 8 },
  controlBtn: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  rejectBtn: { backgroundColor: "#e74c3c" },
  acceptBtn: { backgroundColor: "#2ecc71" },
  endBtn: { backgroundColor: "#e74c3c" },
  controlLabel: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  secondaryLabel: { color: "#fff", fontSize: 14, fontFamily: "Inter_400Regular" },
  endedLabel: { color: "rgba(255,255,255,0.6)", fontSize: 16, fontFamily: "Inter_400Regular" },
});
