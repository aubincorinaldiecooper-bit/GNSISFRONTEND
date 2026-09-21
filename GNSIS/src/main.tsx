import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import LandingPage from './pages/LandingPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import LegacyDashboardRedirect from './components/LegacyDashboardRedirect.tsx'
import { SessionProvider } from './lib/session'
import { ADMIN_BASE, LEGACY_DASHBOARD_PATHS } from './lib/adminRoutes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* mode="dark" pins the Astryx theme dark regardless of OS preference,
        matching the reference screenshots. The public landing page at "/" sits
        outside that system — it carries the gnsis brand's own light ground. */}
    <Theme theme={neutralTheme} mode="dark">
      <BrowserRouter>
        <SessionProvider>
          <Routes>
            {/* The public front door: what GNSIS is, and a QR that puts a phone
                into a live session. No sign-in — during the pilot the session
                is open to anyone with the address. */}
            <Route path="/" element={<LandingPage />} />
            {/* Older public entry points both resolve to the front door. */}
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />

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

            {/* Anything else is a visitor who mistyped: show the front door. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>,
)
