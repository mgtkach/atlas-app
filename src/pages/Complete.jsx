import { Link } from 'react-router-dom'

export default function Complete() {
  return (
    <div className="page center" style={{ flexDirection: 'column', padding: '3rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--teal)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: 'white' }}>✓</div>
        <h1 style={{ marginBottom: '0.75rem' }}>Responses submitted</h1>
        <p style={{ fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Thank you. Your responses have been recorded and will inform the group discussion. Please wait for your facilitator to open the workshop session.
        </p>
        <div className="alert alert--info" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <strong>What happens next:</strong> The facilitator will display the team's combined responses on screen. There are no right or wrong answers — the goal is to surface where the team has shared understanding and where further alignment is needed.
        </div>
        <Link to="/" className="btn btn--secondary">← Return to start</Link>
      </div>
    </div>
  )
}
