import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { c } = useTheme();
  return c;
}
