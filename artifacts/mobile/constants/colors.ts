export type ThemeMode = "dark" | "light";

const dark = {
  mode: "dark" as ThemeMode,

  background: "#0D0D0E",
  backgroundGradient: ["#0D0D0E", "#111113"] as [string, string],

  surface: "#161618",
  surfaceGradient: ["#161618", "#1B1B1E"] as [string, string],
  surfaceHigh: "#202024",

  overlay: "rgba(13,13,14,0.88)",
  glass: "rgba(255,255,255,0.045)",
  glassBorder: "rgba(255,255,255,0.085)",

  card: "#161618",
  sidebar: "#111112",

  foreground: "#F0EEEA",
  mutedForeground: "#888884",
  subtleForeground: "#2E2E32",

  primary: "#7C79F0",
  primaryGradient: ["#9490F5", "#6864E0"] as [string, string],
  primaryForeground: "#FFFFFF",

  secondary: "#1E1E24",

  accent: "#6864E0",
  accentGradient: ["#8480EC", "#6460D0"] as [string, string],

  teal: "#3AADA6",
  success: "#3CB87A",
  successGradient: ["#48D490", "#2AA060"] as [string, string],
  warning: "#E09030",
  danger: "#E06060",
  dangerGradient: ["#F07070", "#D04848"] as [string, string],

  border: "rgba(255,255,255,0.065)",
  borderStrong: "rgba(255,255,255,0.11)",

  input: "#161618",

  online: "#3CB87A",

  streak: "#E07838",
  streakGradient: ["#F08A48", "#CC6028"] as [string, string],

  aiGradient: ["#A8A4F8", "#7C79F0"] as [string, string],
  messageMeGradient: ["#8480EC", "#6460D0"] as [string, string],
  messageThemBg: "#1E1E24",

  tabBarBg: "rgba(10,10,11,0.97)",
  headerBg: "rgba(13,13,14,0.97)",
  shimmer: "#202024",

  text: "#F0EEEA",
  tint: "#7C79F0",

  logoShimmer: ["transparent", "rgba(255,255,255,0.28)", "transparent"] as [string, string, string],
};

const light = {
  mode: "light" as ThemeMode,

  background: "#F7F6F3",
  backgroundGradient: ["#F7F6F3", "#F2F1ED"] as [string, string],

  surface: "#FFFFFF",
  surfaceGradient: ["#FFFFFF", "#F8F7F4"] as [string, string],
  surfaceHigh: "#F1F0EC",

  overlay: "rgba(247,246,243,0.93)",
  glass: "rgba(255,255,255,0.88)",
  glassBorder: "rgba(0,0,0,0.07)",

  card: "#FFFFFF",
  sidebar: "#F2F1ED",

  foreground: "#1A1917",
  mutedForeground: "#6A6A66",
  subtleForeground: "#DDDCD8",

  primary: "#5654C0",
  primaryGradient: ["#6864D8", "#4E4CAE"] as [string, string],
  primaryForeground: "#FFFFFF",

  secondary: "#EDEDF5",

  accent: "#6864D8",
  accentGradient: ["#7A76E4", "#5E5CC4"] as [string, string],

  teal: "#28908A",
  success: "#2A9A5E",
  successGradient: ["#3EC076", "#248A50"] as [string, string],
  warning: "#BF6E18",
  danger: "#C04040",
  dangerGradient: ["#D05050", "#B03030"] as [string, string],

  border: "rgba(0,0,0,0.078)",
  borderStrong: "rgba(0,0,0,0.14)",

  input: "#FFFFFF",

  online: "#2A9A5E",

  streak: "#CC6428",
  streakGradient: ["#E07438", "#BA5420"] as [string, string],

  aiGradient: ["#8480E8", "#6864D8"] as [string, string],
  messageMeGradient: ["#6864D8", "#5250B4"] as [string, string],
  messageThemBg: "#EDEDF5",

  tabBarBg: "rgba(247,246,243,0.97)",
  headerBg: "rgba(247,246,243,0.98)",
  shimmer: "#F1F0EC",

  text: "#1A1917",
  tint: "#5654C0",

  logoShimmer: ["transparent", "rgba(255,255,255,0.55)", "transparent"] as [string, string, string],
};

export type ColorScheme = typeof dark;

const colors = { dark, light };
export default colors;
