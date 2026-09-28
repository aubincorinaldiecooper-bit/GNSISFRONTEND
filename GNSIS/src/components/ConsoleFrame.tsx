// The console's own frame: its dark Astryx theme and the session it signs in
// with. The public Panoptic pages sit outside it (see main.tsx).

import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { Outlet } from "react-router";

import { SessionProvider } from "@/lib/session";

export default function ConsoleFrame() {
  return (
    // mode="dark" pins the Astryx theme dark regardless of OS preference,
    // matching the reference screenshots.
    <Theme theme={neutralTheme} mode="dark">
      <SessionProvider>
        <Outlet />
      </SessionProvider>
    </Theme>
  );
}
