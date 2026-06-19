import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback, useState } from "react";
import { Platform, View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider, useSocket } from "@/context/SocketContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { TutorialProvider } from "@/context/TutorialContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Avatar from "@/components/common/Avatar";
import { BASE_URL } from "@/utils/api";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function PushNotificationRegistrar() {
  const { isAuthenticated, token } = useAuth();
  const registerToken = useCallback(
    async (pushToken: string) => {
      if (!isAuthenticated || !token) return;
      try {
        const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
        await fetch(`${BASE_URL}/api/notifications/push-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: pushToken, platform }),
        });
      } catch (err) { console.warn("Push token reg failed:", err); }
    },
    [isAuthenticated, token]
  );
  usePushNotifications(isAuthenticated ? registerToken : undefined);
  return null;
}

function IncomingCallOverlay() {
  const { incomingCall, acceptCall, rejectCall } = useSocket();
  const { c } = useTheme();

  if (!incomingCall) return null;

  const handleAccept = () => {
    acceptCall(incomingCall.conversationId);
    router.push({
      pathname: "/call/[conversationId]",
      params: {
        conversationId: incomingCall.conversationId,
        type: incomingCall.callType,
        isIncoming: "true",
        callerName: incomingCall.callerName,
        avatarUrl: incomingCall.callerAvatar ?? "",
        roomId: incomingCall.roomId,
      },
    } as any);
  };

  const handleReject = () => {
    rejectCall(incomingCall.conversationId);
  };

  return (
    <View style={[callStyles.container, { backgroundColor: c.sidebar, borderColor: c.border }]}>
      <View style={callStyles.left}>
        <Avatar uri={incomingCall.callerAvatar} name={incomingCall.callerName} size={44} />
        <View>
          <Text style={[callStyles.name, { color: c.foreground }]} numberOfLines={1}>{incomingCall.callerName}</Text>
          <Text style={[callStyles.label, { color: c.mutedForeground }]}>
            Panggilan {incomingCall.callType === "video" ? "Video" : "Suara"} Masuk 📞
          </Text>
        </View>
      </View>
      <View style={callStyles.actions}>
        <TouchableOpacity style={[callStyles.actionBtn, { backgroundColor: "#e74c3c" }]} onPress={handleReject}>
          <Feather name="phone-off" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[callStyles.actionBtn, { backgroundColor: "#2ecc71" }]} onPress={handleAccept}>
          <Feather name="phone" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MaintenanceBanner() {
  const { c } = useTheme();
  const { socket } = useSocket();
  const { user } = useAuth();
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState<{ isActive: boolean; message: string | null } | null>(null);
  const retryRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkStatus = useCallback(async (scheduleRetry = false) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/maintenance/status`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMaintenance(data);
        return true;
      }
    } catch {}
    if (scheduleRetry) {
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => checkStatus(false), 5_000);
    }
    return false;
  }, []);

  useEffect(() => {
    checkStatus(true);
    const interval = setInterval(() => checkStatus(false), 30_000);
    return () => {
      clearInterval(interval);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [checkStatus]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (data: { isActive: boolean; message: string | null }) => {
      setMaintenance(data);
    };
    socket.on("maintenance:update", onUpdate);
    // Request current status on socket connect
    checkStatus(false);
    return () => { socket.off("maintenance:update", onUpdate); };
  }, [socket, checkStatus]);

  if (user?.username === "drmadev" || pathname === "/admin") return null;
  if (!maintenance?.isActive) return null;

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={maintenanceStyles.overlay}>
        <View style={[maintenanceStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={maintenanceStyles.emoji}>🔧</Text>
          <Text style={[maintenanceStyles.title, { color: c.foreground }]}>Sedang Dalam Pemeliharaan</Text>
          <Text style={[maintenanceStyles.message, { color: c.mutedForeground }]}>
            {maintenance.message ?? "Aplikasi sedang diperbarui. Mohon tunggu sebentar."}
          </Text>
          <ActivityIndicator color={c.primary} style={{ marginTop: 20 }} />
          <TouchableOpacity style={[maintenanceStyles.refreshBtn, { borderColor: c.border }]} onPress={() => checkStatus()}>
            <Feather name="refresh-cw" size={14} color={c.mutedForeground} />
            <Text style={[maintenanceStyles.refreshText, { color: c.mutedForeground }]}>Cek Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const maintenanceStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 32 },
  card: { borderRadius: 20, borderWidth: 1, padding: 32, width: "100%", maxWidth: 380, alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  message: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  refreshBtn: { marginTop: 24, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  refreshText: { fontSize: 13 },
});

const callStyles = StyleSheet.create({
  container: {
    position: "absolute", top: Platform.OS === "ios" ? 50 : 30, left: 12, right: 12,
    borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center",
    padding: 12, gap: 10, zIndex: 9999, elevation: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[conversationId]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="ai-chat/[aiId]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="profile/[userId]" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="settings" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="notifications" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="search" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="starred-messages" options={{ presentation: "card", headerShown: false }} />
      <Stack.Screen name="call/[conversationId]" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="story/create" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="story/view/[userId]" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="post/create" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="new-group" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [fontReady, setFontReady] = React.useState(Platform.OS === "web");

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setFontReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFontReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  if (!fontReady) return null;

  return (
    <ThemeProvider>
      <TutorialProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <PushNotificationRegistrar />
                <SocketProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                    <IncomingCallOverlay />
                    <MaintenanceBanner />
                  </GestureHandlerRootView>
                </SocketProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </TutorialProvider>
    </ThemeProvider>
  );
}
