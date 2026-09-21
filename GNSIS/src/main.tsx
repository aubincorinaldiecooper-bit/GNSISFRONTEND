import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import LegacyDashboardRedirect from './components/LegacyDashboardRedirect.tsx'
import FrontDoor from './components/FrontDoor.tsx'
import { SessionProvider } from './lib/session'
import { ADMIN_BASE, LEGACY_DASHBOARD_PATHS } from './lib/adminRoutes'

// "/" is not here on purpose. The site's front door is the live session page,
// which Caddy serves at "/" by forwarding to the GNSIS runtime (see Caddyfile).
// This bundle only ever owns the operator control plane and the way into it.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* mode="dark" pins the Astryx theme dark regardless of OS preference,
        matching the reference screenshots. */}
    <Theme theme={neutralTheme} mode="dark">
      <BrowserRouter>
        <SessionProvider>
          <Routes>
            {/* Sign-in exists for operators reaching /admin, not for visitors. */}
            <Route path="/login" element={<LoginPage />} />

            {LEGACY_DASHBOARD_PATHS.map((path) => (
              <Route key={path} path={path} element={<LegacyDashboardRedirect />} />
            ))}

            {/* The operator control plane: runs, repositories, usage, billing,
                API/MCP access and account administration. Authenticated only,
                and deliberately absent from every public surface. */}
            <Route element={<ProtectedRoute />}>
              <Route path={`${ADMIN_BASE}/*`} element={<App />} />
            </Route>

            {/* Anything else is a visitor who mistyped: the front door. */}
            <Route path="*" element={<FrontDoor />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>,
)
