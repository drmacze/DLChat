import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TutorialProvider } from "@/context/TutorialContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError || Platform.OS === "web") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (Platform.OS !== "web" && !fontsLoaded && !fontError) return null;

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
