import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPRING } from "@/shared/motion/springs";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration the resolved theme is unknown; render the frame only, so
  // the icon never flips visibly on first paint.
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" disabled />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative overflow-hidden"
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={SPRING.snappy}
        className="flex items-center justify-center"
      >
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </motion.span>
    </Button>
  );
}
