import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TeamPage      from './pages/TeamPage'
import HistoryPage   from './pages/HistoryPage'
import LogPage       from './pages/LogPage'
import NotesPage     from './pages/NotesPage'

function RequireAuth({ children }) {
  return localStorage.getItem('pulse_token')
    ? <Layout>{children}</Layout>
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/team"      element={<TeamPage />} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/history"   element={<RequireAuth><HistoryPage /></RequireAuth>} />
      <Route path="/log"       element={<RequireAuth><LogPage /></RequireAuth>} />
      <Route path="/notes"     element={<RequireAuth><NotesPage /></RequireAuth>} />
      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
