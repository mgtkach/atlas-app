import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import RED_QUESTIONS, { SECTIONS as RED_SECTIONS } from '../data/redbook-questions'
import YELLOW_QUESTIONS, { SECTIONS as YELLOW_SECTIONS } from '../data/yellowbook-questions'

export default function Assessment() {
  const navigate = useNavigate()
  const [session, setSession]       = useState(null)
  const [current, setCurrent]       = useState(0)
  const [answers, setAnswers]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('atlas_session')
    if (!raw) { navigate('/'); return }
    setSession(JSON.parse(raw))
  }, [navigate])

  if (!session) return null

  const isYellow  = session.bookType === 'yellow'
  const QUESTIONS = isYellow ? YELLOW_QUESTIONS : RED_QUESTIONS
  const SECTIONS  = isYellow ? YELLOW_SECTIONS  : RED_SECTIONS
  const question  = QUESTIONS[current]
  const total     = QUESTIONS.length
  const isLastQ   = current === total - 1
  const currentAnswer = answers[question.id]
  const section   = SECTIONS.find(s => s.id === question.section)

  const handleSelect     = (letter) => setAnswers(prev => ({ ...prev, [question.id]: letter }))
  const handleTextChange = (text)   => setAnswers(prev => ({ ...prev, [question.id]: text }))
  const handleNext       = ()       => { if (current < total - 1) setCurrent(c => c + 1) }
  const handlePrev       = ()       => { if (current > 0) setCurrent(c => c - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await addDoc(collection(db, 'responses'), {
        projectId: session.projectId, projectCode: session.projectCode,
        bookType: session.bookType, respondentName: session.respondentName,
        respondentRole: session.respondentRole, respondentOrg: session.respondentOrg || '',
        answers, submittedAt: serverTimestamp(),
        durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
      })
      sessionStorage.removeItem('atlas_session')
      navigate('/complete')
    } catch (err) {
      console.error(err)
      setError('Submission failed. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  const prevSection   = current > 0 ? QUESTIONS[current - 1].section : null
  const showSection   = prevSection !== question.section
  const answeredCount = Object.keys(answers).filter(k => {
    const q = QUESTIONS.find(q => q.id === k)
    if (!q) return false
    return q.type === 'open' ? answers[k]?.trim().length > 0 : Boolean(answers[k])
  }).length

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--off-white)' }}>
      <div style={{ position: 'sticky', top: '56px', zIndex: 50, background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate)', fontWeight: 600 }}>
              {session.projectCode} · {session.respondentName} ·{' '}
              <span style={{ color: isYellow ? '#B45309' : 'var(--coral)', fontWeight: 700 }}>
                {isYellow ? 'Yellow Book' : 'Red Book'}
              </span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{current + 1} / {total}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {showSection && (
          <div style={{ marginBottom: '1.5rem' }}>
            <span className="section-badge section-badge--blue" style={{ background: section.color + '22', color: section.color }}>Section {section.id}</span>
            <h2 style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'var(--navy)' }}>{section.title}</h2>
            <hr className="divider" />
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ flexShrink: 0, width: '36px', height: '36px', background: 'var(--navy)', color: 'var(--white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700 }}>
              {question.id}
            </span>
            <h3 style={{ fontSize: '1.05rem', lineHeight: 1.55, color: 'var(--navy)', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
              {question.question}
            </h3>
          </div>

          {question.type === 'multiple-choice' ? (
            <div>
              {question.options.map(opt => (
                <div key={opt.letter} className={`option ${currentAnswer === opt.letter ? 'option--selected' : ''}`} onClick={() => handleSelect(opt.letter)} role="radio" aria-checked={currentAnswer === opt.letter} tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSelect(opt.letter)}>
                  <div className="option__letter">{opt.letter}</div>
                  <div className="option__text">{opt.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <textarea className="textarea" placeholder={question.placeholder || 'Type your response here…'} value={currentAnswer || ''} onChange={e => handleTextChange(e.target.value)} />
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '0.5rem' }}>This is optional — share as much or as little as you like.</p>
            </div>
          )}
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn--secondary" onClick={handlePrev} disabled={current === 0}>← Back</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{answeredCount} of {total} answered</span>
          {isLastQ ? (
            <button className="btn btn--teal" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit responses →'}</button>
          ) : (
            <button className="btn btn--primary" onClick={handleNext}>Next →</button>
          )}
        </div>
        {question.type === 'open' && !isLastQ && (
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--slate)' }}>Open questions are optional — you can move on without answering.</p>
        )}
      </div>
    </div>
  )
}
