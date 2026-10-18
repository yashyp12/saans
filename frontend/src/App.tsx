import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import Login from './Login'
import {
  Disclaimer,
  Docs,
  Landing,
  NotFound,
  Privacy,
  SiteFooter,
  SiteNav,
  Terms,
} from './Site'

function DashboardPage() {
  return (
    <>
      <SiteNav />
      <Dashboard />
      <SiteFooter />
    </>
  )
}

function LandingRoute() {
  const location = useLocation()

  useEffect(() => {
    const section = location.pathname.slice(1)
    if (!section) return
    window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 0)
  }, [location.pathname])

  return <Landing />
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/problem" element={<LandingRoute />} />
        <Route path="/how" element={<LandingRoute />} />
        <Route path="/features" element={<LandingRoute />} />
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  )
}

export default App
