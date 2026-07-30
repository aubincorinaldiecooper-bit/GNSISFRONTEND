import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import HomePage from './pages/HomePage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import { SessionProvider } from './lib/session'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* mode="dark" pins the Astryx theme dark regardless of OS preference,
        matching the reference screenshots. */}
    <Theme theme={neutralTheme} mode="dark">
      <BrowserRouter>
        <SessionProvider>
          <Routes>
            {/* Public marketing homepage. Its "Connect GitHub" CTA routes to the
                real /login GitHub OAuth entry (?next=/new). */}
            <Route path="/" element={<HomePage />} />
            {/* Permanent redirect so existing /welcome links land on "/". */}
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Everything else is the authenticated application (New Run at /new,
                plus /runs, /dashboard, /settings, /billing, …). */}
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<App />} />
            </Route>
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>,
)
