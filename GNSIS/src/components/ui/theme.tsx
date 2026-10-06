import { createContext, useContext, type ReactNode } from "react"

// Portals leave their DOM scope, but retain React context. Carry the CSS token
// scope to shared Beautiful-themed Radix content without document mutation.
type UITheme = "light" | "dark"
const UIThemeContext = createContext<UITheme>("light")

function UIThemeProvider({ theme, children }: { theme: UITheme; children: ReactNode }) {
  return <UIThemeContext.Provider value={theme}>{children}</UIThemeContext.Provider>
}

function useUITheme() {
  return useContext(UIThemeContext)
}

export { UIThemeProvider, useUITheme }
export type { UITheme }
