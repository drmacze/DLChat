import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return null;
  }

  type AnyPerms = { granted?: boolean; status?: string; canAskAgain?: boolean };
  const existingPerms = (await Notifications.getPermissionsAsync()) as AnyPerms;
  let isGranted = existingPerms.granted ?? existingPerms.status === "granted";

  if (!isGranted && existingPerms.canAskAgain !== false) {
    const newPerms = (await Notifications.requestPermissionsAsync()) as AnyPerms;
    isGranted = newPerms.granted ?? newPerms.status === "granted";
  }

  if (!isGranted) {
    console.warn("Push notification permission denied");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Dlavie Chat",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2AABEE",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 200, 300],
      lightColor: "#2AABEE",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getDevicePushTokenAsync();

    return typeof tokenData === "string" ? tokenData : tokenData.data;
  } catch (err) {
    console.warn("Failed to get push token:", err);
    return null;
  }
}

interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

export function usePushNotifications(
  onRegisterToken?: (token: string) => Promise<void>
): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const register = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      if (onRegisterToken) {
        await onRegisterToken(token).catch(console.warn);
      }
    }
  }, [onRegisterToken]);

  useEffect(() => {
    register();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((n) => {
        setNotification(n);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        console.log("Notification tapped:", data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [register]);

  return { expoPushToken, notification };
}
