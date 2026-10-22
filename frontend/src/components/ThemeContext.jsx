import { useEffect, useState } from "react";
import { ThemeContext } from "./themeContext";

const themes = ["original", "light", "dark"];

const readSavedTheme = () => {
  try {
    const saved = window.localStorage.getItem("university-erp-theme");
    return themes.includes(saved) ? saved : "original";
  } catch {
    return "original";
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("university-erp-theme", theme);
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
