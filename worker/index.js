// Worker entry point for atlas-app.
// Serves the built React app from ./dist (via the ASSETS binding) and
// handles POST /api/report by proxying to the Anthropic API server-side,
// so the API key never reaches the browser.

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/report' && request.method === 'POST') {
      return handleReport(request, env)
    }

    return env.ASSETS.fetch(request)
  }
}

async function handleReport(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const { prompt, system } = body
  if (!prompt) {
    return json({ error: 'Missing prompt.' }, 400)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: system || 'You are a senior infrastructure project management specialist. Write clear, professional reports for international engineering teams. Be specific and actionable.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return json({ error: data.error?.message || 'Anthropic API error.' }, res.status)
  }

  const text = data.content?.map(b => b.text || '').join('') || ''
  return json({ text })
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
