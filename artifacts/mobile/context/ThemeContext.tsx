import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import colors, { ColorScheme, ThemeMode } from "@/constants/colors";

interface ThemeContextValue {
  theme: ThemeMode;
  c: ColorScheme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  c: colors.dark,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem("app_theme").then((saved) => {
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
      } else {
        const sys = Appearance.getColorScheme();
        setThemeState(sys === "light" ? "light" : "dark");
      }
    });
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem("app_theme", mode);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, c: colors[theme], toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
