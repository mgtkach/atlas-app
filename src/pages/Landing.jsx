import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function Landing() {
  const navigate = useNavigate()
  const [projectCode, setProjectCode] = useState('')
  const [name, setName]               = useState('')
  const [role, setRole]               = useState('')
  const [org, setOrg]                 = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  const handleStart = async (e) => {
    e.preventDefault()
    setError('')
    if (!projectCode.trim()) { setError('Please enter your project code.'); return }
    if (!name.trim())        { setError('Please enter your name.'); return }
    if (!role.trim())        { setError('Please select your role.'); return }

    setLoading(true)
    try {
      const q    = query(collection(db, 'projects'), where('code', '==', projectCode.trim().toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) { setError('Project code not found. Please check with your facilitator.'); setLoading(false); return }

      const project = { id: snap.docs[0].id, ...snap.docs[0].data() }
      sessionStorage.setItem('atlas_session', JSON.stringify({
        projectId: project.id, projectCode: project.code, projectName: project.name,
        country: project.country, sector: project.sector, bookType: project.bookType || 'red',
        respondentName: name.trim(), respondentRole: role, respondentOrg: org.trim(),
        startedAt: Date.now(),
      }))
      navigate('/assessment')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-block', background: 'var(--navy)', color: 'var(--sky)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.35rem 0.9rem', borderRadius: '100px', marginBottom: '1rem' }}>
            Technical Alignment Diagnostic
          </div>
          <h1 style={{ marginBottom: '0.75rem' }}>Welcome to ATLAS</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            The Alignment Tool for Language and Technical Standards helps project teams build shared understanding before construction begins.
          </p>
        </div>

        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '0.35rem', fontSize: '1.25rem' }}>Start the diagnostic</h2>
          <p style={{ marginBottom: '1.75rem', fontSize: '0.9rem' }}>Enter the project code provided by your facilitator, then add your details.</p>

          <form onSubmit={handleStart}>
            <div className="field">
              <label className="label" htmlFor="code">Project code</label>
              <input id="code" className="input" type="text" placeholder="e.g. NPL-001" value={projectCode} onChange={e => setProjectCode(e.target.value)} style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }} autoComplete="off" />
            </div>
            <div className="field">
              <label className="label" htmlFor="name">Your full name</label>
              <input id="name" className="input" type="text" placeholder="First and last name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="role">Your role on this project</label>
              <select id="role" className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Select your role…</option>
                <optgroup label="Employer / Client">
                  <option>MCA / Employer Representative</option>
                  <option>Employer Project Manager</option>
                  <option>Government Counterpart</option>
                </optgroup>
                <optgroup label="Engineer / Supervision">
                  <option>Resident Engineer</option>
                  <option>Engineer's Representative</option>
                  <option>Design Engineer</option>
                  <option>Structural / Civil Engineer</option>
                  <option>MEP Engineer</option>
                  <option>Inspector / Site Engineer</option>
                </optgroup>
                <optgroup label="Contractor">
                  <option>Contractor Project Manager</option>
                  <option>Contractor Site Manager</option>
                  <option>Contractor Engineer</option>
                  <option>Sub-Contractor</option>
                </optgroup>
                <optgroup label="Other">
                  <option>Quantity Surveyor</option>
                  <option>Procurement / Contract Specialist</option>
                  <option>Other</option>
                </optgroup>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="org">Your organization <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input id="org" className="input" type="text" placeholder="Company or agency name" value={org} onChange={e => setOrg(e.target.value)} />
            </div>
            {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Checking code…' : 'Begin diagnostic →'}
            </button>
          </form>
        </div>

        <div style={{ maxWidth: '500px', margin: '2rem auto 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
          {[{ value: '27', label: 'Questions' }, { value: '15–20', label: 'Minutes' }, { value: 'No right answers', label: 'This is a discussion tool' }].map(s => (
            <div key={s.label} style={{ padding: '1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--navy)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: '0.35rem', lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
