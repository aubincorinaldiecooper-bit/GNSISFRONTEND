import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import App from './App.tsx'
import LoginPage from './pages/LoginPage.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import LegacyDashboardRedirect from './components/LegacyDashboardRedirect.tsx'
import FrontDoor from './components/FrontDoor.tsx'
import ConsoleFrame from './components/ConsoleFrame.tsx'
import { ADMIN_BASE, LEGACY_DASHBOARD_PATHS } from './lib/adminRoutes'
import { homeExperience } from './lib/env'
import { PATHS } from './panoptic/config'
import { STUDIO_PATHS } from './studio/config'

// The Panoptic pages load as their own chunk, only when one is visited.
const panoptic = () => import('./panoptic/pages')
const PanopticSite = lazy(() => panoptic().then((m) => ({ default: m.PanopticSite })))
const MomentsPage = lazy(() => panoptic().then((m) => ({ default: m.MomentsPage })))
const WebSteeringPage = lazy(() => panoptic().then((m) => ({ default: m.WebSteeringPage })))
const PrivacyPage = lazy(() => panoptic().then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => panoptic().then((m) => ({ default: m.TermsPage })))

// The GNSIS Studio pages: their own chunk too.
const studio = () => import('./studio/pages')
const StudioSite = lazy(() => studio().then((m) => ({ default: m.StudioSite })))
const HomePage = lazy(() => studio().then((m) => ({ default: m.HomePage })))
const ModelsPage = lazy(() => studio().then((m) => ({ default: m.ModelsPage })))
const PanopticModelPage = lazy(() => studio().then((m) => ({ default: m.PanopticPage })))
const DevelopersPage = lazy(() => studio().then((m) => ({ default: m.DevelopersPage })))

// What "/" is depends on GNSIS_HOME_EXPERIENCE (see docker-entrypoint.sh and
// the Caddyfile). With "live", the default, Caddy serves the live session
// page at "/" and this bundle never sees it. With "video-search", Caddy hands
// "/" to this bundle for the Panoptic landing; "studio" serves the lab home.
const videoSearchIsHome = homeExperience() === 'video-search'
const studioIsHome = homeExperience() === 'studio'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Panoptic: public pages with their own look, outside the console's
            theme and session. Noindex while the live page is the home
            experience. */}
        <Route
          element={
            <Suspense fallback={null}>
              <PanopticSite />
            </Suspense>
          }
        >
          {videoSearchIsHome && <Route index element={<MomentsPage />} />}
          <Route
            path={PATHS.videoSearch}
            element={videoSearchIsHome ? <Navigate to="/" replace /> : <MomentsPage />}
          />
          <Route path={PATHS.webSteering} element={<WebSteeringPage />} />
          <Route path={PATHS.privacy} element={<PrivacyPage />} />
          <Route path={PATHS.terms} element={<TermsPage />} />
        </Route>

        <Route
          element={
            <Suspense fallback={null}>
              <StudioSite />
            </Suspense>
          }
        >
          {studioIsHome && <Route index element={<HomePage />} />}
          <Route
            path={STUDIO_PATHS.home}
            element={studioIsHome ? <Navigate to="/" replace /> : <HomePage />}
          />
          <Route path={STUDIO_PATHS.models} element={<ModelsPage />} />
          <Route path={STUDIO_PATHS.panoptic} element={<PanopticModelPage />} />
          <Route path={STUDIO_PATHS.developers} element={<Navigate to={STUDIO_PATHS.developersPanoptic} replace />} />
          <Route path={STUDIO_PATHS.developersPanoptic} element={<DevelopersPage modelId="panoptic" />} />
          <Route path={STUDIO_PATHS.developersGnsis01} element={<Navigate to={STUDIO_PATHS.developersPanoptic} replace />} />
        </Route>

        <Route element={<ConsoleFrame />}>
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
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
