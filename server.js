// Tiny dependency-free server: serves the static files and proxies AI calls to the Claude API,
// so the API key stays on the server. Run: ANTHROPIC_API_KEY=... node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal .env loader (no packages)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* no .env, fine */ }

const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const BASE = `You assist a human care navigator in a fictional prototype. Use only the supplied participant records and service directory. Distinguish recorded facts, suggestions and unknown information. Reference source notes or service IDs. Do not invent deadlines, eligibility, service availability, diagnoses or personal history. Ask for clarification when needed. All plans and recommendations are drafts requiring human review.
Never turn feelings (e.g. "nervous") into a diagnosis, and never assume counselling is wanted unless the young person said so.
Reply with ONE valid JSON object only: no markdown fences, no commentary.`;

const TASKS = {
  plan: p => `Task: turn the participant-approved conversation notes into a draft plan.
Notes language: ${p.language}. Notes:
"""${p.notes}"""

Return JSON: {"goals":[{"text":"","quote":""}],"concerns":[{"text":"","quote":""}],"clarify":[{"text":"","quote":""}],"actions":[{"text":"","quote":""}]}
- goals = what the young person wants. concerns = worries they expressed, restated without diagnosis. clarify = information that is missing and must be asked. actions = suggested next steps for the navigator.
- "quote" MUST be copied exactly (original language, character for character) from the notes and support the item.
- Write "text" in English. At most 4 items per list. Do not add items the notes do not support.`,

  services: p => `Task: match the young person's agreed needs to services from the supplied directory ONLY.
Participant: ${JSON.stringify(p.participant)}
Agreed needs: ${JSON.stringify(p.needs)}
Directory: ${JSON.stringify(p.directory)}

Return JSON: {"matches":[{"serviceId":"","need":"","why":"","eligibilityMatched":[""],"toCheck":[""]}]}
- serviceId must be an ID from the directory. If nothing suits, return {"matches":[]}.
- eligibilityMatched: only conditions that are clearly satisfied by the participant record. toCheck: anything unknown (location, cost, availability, other conditions).`,

  briefing: p => `Task: prepare a short meeting briefing for the navigator from the records below.
Records: ${JSON.stringify(p.record)}

Return JSON: {"points":[{"section":"achieve|changed|unresolved|ask","text":"","sources":[""]}]}
- Sections: achieve = what they want to achieve; changed = what changed since last contact; unresolved = what remains unresolved; ask = questions the navigator should ask next.
- Every factual point needs "sources": IDs taken from the records (note ids like N1, action ids like A1, "PROFILE", "PLAN"). If information is missing, say it is missing (sources may then be []).`,

  handover: p => `Task: draft a handover summary for an incoming navigator using only the records below.
Records: ${JSON.stringify(p.record)}

Return JSON: {"sections":[{"key":"goals|communication|completed|outstanding|unresolved|confirm","items":[{"text":"","sources":[""]}]}]}
- goals = agreed goals; communication = communication preferences; completed = completed actions; outstanding = outstanding commitments with dates; unresolved = unresolved questions; confirm = information that needs confirmation.
- Use only recorded information. Cite source IDs from the records. State clearly when a section has nothing recorded.`,

  translate: p => `Task: translate the text into plain, simple ${p.target}. Keep the meaning exactly; add nothing.
Text: """${p.text}"""
Return JSON: {"text":""}`
};

function extractJSON(s) {
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Model reply did not contain JSON');
  return JSON.parse(s.slice(a, b + 1));
}

async function runAI(task, payload) {
  if (!KEY) throw new Error('Live AI is not configured on the server (no ANTHROPIC_API_KEY).');
  if (!TASKS[task]) throw new Error('Unknown AI task: ' + task);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: BASE,
      messages: [{ role: 'user', content: TASKS[task](payload) }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Claude API error ' + r.status);
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  return extractJSON(text);
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

http.createServer((req, res) => {
  const send = (code, body, type) => { res.writeHead(code, { 'content-type': type || 'application/json' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

  if (req.url === '/api/status') return send(200, { live: !!KEY, model: KEY ? MODEL : null });

  if (req.url === '/api/ai' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { task, payload } = JSON.parse(raw);
        send(200, { ok: true, data: await runAI(task, payload) });
      } catch (e) {
        send(200, { ok: false, error: e.message });
      }
    });
    return;
  }

  const file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const full = path.join(__dirname, path.normalize(file));
  const allowed = ['index.html', 'style.css', 'app.js'];
  if (!allowed.includes(path.basename(full)) || path.dirname(full) !== __dirname) return send(404, 'Not found', 'text/plain');
  fs.readFile(full, (err, data) => err ? send(404, 'Not found', 'text/plain') : send(200, data, TYPES[path.extname(full)] || 'text/plain'));
}).listen(PORT, () => console.log(`Someone Stays prototype on http://localhost:${PORT}  (live AI: ${KEY ? 'ON, model ' + MODEL : 'OFF - sample mode'})`));
