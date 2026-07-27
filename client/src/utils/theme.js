export const THEME_KEY = "vocaledge_theme";

/**
 * Applies the dark or light data-theme attribute to document.documentElement
 * based on explicit setting ('dark' | 'light') or OS system preference.
 */
export const applyTheme = (theme) => {
  const mode = theme || localStorage.getItem(THEME_KEY) || "system";
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
};

/**
 * Initializes the theme system once when the application starts.
 * Sets initial data-theme attribute and registers system media query listener.
 */
export const initTheme = () => {
  if (typeof window === "undefined") return;

  const savedTheme = localStorage.getItem(THEME_KEY) || "system";
  applyTheme(savedTheme);

  // Sync with OS color scheme changes if system mode is active
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    const currentTheme = localStorage.getItem(THEME_KEY) || "system";
    if (currentTheme === "system") {
      applyTheme("system");
    }
  };

  try {
    mediaQuery.removeEventListener("change", handleSystemChange);
    mediaQuery.addEventListener("change", handleSystemChange);
  } catch {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemChange);
  }
};

/**
 * Updates the saved theme preference and applies the changes.
 */
export const setThemePreference = (newTheme) => {
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
};
