import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import RED_QUESTIONS, { SECTIONS as RED_SECTIONS } from '../data/redbook-questions'
import YELLOW_QUESTIONS, { SECTIONS as YELLOW_SECTIONS } from '../data/yellowbook-questions'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

function divergenceScore(answers) {
  const n = answers.length
  if (n === 0) return 0
  const counts = { A: 0, B: 0, C: 0, D: 0 }
  answers.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
  const probs = Object.values(counts).map(c => c / n)
  const entropy = -probs.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0)
  return entropy / Math.log2(4)
}

function sectionDivergence(responses, sectionId, QUESTIONS) {
  const qs = QUESTIONS.filter(q => q.section === sectionId && q.type === 'multiple-choice')
  if (qs.length === 0) return 0
  const scores = qs.map(q => divergenceScore(responses.map(r => r.answers?.[q.id]).filter(Boolean)))
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export default function Admin() {
  const [projects, setProjects]         = useState([])
  const [allResponses, setAllResponses] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'projects'),  snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(collection(db, 'responses'), snap => setAllResponses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [])

  const toggleProject = (id) => setSelectedProjects(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const SECTIONS = RED_SECTIONS
  const comparisonData = SECTIONS.filter(s => s.id !== 'G').map(section => {
    const entry = { section: `Sec ${section.id}`, fullTitle: section.title }
    selectedProjects.forEach(pid => {
      const project   = projects.find(p => p.id === pid)
      const responses = allResponses.filter(r => r.projectId === pid)
      const QUESTIONS = project?.bookType === 'yellow' ? YELLOW_QUESTIONS : RED_QUESTIONS
      entry[project?.code || pid] = Math.round(sectionDivergence(responses, section.id, QUESTIONS) * 100)
    })
    return entry
  })

  const globalDivergence = RED_QUESTIONS
    .filter(q => q.type === 'multiple-choice')
    .map(q => ({
      q,
      score: divergenceScore(allResponses.map(r => r.answers?.[q.id]).filter(Boolean)),
      n: allResponses.map(r => r.answers?.[q.id]).filter(Boolean).length,
    }))
    .filter(x => x.n >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const colors = ['#3B82B6', '#1D9E75', '#E05A47', '#6B7B8D', '#34608A', '#1A2744']

  return (
    <div className="page">
      <div className="container--wide">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>Cross-Project Analysis</h1>
          <p>Identify patterns across all ATLAS projects. Requires at least 5 responses per question for reliable divergence scores.</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card"><div className="stat-card__value">{projects.length}</div><div className="stat-card__label">Total projects</div></div>
          <div className="stat-card"><div className="stat-card__value">{allResponses.length}</div><div className="stat-card__label">Total responses</div></div>
          <div className="stat-card"><div className="stat-card__value" style={{ fontSize: '1.5rem', color: 'var(--coral)' }}>{globalDivergence[0]?.q.id || '—'}</div><div className="stat-card__label">Most divergent question</div></div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>All projects</h3>
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Country</th><th>Sector</th><th>Type</th><th>Responses</th><th>Compare</th></tr></thead>
            <tbody>
              {projects.map(p => {
                const count = allResponses.filter(r => r.projectId === p.id).length
                return (
                  <tr key={p.id}>
                    <td><span className="tag tag--navy">{p.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.country}</td>
                    <td style={{ color: 'var(--slate)' }}>{p.sector}</td>
                    <td><span className={`tag ${p.bookType === 'red' ? 'tag--red' : 'tag--blue'}`}>{p.bookType === 'red' ? 'Red' : 'Yellow'}</span></td>
                    <td style={{ fontWeight: 600 }}>{count}</td>
                    <td><input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} disabled={count < 2} style={{ cursor: count < 2 ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {selectedProjects.length >= 2 && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Divergence by section — comparison</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Higher scores indicate more divergence. Sections above 60 are highest priority for ATLAS lexicon work.</p>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={comparisonData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="section" tick={{ fontSize: 12, fill: 'var(--slate)', fontFamily: 'var(--font-body)' }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }} formatter={v => [`${v}%`, 'Divergence']} />
                {selectedProjects.map((pid, i) => {
                  const p = projects.find(pr => pr.id === pid)
                  return <Radar key={pid} name={p?.code || pid} dataKey={p?.code || pid} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.15} strokeWidth={2} />
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {globalDivergence.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Most divergent questions across all projects</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Questions with consistent divergence across projects are candidates for the ATLAS default lexicon.</p>
            <table className="table">
              <thead><tr><th>Q</th><th>Question</th><th>Responses</th><th>Divergence</th></tr></thead>
              <tbody>
                {globalDivergence.map(({ q, score, n }) => (
                  <tr key={q.id}>
                    <td><span className="tag tag--navy">{q.id}</span></td>
                    <td style={{ maxWidth: '400px' }}>{q.question}</td>
                    <td>{n}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="divergence-bar" style={{ width: '80px' }}>
                          <div className="divergence-bar__fill" style={{ width: `${Math.round(score * 100)}%`, background: score > 0.7 ? 'var(--coral)' : score > 0.4 ? '#F59E0B' : 'var(--teal)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: score > 0.7 ? 'var(--coral)' : score > 0.4 ? '#B45309' : 'var(--teal)' }}>{Math.round(score * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
