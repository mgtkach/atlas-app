import { useState, useEffect } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

// ── Authorised facilitator emails ─────────────────────────────────────────────
const ALLOWED_EMAILS = [
  'marc.tkach@gmail.com',
]

export default function Login() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && ALLOWED_EMAILS.includes(user.email)) navigate('/dashboard')
  }, [user, navigate])

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email  = result.user.email

      if (!ALLOWED_EMAILS.includes(email)) {
        // Sign them back out immediately
        await signOut(auth)
        setError(`Access restricted. ${email} is not an authorised facilitator.`)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page center" style={{ flexDirection: 'column', padding: '3rem 1.5rem' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>

        <div style={{
          display: 'inline-block',
          background: 'var(--navy)',
          color: 'var(--sky)',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '0.3rem 0.75rem',
          borderRadius: '100px',
          marginBottom: '1rem',
        }}>
          Facilitator Access
        </div>

        <h2 style={{ marginBottom: '0.5rem' }}>Sign in to ATLAS</h2>
        <p style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
          Access the facilitator dashboard to view real-time diagnostic results and manage projects.
        </p>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem', textAlign: 'left' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn--primary"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', gap: '0.75rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--slate)' }}>
          Participants do not need to sign in — they use a project code on the home page.
        </p>
      </div>
    </div>
  )
}
