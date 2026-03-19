import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes'
import type { ThemeProviderProps as NextThemesProviderProps } from 'next-themes'

type Theme = "dark" | "light" | "system"

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: Pick<NextThemesProviderProps, 'children' | 'defaultTheme' | 'storageKey'>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export const useTheme = () => {
  const { theme, setTheme } = useNextTheme()

  return {
    theme: (theme as Theme) ?? 'system',
    setTheme: (value: Theme) => setTheme(value),
  } as ThemeProviderState
}
