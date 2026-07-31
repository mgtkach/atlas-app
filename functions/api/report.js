diff --git a/functions/api/report.js b/functions/api/report.js
new file mode 100644
index 0000000..1a6882e
--- /dev/null
+++ b/functions/api/report.js
@@ -0,0 +1,56 @@
+// Cloudflare Pages Function — proxies report generation to the Anthropic API
+// server-side so the API key never reaches the browser.
+//
+// Requires an ANTHROPIC_API_KEY environment variable/secret set on the
+// Cloudflare Pages project (Settings → Environment variables).
+
+export async function onRequestPost(context) {
+  const { request, env } = context
+
+  if (!env.ANTHROPIC_API_KEY) {
+    return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500)
+  }
+
+  let body
+  try {
+    body = await request.json()
+  } catch {
+    return json({ error: 'Invalid request body.' }, 400)
+  }
+
+  const { prompt, system } = body
+  if (!prompt) {
+    return json({ error: 'Missing prompt.' }, 400)
+  }
+
+  const res = await fetch('https://api.anthropic.com/v1/messages', {
+    method: 'POST',
+    headers: {
+      'Content-Type': 'application/json',
+      'x-api-key': env.ANTHROPIC_API_KEY,
+      'anthropic-version': '2023-06-01',
+    },
+    body: JSON.stringify({
+      model: 'claude-sonnet-5',
+      max_tokens: 1500,
+      system: system || 'You are a senior infrastructure project management specialist. Write clear, professional reports for international engineering teams. Be specific and actionable.',
+      messages: [{ role: 'user', content: prompt }],
+    }),
+  })
+
+  const data = await res.json()
+
+  if (!res.ok) {
+    return json({ error: data.error?.message || 'Anthropic API error.' }, res.status)
+  }
+
+  const text = data.content?.map(b => b.text || '').join('') || ''
+  return json({ text })
+}
+
+function json(obj, status = 200) {
+  return new Response(JSON.stringify(obj), {
+    status,
+    headers: { 'Content-Type': 'application/json' },
+  })
+}
diff --git a/src/pages/Dashboard.jsx b/src/pages/Dashboard.jsx
index ee40770..3562cb0 100644
--- a/src/pages/Dashboard.jsx
+++ b/src/pages/Dashboard.jsx
@@ -207,23 +207,18 @@ function ReportPanel({ project, responses, QUESTIONS, SECTIONS }) {
     const prompt = buildPrompt(project, responses, QUESTIONS, SECTIONS)
 
     try {
-      const res = await fetch('https://api.anthropic.com/v1/messages', {
+      const res = await fetch('/api/report', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
-        body: JSON.stringify({
-          model: 'claude-sonnet-4-20250514',
-          max_tokens: 1000,
-          system: 'You are a senior infrastructure project management specialist. Write clear, professional reports for international engineering teams. Be specific and actionable.',
-          messages: [{ role: 'user', content: prompt }],
-        })
+        body: JSON.stringify({ prompt })
       })
 
       const data = await res.json()
-      const text = data.content?.map(b => b.text || '').join('') || ''
 
-      if (!text) throw new Error('Empty response from API')
+      if (!res.ok) throw new Error(data.error || 'Report generation failed')
+      if (!data.text) throw new Error('Empty response from API')
 
-      setReport(text)
+      setReport(data.text)
       setGenerated(true)
     } catch (err) {
       console.error(err)
