// Worker entry point for atlas-app.
// Serves the built React app from ./dist via the ASSETS binding.
//
// The facilitator report is no longer generated server-side. The dashboard now
// builds a self-contained prompt from the project's diagnostic data, which the
// facilitator copies and pastes into Claude to produce the report. As a result,
// this worker no longer calls the Anthropic API and needs no ANTHROPIC_API_KEY.

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  }
}
