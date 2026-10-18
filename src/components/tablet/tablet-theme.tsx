import { createContext, useContext } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TABLET_THEME_KEY = "rok.tablet.theme";

export const TabletThemeContext = createContext<{ light: boolean; toggle: () => void } | null>(null);

export function TabletThemeButton() {
  const theme = useContext(TabletThemeContext);
  if (!theme) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={theme.toggle}
      aria-label={theme.light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme.light ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      {theme.light ? "Dark" : "Light"}
    </Button>
  );
}
