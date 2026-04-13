import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

/**
 * AuthenticatedThemeProvider - Wraps authenticated layouts and ensures 
 * a theme reset on unmount to satisfy "Light Mode Only" for public pages.
 */
export function AuthenticatedThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Component unmount logic (leaving authenticated area)
    return () => {
      // Force reset to light mode on the root element
      // Small timeout ensures next-themes side-effects are cleared
      setTimeout(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }, 0);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      {children}
    </ThemeProvider>
  );
}
