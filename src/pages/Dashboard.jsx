import { useState, useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import RED_QUESTIONS, { SECTIONS as RED_SECTIONS } from '../data/redbook-questions'
import YELLOW_QUESTIONS, { SECTIONS as YELLOW_SECTIONS } from '../data/yellowbook-questions'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const OPTION_COLORS = { A: '#3B82B6', B: '#1D9E75', C: '#E05A47', D: '#6B7B8D' }

function divergenceScore(counts, n) {
  if (n === 0) return 0
  const probs = Object.values(counts).map(c => c / n)
  const entropy = -probs.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0)
  return entropy / Math.log2(4)
}

function QuestionResult({ question, responses, sections }) {
  const section = sections.find(s => s.id === question.section)
  const mcAnswers = responses.map(r => r.answers?.[question.id]).filter(Boolean)
  const n = mcAnswers.length

  if (question.type === 'open') {
    const texts = responses
      .map(r => ({ name: r.respondentName, role: r.respondentRole, text: r.answers?.[question.id] }))
      .filter(r => r.text?.trim())
    return (
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <span style={{ flexShrink: 0, background: section.color, color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{question.id}</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 600, margin: 0 }}>{question.question}</p>
        </div>
        {texts.length === 0 ? (
          <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic' }}>No responses yet.</p>
        ) : (
          texts.map((r, i) => (
            <div key={i} style={{ padding: '0.75rem', background: 'var(--off-white)', borderRadius: 'var(--radius)', marginBottom: '0.5rem', borderLeft: '3px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginBottom: '0.35rem', fontWeight: 600 }}>{r.name} — {r.role}</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--navy)', margin: 0, lineHeight: 1.6 }}>{r.text}</p>
            </div>
          ))
        )}
      </div>
    )
  }

  const counts = { A: 0, B: 0, C: 0, D: 0 }
  mcAnswers.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
  const chartData = ['A', 'B', 'C', 'D'].map(letter => ({
    name: letter, count: counts[letter],
    pct: n > 0 ? Math.round((counts[letter] / n) * 100) : 0,
  }))
  const div = divergenceScore(counts, n)
  const divPct = Math.round(div * 100)
  const divColor = div > 0.7 ? 'var(--coral)' : div > 0.4 ? '#F59E0B' : 'var(--teal)'

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ flexShrink: 0, background: section.color, color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{question.id}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--navy)', fontWeight: 600, margin: '0 0 0.25rem' }}>{question.question}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{n} response{n !== 1 ? 's' : ''}</span>
            {n > 0 && (<>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: divColor }}>
                {divPct < 25 ? '● Aligned' : divPct < 55 ? '● Mixed' : '● High divergence'}
              </span>
            </>)}
          </div>
        </div>
      </div>
      {n > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={36} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'var(--font-body)', fill: 'var(--slate)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--slate)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, p) => [`${v} (${p.payload.pct}%)`, 'Responses']} contentStyle={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {chartData.map(e => <Cell key={e.name} fill={OPTION_COLORS[e.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '0.5rem' }}>
            {question.options.map(opt => (
              <div key={opt.letter} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                <span style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', background: OPTION_COLORS[opt.letter], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{opt.letter}</span>
                <span style={{ color: 'var(--slate)', lineHeight: 1.45, flex: 1 }}>{opt.text}</span>
                <span style={{ flexShrink: 0, fontWeight: 700, color: counts[opt.letter] > 0 ? 'var(--navy)' : 'var(--border)' }}>{counts[opt.letter]}</span>
              </div>
            ))}
          </div>
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ fontSize: '0.78rem', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>Facilitator interpretation guide</summary>
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--sky)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--steel)', lineHeight: 1.6 }}>
              {question.facilitatorNote}
            </div>
          </details>
        </>
      ) : (
        <p style={{ color: 'var(--slate)', fontSize: '0.85rem', fontStyle: 'italic' }}>Waiting for responses…</p>
      )}
    </div>
  )
}

// ── Report Generator ──────────────────────────────────────────────────────────
function buildPrompt(project, responses, QUESTIONS, SECTIONS) {
  const n = responses.length
  const bookType = project.bookType === 'yellow' ? 'Yellow Book (Design-Build)' : 'Red Book (Design-Bid-Build)'

  // Compute divergence per question
  const divergentItems = QUESTIONS
    .filter(q => q.type === 'multiple-choice')
    .map(q => {
      const answers = responses.map(r => r.answers?.[q.id]).filter(Boolean)
      const counts = { A: 0, B: 0, C: 0, D: 0 }
      answers.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
      const score = divergenceScore(counts, answers.length)
      const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])
      return { q, counts, score, answers, dominant }
    })
    .filter(x => x.answers.length > 0)
    .sort((a, b) => b.score - a.score)

  // Open responses
  const openResponses = QUESTIONS
    .filter(q => q.type === 'open')
    .map(q => ({
      question: q.question,
      responses: responses.map(r => r.answers?.[q.id]).filter(Boolean)
    }))
    .filter(x => x.responses.length > 0)

  // Roles summary
  const roles = responses.map(r => `${r.respondentName} (${r.respondentRole}${r.respondentOrg ? ', ' + r.respondentOrg : ''})`).join('; ')

  let prompt = `You are a senior infrastructure project management specialist at the Millennium Challenge Corporation, experienced in FIDIC contract administration and international project delivery.

You have just administered the ATLAS Technical Alignment Diagnostic to the project team for the following project:

PROJECT: ${project.name}
COUNTRY: ${project.country}
SECTOR: ${project.sector}
CONTRACT TYPE: ${bookType}
TOTAL RESPONDENTS: ${n}
PARTICIPANTS: ${roles}

Below are the diagnostic results. Write a professional Facilitator's Findings Report that will be used to:
1. Brief the project team before or during the alignment workshop
2. Identify priority terms for the Project Technical Lexicon
3. Flag any significant alignment risks the team should address

FORMAT:
- Executive Summary (3-4 sentences)
- Team Composition and Background
- Key Findings by Section (focus on high-divergence questions — explain what the divergence reveals about the team's different professional backgrounds, not just the numbers)
- Priority Terms for the Lexicon Workshop (ranked list of the 5-7 most important terms to define, with a brief explanation of why each matters for this project)
- Open Response Themes (patterns from the qualitative responses)
- Facilitator Recommendations (specific, actionable — what to address first in the workshop)

Write in professional but accessible English. Remember this report will be read by engineers from multiple countries for whom English may be a second language. Avoid idiom and unnecessary jargon.

DIAGNOSTIC RESULTS:

`

  divergentItems.forEach(({ q, counts, score, answers }) => {
    const section = SECTIONS.find(s => s.id === q.section)
    prompt += `[${q.id} — ${section?.title}] Divergence: ${Math.round(score * 100)}% | Responses: ${answers.length}\n`
    prompt += `Question: ${q.question}\n`
    q.options.forEach(opt => {
      prompt += `  ${opt.letter}: ${counts[opt.letter]} responses — "${opt.text}"\n`
    })
    prompt += `Facilitator note: ${q.facilitatorNote}\n\n`
  })

  if (openResponses.length > 0) {
    prompt += `OPEN RESPONSES:\n\n`
    openResponses.forEach(({ question, responses }) => {
      prompt += `Q: ${question}\n`
      responses.forEach((r, i) => { prompt += `  ${i+1}. ${r}\n` })
      prompt += '\n'
    })
  }

  return prompt
}

function ReportPanel({ project, responses, QUESTIONS, SECTIONS }) {
  const [report, setReport]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [generated, setGenerated] = useState(false)
  const textareaRef = useRef(null)

  const generate = async () => {
    if (responses.length < 2) {
      setError('At least 2 responses are needed to generate a meaningful report.')
      return
    }
    setLoading(true)
    setError('')
    setReport('')

    const prompt = buildPrompt(project, responses, QUESTIONS, SECTIONS)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a senior infrastructure project management specialist. Write clear, professional reports for international engineering teams. Be specific and actionable.',
          messages: [{ role: 'user', content: prompt }],
        })
      })

      const data = await res.json()
      const text = data.content?.map(b => b.text || '').join('') || ''

      if (!text) throw new Error('Empty response from API')

      setReport(text)
      setGenerated(true)
    } catch (err) {
      console.error(err)
      setError('Report generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Facilitator's Findings Report</h3>
          <p style={{ fontSize: '0.85rem' }}>
            AI-generated summary of diagnostic results. Edit before using in your workshop.
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={generate}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? 'Generating…' : generated ? '↺ Regenerate report' : '✦ Generate report'}
        </button>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0', color: 'var(--slate)', fontSize: '0.9rem' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
          Analysing {responses.length} responses across {QUESTIONS.filter(q => q.type === 'multiple-choice').length} questions…
        </div>
      )}

      {report && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate)', fontWeight: 600 }}>
              Edit the report below before using in your workshop
            </span>
            <button
              onClick={() => {
                if (textareaRef.current) {
                  navigator.clipboard.writeText(textareaRef.current.value)
                    .catch(() => {})
                }
              }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--slate)', fontFamily: 'var(--font-body)' }}
            >
              Copy to clipboard
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={report}
            onChange={e => setReport(e.target.value)}
            style={{
              width: '100%',
              minHeight: '520px',
              padding: '1rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              lineHeight: 1.75,
              color: 'var(--navy)',
              resize: 'vertical',
            }}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--slate)', marginTop: '0.5rem' }}>
            Changes you make here are not saved automatically — copy the text before navigating away.
          </p>
        </div>
      )}

      {!report && !loading && !error && (
        <div style={{ padding: '1.5rem', background: 'var(--off-white)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>
            Click "Generate report" to produce a written summary of the diagnostic findings for this project.
            {responses.length < 2 && ' At least 2 responses are needed.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [projects, setProjects]   = useState([])
  const [selected, setSelected]   = useState('')
  const [responses, setResponses] = useState([])
  const [activeSection, setActiveSection] = useState('ALL')
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')
  const [newProject, setNewProject] = useState({ name: '', code: '', country: '', sector: 'Roads and Transport', bookType: 'red' })
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!selected) { setResponses([]); return }
    const q = query(collection(db, 'responses'), where('projectId', '==', selected))
    const unsub = onSnapshot(q, snap => {
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [selected])

  const project   = projects.find(p => p.id === selected)
  const isYellow  = project?.bookType === 'yellow'
  const QUESTIONS = isYellow ? YELLOW_QUESTIONS : RED_QUESTIONS
  const SECTIONS  = isYellow ? YELLOW_SECTIONS  : RED_SECTIONS

  const handleCreateProject = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    if (!newProject.name.trim() || !newProject.code.trim() || !newProject.country.trim()) {
      setCreateError('Please fill in all required fields.')
      return
    }
    setCreating(true)
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name:      newProject.name.trim(),
        code:      newProject.code.trim().toUpperCase(),
        country:   newProject.country.trim(),
        sector:    newProject.sector,
        bookType:  newProject.bookType,
        createdAt: serverTimestamp(),
      })
      setNewProject({ name: '', code: '', country: '', sector: 'Roads and Transport', bookType: 'red' })
      setCreating(false)
      setShowCreateProject(false)
      setCreateSuccess(`Project created. Share the code "${newProject.code.trim().toUpperCase()}" with participants.`)
      setSelected(docRef.id)
    } catch (err) {
      console.error(err)
      setCreateError('Failed to create project. Please check your connection and try again.')
      setCreating(false)
    }
  }

  const divergentQuestions = QUESTIONS.filter(q => {
    if (q.type !== 'multiple-choice') return false
    const answers = responses.map(r => r.answers?.[q.id]).filter(Boolean)
    if (answers.length < 2) return false
    const counts = { A: 0, B: 0, C: 0, D: 0 }
    answers.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
    return divergenceScore(counts, answers.length) > 0.55
  })

  const filteredQuestions = activeSection === 'ALL' ? QUESTIONS : QUESTIONS.filter(q => q.section === activeSection)

  return (
    <div className="page">
      <div className="container--wide">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Facilitator Dashboard</h1>
            <p style={{ fontSize: '0.9rem' }}>Real-time diagnostic results by project.</p>
          </div>
          <button className="btn btn--coral" onClick={() => { setShowCreateProject(!showCreateProject); setCreateError(''); setCreateSuccess('') }}>
            {showCreateProject ? 'Cancel' : '+ New project'}
          </button>
        </div>

        {createSuccess && (
          <div className="alert alert--success" style={{ marginBottom: '1.5rem' }}>✓ {createSuccess}</div>
        )}

        {showCreateProject && (
          <div className="card" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--coral)' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Create new project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="grid-2">
                <div className="field">
                  <label className="label">Project name *</label>
                  <input className="input" placeholder="e.g. Nepal Transport" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Project code * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(share with participants)</span></label>
                  <input className="input" placeholder="e.g. NPL-001" value={newProject.code} onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))} style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }} />
                </div>
                <div className="field">
                  <label className="label">Country *</label>
                  <input className="input" placeholder="e.g. Nepal" value={newProject.country} onChange={e => setNewProject(p => ({ ...p, country: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Sector</label>
                  <select className="select" value={newProject.sector} onChange={e => setNewProject(p => ({ ...p, sector: e.target.value }))}>
                    <option>Roads and Transport</option>
                    <option>Water Supply and Sanitation</option>
                    <option>Power and Energy</option>
                    <option>Buildings</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Contract type</label>
                  <select className="select" value={newProject.bookType} onChange={e => setNewProject(p => ({ ...p, bookType: e.target.value }))}>
                    <option value="red">Red Book (Design-Bid-Build)</option>
                    <option value="yellow">Yellow Book (Design-Build)</option>
                  </select>
                </div>
              </div>
              {createError && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{createError}</div>}
              <button type="submit" className="btn btn--primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create project'}
              </button>
            </form>
          </div>
        )}

        <div className="field" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
          <label className="label">Select project</label>
          <select className="select" value={selected} onChange={e => { setSelected(e.target.value); setActiveSection('ALL') }}>
            <option value="">Choose a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name} ({p.country})</option>
            ))}
          </select>
        </div>

        {!selected && (
          <div className="alert alert--info">Select a project above to view its diagnostic results.</div>
        )}

        {selected && project && (
          <>
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-card__value">{responses.length}</div>
                <div className="stat-card__label">Responses received</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__value" style={{ color: 'var(--coral)', fontSize: '1.75rem' }}>{divergentQuestions.length}</div>
                <div className="stat-card__label">High-divergence questions</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__value" style={{ color: 'var(--teal)', fontSize: '1.25rem' }}>{project.sector}</div>
                <div className="stat-card__label">{project.country} · {project.bookType === 'yellow' ? 'Yellow Book' : 'Red Book'}</div>
              </div>
            </div>

            <div className="alert alert--info" style={{ marginBottom: '2rem' }}>
              Share project code <strong>{project.code}</strong> with participants — they enter it at the home page to begin the diagnostic.
            </div>

            {/* ── Report Generator ── */}
            <ReportPanel
              project={project}
              responses={responses}
              QUESTIONS={QUESTIONS}
              SECTIONS={SECTIONS}
            />

            {divergentQuestions.length > 0 && (
              <div className="card" style={{ marginBottom: '2rem', borderLeft: '3px solid var(--coral)' }}>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--coral)' }}>⚠ Priority terms for your lexicon workshop</h3>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>These questions show high divergence. Address them first in the lexicon workshop.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {divergentQuestions.map(q => (
                    <span key={q.id} className="tag tag--red">{q.id}: {q.question.substring(0, 50)}…</span>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Participants ({responses.length})</h3>
              {responses.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  No responses yet. Share the project code <strong>{project.code}</strong> with participants.
                </p>
              ) : (
                <table className="table">
                  <thead><tr><th>Name</th><th>Role</th><th>Organization</th><th>Answered</th></tr></thead>
                  <tbody>
                    {responses.map(r => (
                      <tr key={r.id}>
                        <td>{r.respondentName}</td>
                        <td>{r.respondentRole}</td>
                        <td style={{ color: 'var(--slate)' }}>{r.respondentOrg || '—'}</td>
                        <td>{Object.keys(r.answers || {}).length} / {QUESTIONS.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <button className={`btn ${activeSection === 'ALL' ? 'btn--primary' : 'btn--secondary'}`} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }} onClick={() => setActiveSection('ALL')}>All sections</button>
              {SECTIONS.map(s => (
                <button key={s.id} className={`btn ${activeSection === s.id ? 'btn--primary' : 'btn--secondary'}`} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }} onClick={() => setActiveSection(s.id)}>
                  {s.id}: {s.title.split(' ').slice(0, 2).join(' ')}…
                </button>
              ))}
            </div>

            {filteredQuestions.map(q => (
              <QuestionResult key={q.id} question={q} responses={responses} sections={SECTIONS} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
