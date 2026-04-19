// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import CalendarPage from './pages/CalendarPage'
import TasksPage from './pages/TasksPage'
import SettingsPage from './pages/SettingsPage'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-shell">
          <nav className="top-nav">
            <div className="nav-logo">
              <div className="nav-logo-icon">📅</div>
              MediaPlan
            </div>
            <div className="nav-links">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Календарь
              </NavLink>
              <NavLink to="/tasks" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Задачи
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Настройки
              </NavLink>
            </div>
          </nav>
          <main className="app-main">
            <Routes>
              <Route path="/" element={<CalendarPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}
