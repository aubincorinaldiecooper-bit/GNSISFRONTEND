import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import LandingPage from './pages/LandingPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import { SessionProvider } from './lib/session'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          {/* Public marketing surface — its "Connect GitHub" CTA routes to the
              real /login GitHub OAuth entry. */}
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<App />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
