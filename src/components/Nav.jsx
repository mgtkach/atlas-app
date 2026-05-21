import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../App'

export default function Nav() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const isAssessment = location.pathname === '/assessment'

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav className="topnav">
      <Link to="/" className="topnav__brand">ATLAS<span>.</span></Link>
      {!isAssessment && (
        <div className="topnav__right">
          {user ? (
            <>
              <span className="topnav__tag">{user.email}</span>
              <Link to="/dashboard" style={{ color: 'var(--sky)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
              <Link to="/admin"     style={{ color: 'var(--sky)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>All Projects</Link>
              <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--sky)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" style={{ color: 'var(--sky)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600, opacity: 0.75 }}>
              Facilitator login →
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
