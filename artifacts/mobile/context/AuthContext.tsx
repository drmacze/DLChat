import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { setBaseUrl, setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import { BASE_URL } from "@/utils/api";

setBaseUrl(BASE_URL);

interface UserProfile {
  id: string;
  phoneNumber: string;
  username: string | null;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  statusText: string | null;
  role: "user" | "moderator" | "admin";
  isOnline: boolean;
  lastSeenAt: string | null;
  privacyLastSeen: "everyone" | "contacts" | "nobody";
  privacyProfilePhoto: "everyone" | "contacts" | "nobody";
  privacyReadReceipts: boolean;
  createdAt: string;
}

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserProfile) => Promise<void>;
  updateUser: (user: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setAuth: async () => {},
  updateUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutRef = useRef<() => Promise<void>>(undefined);

  const logout = async () => {
    await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
    setUnauthorizedHandler(null);
    router.replace("/(auth)/login");
  };
  logoutRef.current = logout;

  useEffect(() => {
    AsyncStorage.multiGet(["auth_token", "auth_user"]).then(([tokenPair, userPair]) => {
      const storedToken = tokenPair[1];
      const storedUser = userPair[1];
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setAuthTokenGetter(() => storedToken);
        setUnauthorizedHandler(() => { logoutRef.current?.(); });
      }
      setIsLoading(false);
    });
  }, []);

  const setAuth = async (newToken: string, newUser: UserProfile) => {
    await AsyncStorage.multiSet([
      ["auth_token", newToken],
      ["auth_user", JSON.stringify(newUser)],
    ]);
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
    setUnauthorizedHandler(() => { logoutRef.current?.(); });
  };

  const updateUser = (newUser: UserProfile) => {
    setUser(newUser);
    AsyncStorage.setItem("auth_user", JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token,
        setAuth,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
