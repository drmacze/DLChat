import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TutorialKey = "chats" | "chat_room" | "contacts" | "feed" | "profile" | "settings" | "ai_contact" | "streak";

interface TutorialContextValue {
  seen: Set<TutorialKey>;
  markSeen: (key: TutorialKey) => void;
  isSeen: (key: TutorialKey) => boolean;
  resetAll: () => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  seen: new Set(),
  markSeen: () => {},
  isSeen: () => true,
  resetAll: () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState<Set<TutorialKey>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("tutorial_seen_v2").then((val) => {
      if (val) {
        try { setSeen(new Set(JSON.parse(val) as TutorialKey[])); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const markSeen = useCallback((key: TutorialKey) => {
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(key);
      AsyncStorage.setItem("tutorial_seen_v2", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isSeen = useCallback((key: TutorialKey) => !loaded || seen.has(key), [loaded, seen]);

  const resetAll = useCallback(() => {
    setSeen(new Set());
    AsyncStorage.removeItem("tutorial_seen_v2");
  }, []);

  return (
    <TutorialContext.Provider value={{ seen, markSeen, isSeen, resetAll }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
