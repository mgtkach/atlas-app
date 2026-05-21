import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

import Landing    from './pages/Landing'
import Assessment from './pages/Assessment'
import Complete   from './pages/Complete'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Admin      from './pages/Admin'
import Nav        from './components/Nav'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const ALLOWED_EMAILS = ['marc.tkach@gmail.com']

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="page center" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Checking credentials…</p>
    </div>
  )
  return (user && ALLOWED_EMAILS.includes(user.email)) ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/"           element={<Landing />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/complete"   element={<Complete />} />
          <Route path="/login"      element={<Login />} />
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin"      element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
