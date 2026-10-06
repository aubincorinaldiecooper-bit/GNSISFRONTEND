// One Beautiful UI system; the console and its portals share upstream dark tokens.
// Public pages use its light scope outside the console session.
import { Outlet } from "react-router";

import { UIThemeProvider } from "@/components/ui/theme";
import { SessionProvider } from "@/lib/session";

export default function ConsoleFrame() {
  return (
    <UIThemeProvider theme="dark">
      <div className="dark min-h-screen bg-background text-foreground">
        <SessionProvider>
          <Outlet />
        </SessionProvider>
      </div>
    </UIThemeProvider>
  );
}
