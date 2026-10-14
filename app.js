(function () {
'use strict';

/* ---------- constants & fictional data ---------- */
const KEY = 'someoneStays.v1';
const NAVIGATORS = ['Ananya', 'Ravi', 'Dev', 'Isha'];
const ST_DRAFT = 'Draft', ST_AWAIT = "Awaiting young person's review", ST_AGREED = 'Agreed', ST_CHANGES = 'Changes requested';
const ACT_STATUS = ['Planned', 'In progress', 'Awaiting response', 'Done'];
const REF_FLOW = ['Planned', 'Referral recorded', 'Appointment arranged', 'Awaiting participant confirmation', 'Support received'];
const DEMO_LABEL = 'Fictional demo service—not available for real referrals';

const ASHA_NOTES = 'I want to continue college, but I don’t know where I’ll stay. I’m nervous about leaving. I’d prefer to talk in Hindi. I haven’t checked the admission deadline yet.';
const ASHA_NOTES_HI = 'मैं कॉलेज जारी रखना चाहती हूँ, लेकिन मुझे नहीं पता कि मैं कहाँ रहूँगी। मुझे जाने को लेकर घबराहट है। मैं हिंदी में बात करना पसंद करूँगी। मैंने अभी तक एडमिशन की आख़िरी तारीख़ नहीं देखी है।';

const SERVICES = [
  { id: 'S01', name: 'Campus Steps', purpose: 'College application guidance', desc: 'Helps young people understand college options, applications and deadlines.', minAge: 17, maxAge: 24, other: 'Applying to, or enrolled in, a college', area: 'Riverton (fictional) citywide', cost: 'Free (demo)', review: '2026-12-01', avail: 'Open' },
  { id: 'S02', name: 'Bridge Housing', purpose: 'Transitional housing enquiry', desc: 'Short-term transitional housing for young people moving on from care.', minAge: 18, maxAge: 23, other: 'Left, or leaving, care within the last 12 months', area: 'Riverton North and Central only', cost: null, review: '2026-11-15', avail: 'Waitlist—limited places' },
  { id: 'S03', name: 'Document Desk', purpose: 'Help understanding documentation requirements', desc: 'Explains which identity and education documents are needed and how to request them.', minAge: 16, maxAge: 25, other: 'None', area: 'Riverton (fictional) citywide', cost: 'Free (demo)', review: '2026-12-10', avail: 'Open' },
  { id: 'S04', name: 'Skills Start', purpose: 'Vocational training guidance', desc: 'Guidance on short vocational courses and how to enrol.', minAge: 18, maxAge: 25, other: 'Has left care or is within 6 months of leaving', area: 'Riverton East and Central', cost: null, review: '2026-11-30', avail: 'Open' },
  { id: 'S05', name: 'Career Steps', purpose: 'Employment preparation', desc: 'CV help, interview practice and introductions to employers.', minAge: 18, maxAge: 25, other: 'None', area: 'Riverton (fictional) citywide', cost: 'Free (demo)', review: '2026-12-05', avail: 'Open' },
  { id: 'S06', name: 'Listening Space', purpose: 'Access to a qualified counselling professional', desc: 'Connects a young person with a qualified counselling professional, on request.', minAge: 16, maxAge: 25, other: 'Only with the young person’s own request and consent', area: 'Riverton (fictional) citywide', cost: null, review: '2026-12-15', avail: 'Open' }
];

const SAMPLE_PLAN = {
  goals: [
    { text: 'Continue college', quote: 'I want to continue college' },
    { text: 'Explore housing options', quote: 'I don’t know where I’ll stay' }
  ],
  concerns: [
    { text: 'Feels nervous about leaving', quote: 'I’m nervous about leaving' },
    { text: 'Uncertain about where she will stay', quote: 'I don’t know where I’ll stay' }
  ],
  clarify: [
    { text: 'Admission deadline', quote: 'I haven’t checked the admission deadline yet' },
    { text: 'Housing budget and location preferences', quote: 'I don’t know where I’ll stay' }
  ],
  actions: [
    { text: 'Check admission requirements and deadline', quote: 'I haven’t checked the admission deadline yet' },
    { text: 'Discuss suitable housing options', quote: 'I don’t know where I’ll stay' },
    { text: 'Arrange a follow-up conversation about leaving', quote: 'I’m nervous about leaving' }
  ]
};
const SAMPLE_GOALS_KEY = SAMPLE_PLAN.goals.map(g => g.text).join('|');
const SAMPLE_MATCHES = [
  { serviceId: 'S01', need: 'Continue college', why: 'Asha wants to continue college and Campus Steps offers college application guidance.', eligibilityMatched: ['Age range 17–24 includes Asha (18)'], toCheck: ['Confirm she is applying to, or enrolled in, a college', 'Confirm the admission deadline', 'Confirm availability'] },
  { serviceId: 'S02', need: 'Explore housing options', why: 'Asha needs accommodation during her transition and Bridge Housing handles transitional housing enquiries.', eligibilityMatched: ['Age range 18–23 includes Asha (18)'], toCheck: ['Confirm location preferences (service covers Riverton North and Central only)', 'Cost is unknown—confirm with provider', 'Availability is waitlist only—confirm', 'Confirm she left or is leaving care within 12 months'] }
];

/* ---------- state ---------- */
const V = { live: false, model: null, busy: null, err: {}, flash: null, showChange: false, showNav: false, pTrans: null };
let state;

function seq(k) { state.seq[k] += 1; return k + state.seq[k]; }
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (n, b) => { const d = b ? new Date(b + 'T00:00:00') : new Date(); d.setDate(d.getDate() + n); return iso(d); };
const fmt = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To be agreed';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

function seed() {
  const t = today();
  return {
    seq: { N: 5, A: 4, P: 1, T: 0 },
    participants: [
      { id: 'asha', name: 'Asha', age: 18, language: 'Hindi', navigator: 'Ananya', backup: 'Ravi', nextMeeting: addDays(3), goals: ['Continue college', 'Find housing'], facts: [{ k: 'Admission deadline', v: null }, { k: 'Housing', v: 'Not yet confirmed', open: true }] },
      { id: 'kabir', name: 'Kabir', age: 19, language: 'English', navigator: 'Ravi', backup: 'Ananya', nextMeeting: addDays(6), goals: ['Complete documentation', 'Find an appropriate training course'], facts: [{ k: 'Documentation status', v: null }, { k: 'Training course', v: null }] },
      { id: 'meera', name: 'Meera', age: 17, language: 'English', navigator: 'Isha', backup: 'Dev', nextMeeting: addDays(9), goals: ['Understand available options', 'Take part in planning', 'Discuss concerns with her navigator'], facts: [{ k: 'Leaving date', v: null }] }
    ],
    notes: [
      { id: 'N1', pid: 'asha', date: addDays(-7), text: 'Asha said she wants to continue to college and is more comfortable speaking in Hindi.', consent: true },
      { id: 'N2', pid: 'asha', date: addDays(-2), text: 'Housing after she leaves the institution has not been confirmed. Her admission deadline has not been recorded.', consent: true },
      { id: 'N3', pid: 'kabir', date: addDays(-5), text: 'Kabir has recently left care and wants to explore vocational training.', consent: true },
      { id: 'N4', pid: 'kabir', date: addDays(-1), text: 'Some documentation is still to be completed. A training course has not been chosen yet.', consent: true },
      { id: 'N5', pid: 'meera', date: addDays(-3), text: 'Meera is preparing for the transition. Her leaving date has not been confirmed. She would like to understand her options and take part in planning.', consent: true }
    ],
    plans: [
      { id: 'P1', pid: 'kabir', version: 1, status: ST_AGREED, mode: 'seed', agreedAt: addDays(-1), requested: '',
        goals: [{ text: 'Complete documentation', quote: '', src: 'N3' }, { text: 'Find a suitable training course', quote: '', src: 'N3' }],
        concerns: [], clarify: [{ text: 'Which documents are still missing', quote: '', src: 'N4' }], actions: [] }
    ],
    actions: [
      { id: 'A1', pid: 'kabir', type: 'action', text: 'Confirm which documents are still needed', owner: 'Ravi', review: addDays(-2), status: 'In progress', source: 'P1' },
      { id: 'A2', pid: 'kabir', type: 'action', text: 'Share a list of training options', owner: 'Ravi', review: addDays(5), status: 'Planned', source: 'P1' },
      { id: 'A3', pid: 'kabir', type: 'referral', serviceId: 'S03', text: 'Enquire about documentation help', owner: 'Ravi', review: addDays(1), status: 'Awaiting participant confirmation', confirm: '' },
      { id: 'A4', pid: 'meera', type: 'action', text: 'Explain available options to Meera', owner: 'Isha', review: addDays(4), status: 'Planned' }
    ],
    tasks: [],
    handovers: {},
    ui: {},
    activity: [{ ts: new Date().toISOString(), actor: 'System', text: 'Demo started with fictional data' }],
    role: 'navigator', tab: 'dash', pid: 'asha', detail: null
  };
}

state = load() || seed();

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
function log(actor, text) { state.activity.unshift({ ts: new Date().toISOString(), actor, text }); state.activity = state.activity.slice(0, 40); }

/* ---------- selectors ---------- */
const P = id => state.participants.find(p => p.id === id);
const notesOf = pid => state.notes.filter(n => n.pid === pid);
const actsOf = pid => state.actions.filter(a => a.pid === pid);
const plansOf = pid => state.plans.filter(p => p.pid === pid);
const curPlan = pid => plansOf(pid).sort((a, b) => a.version - b.version).slice(-1)[0] || null;
const U = pid => (state.ui[pid] = state.ui[pid] || { notes: '', lang: 'English', consent: false, briefing: null, suggest: null, incoming: '' });
const isOpen = a => !['Done', 'Support received'].includes(a.status);
const isOverdue = a => !!a.review && a.review < today() && isOpen(a);
function stats(pid) {
  const acts = actsOf(pid), pl = curPlan(pid);
  return {
    pending: acts.filter(isOpen).length,
    overdue: acts.filter(isOverdue).length,
    awaiting: acts.filter(a => a.type === 'referral' && a.status === 'Awaiting participant confirmation').length + (pl && pl.status === ST_AWAIT ? 1 : 0),
    requests: state.tasks.filter(t => t.pid === pid && !t.done).length
  };
}
const ownerOptions = pid => { const p = P(pid); return [p.navigator, p.backup, `${p.name} and ${p.navigator}`, p.name]; };

function srcLabel(id) {
  if (id === 'PROFILE') return 'Profile';
  if (id === 'PLAN') return 'Current plan';
  const n = state.notes.find(x => x.id === id);
  if (n) return `${id}: “${n.text.length > 70 ? n.text.slice(0, 70) + '…' : n.text}”`;
  const a = state.actions.find(x => x.id === id);
  if (a) return `${id}: ${a.text}`;
  return id;
}
const sources = ids => ids && ids.length ? `<span class="src">Source — ${ids.map(i => esc(srcLabel(i))).join(' · ')}</span>` : '<span class="src">No source recorded (information is missing or unverified)</span>';

/* ---------- AI plumbing ---------- */
async function callAI(task, payload) {
  let r;
  try {
    r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, payload }) });
  } catch (e) { throw new Error('Could not reach the server. Start it with: node server.js'); }
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'AI request failed');
  return j.data;
}
async function run(key, fn) {
  V.busy = key; V.err[key] = null; V.flash = null; render();
  try { await fn(); } catch (e) { V.err[key] = e.message || String(e); }
  V.busy = null; save(); render();
}
const arr = x => Array.isArray(x) ? x : [];
const str = x => typeof x === 'string' ? x.trim() : '';
const aiLabel = (mode, extra) => mode === 'live' ? `<span class="ai-label">AI draft (live${extra ? ', ' + esc(extra) : ''}) — review before use</span>`
  : mode === 'sample' ? '<span class="ai-label sample">Sample output—illustrative, not generated live</span>'
  : mode === 'template' ? '<span class="ai-label sample">Template summary built from recorded data by simple rules (not AI) — live AI is not connected</span>' : '';

/* ---------- actions ---------- */
const H = {};

H.role = d => { state.role = d.v; V.flash = null; V.showChange = false; V.showNav = false; if (d.v === 'navigator' && state.tab === 'young') state.tab = 'dash'; };
H.tab = d => { state.tab = d.v; V.flash = null; };
H.open = d => { state.pid = d.id; state.detail = d.id; };
H.reset = () => {
  if (!confirm('Reset the demo to its fictional starting data? All changes will be lost.')) return;
  localStorage.removeItem(KEY); state = seed(); V.err = {}; V.flash = { ok: true, text: 'Demo reset to starting data.' }; V.pTrans = null;
};
H.taskSeen = d => { const t = state.tasks.find(x => x.id === d.id); if (t) { t.done = true; log('Navigator', `Marked seen: ${t.label} (${P(t.pid).name})`); } };

/* briefing */
H.briefing = () => run('briefing:' + state.pid, async () => {
  const pid = state.pid, p = P(pid), record = briefingRecord(pid);
  if (V.live) {
    const out = await callAI('briefing', { record });
    const allowed = new Set([...record.notes.map(n => n.id), ...record.actions.map(a => a.id), 'PROFILE', 'PLAN']);
    const pts = arr(out.points).map(x => ({ section: str(x.section), text: str(x.text), sources: arr(x.sources).filter(s => allowed.has(s)) }))
      .filter(x => x.text && ['achieve', 'changed', 'unresolved', 'ask'].includes(x.section));
    if (!pts.length) throw new Error('The AI reply could not be used (no valid points). Please retry.');
    U(pid).briefing = { mode: 'live', model: V.model, points: pts, at: new Date().toISOString() };
  } else {
    U(pid).briefing = { mode: 'template', points: templateBriefing(pid), at: new Date().toISOString() };
  }
  log('Navigator', `Prepared briefing for ${p.name}`);
});

/* conversation to plan */
H.loadExample = () => { if (state.pid !== 'asha') return; const u = U('asha'); u.notes = ASHA_NOTES; u.lang = 'English'; };
H.translateNotes = () => run('translate', async () => {
  const u = U(state.pid); const text = u.notes.trim();
  if (!text) throw new Error('Add some notes first.');
  const target = u.lang === 'Hindi' ? 'English' : 'Hindi';
  let out, mode = 'live';
  if (V.live) out = str((await callAI('translate', { text, target })).text);
  else if (norm(text) === norm(ASHA_NOTES) && target === 'Hindi') { out = ASHA_NOTES_HI; mode = 'sample'; }
  else if (norm(text) === norm(ASHA_NOTES_HI) && target === 'English') { out = ASHA_NOTES; mode = 'sample'; }
  else throw new Error('Live AI is not connected. A sample translation exists only for Asha’s example notes.');
  if (!out) throw new Error('The translation came back empty. Please retry.');
  u.translation = { mode, target, text: out };
});
H.generatePlan = () => {
  const pid = state.pid, u = U(pid), text = u.notes.trim();
  if (!u.consent) { V.err.plan = 'Please confirm that the young person has agreed to processing of these notes.'; return; }
  if (!text) { V.err.plan = 'Add conversation notes first.'; return; }
  return run('plan', async () => {
    let out, mode = 'live';
    if (V.live) out = await callAI('plan', { notes: text, language: u.lang });
    else if (pid === 'asha' && norm(text) === norm(ASHA_NOTES)) { out = SAMPLE_PLAN; mode = 'sample'; }
    else throw new Error('Live AI is not connected, and there is no prepared sample for these notes. Use “Load Asha’s example” to see the sample output.');
    const noteId = seq('N');
    const clean = (list, withOwner) => arr(list).map(x => {
      const it = { text: str(x.text), quote: str(x.quote), src: noteId };
      if (it.quote && !norm(text).includes(norm(it.quote).replace(/[.。]+$/, ''))) { it.warn = 'Supporting phrase could not be matched to the notes'; it.quote = ''; }
      if (withOwner) { it.owner = P(pid).navigator; it.review = ''; }
      return it;
    }).filter(x => x.text);
    const plan = { id: seq('P'), pid, version: plansOf(pid).length + 1, status: ST_DRAFT, mode, model: V.model, requested: '',
      goals: clean(out.goals), concerns: clean(out.concerns), clarify: clean(out.clarify), actions: clean(out.actions, true) };
    if (!plan.goals.length && !plan.actions.length) throw new Error('The AI reply had no usable goals or actions. Please retry.');
    state.notes.push({ id: noteId, pid, date: today(), text, consent: true, lang: u.lang });
    state.plans.push(plan);
    log(mode === 'live' ? 'AI (live)' : 'AI (sample)', `Drafted plan v${plan.version} for ${P(pid).name} from note ${noteId}`);
  });
};
H.planAdd = d => { const pl = curPlan(state.pid); const it = { text: '', quote: '', src: '' }; if (d.sec === 'actions') { it.owner = P(state.pid).navigator; it.review = ''; } pl[d.sec].push(it); };
H.planRemove = d => { curPlan(state.pid)[d.sec].splice(+d.i, 1); };
H.approvePlan = () => {
  const pl = curPlan(state.pid);
  ['goals', 'concerns', 'clarify', 'actions'].forEach(k => { pl[k] = pl[k].filter(x => x.text.trim()); });
  pl.status = ST_AWAIT; pl.requested = '';
  log('Navigator', `Approved plan v${pl.version} for ${P(pl.pid).name}'s review`);
  V.flash = { ok: true, text: `Plan sent for ${P(pl.pid).name}'s review. It is not agreed until ${P(pl.pid).name} agrees. Switch to the Young person's view to continue.` };
};
H.withdrawPlan = () => { const pl = curPlan(state.pid); pl.status = ST_DRAFT; log('Navigator', 'Withdrew plan back to draft'); };

/* service suggestions */
H.suggest = () => run('suggest:' + state.pid, async () => {
  const pid = state.pid, p = P(pid), pl = curPlan(pid);
  if (!pl || pl.status !== ST_AGREED) throw new Error(`${p.name} has not agreed a plan yet. Services are suggested from agreed needs only.`);
  const needs = pl.goals.map(g => g.text);
  let matches, mode = 'live';
  if (V.live) {
    const dir = SERVICES.map(s => ({ id: s.id, name: s.name, purpose: s.purpose, description: s.desc, minAge: s.minAge, maxAge: s.maxAge, otherEligibility: s.other, area: s.area, cost: s.cost || 'Unknown—confirm with provider', availability: s.avail }));
    const out = await callAI('services', { participant: { name: p.name, age: p.age }, needs, directory: dir });
    matches = arr(out.matches);
  } else if (pid === 'asha' && needs.join('|') === SAMPLE_GOALS_KEY) { matches = SAMPLE_MATCHES; mode = 'sample'; }
  else throw new Error('Live AI is not connected. A sample exists only for Asha’s unedited sample plan.');
  const seen = new Set(), list = [];
  matches.forEach(m => {
    const sid = str(m.serviceId);
    if (!SERVICES.some(s => s.id === sid)) throw new Error(`The AI suggested “${sid}”, which is not in the directory. Result rejected—please retry.`);
    if (seen.has(sid)) return; seen.add(sid);
    list.push({ serviceId: sid, need: str(m.need), why: str(m.why), eligibilityMatched: arr(m.eligibilityMatched).map(str), toCheck: arr(m.toCheck).map(str) });
  });
  U(pid).suggest = { mode, model: V.model, list, needs };
  log(mode === 'live' ? 'AI (live)' : 'AI (sample)', `Suggested ${list.length} service(s) for ${p.name}`);
});
H.createReferral = d => {
  const pid = state.pid, p = P(pid), s = SERVICES.find(x => x.id === d.sid);
  state.actions.push({ id: seq('A'), pid, type: 'referral', serviceId: s.id, text: `Enquire about ${s.name} (${s.id})`, need: d.need, owner: p.navigator, review: addDays(7), status: 'Referral recorded', confirm: '' });
  log('Navigator', `Created simulated referral to ${s.name} (${s.id}) for ${p.name}`);
  V.flash = { ok: true, text: `Referral to ${s.name} recorded (simulated—nothing was sent). Track it in Progress and Handover.` };
};

/* tracker */
H.actField = (d, el) => {
  const a = state.actions.find(x => x.id === d.id);
  if (d.f === 'status' && el.value === 'Support received') return; // only the young person can do this
  a[d.f] = el.value; log('Navigator', `Updated ${a.id} ${d.f} → ${el.value || 'cleared'}`);
};

/* handover */
H.setIncoming = (d, el) => { U(state.pid).incoming = el.value; };
H.handoverDraft = () => run('handover:' + state.pid, async () => {
  const pid = state.pid, p = P(pid), u = U(pid);
  if (!u.incoming) throw new Error('Choose the incoming navigator first.');
  let sections, mode = 'live';
  if (V.live) {
    const record = briefingRecord(pid);
    const out = await callAI('handover', { record });
    const allowed = new Set([...record.notes.map(n => n.id), ...record.actions.map(a => a.id), 'PROFILE', 'PLAN']);
    sections = arr(out.sections).map(s => ({ key: str(s.key), items: arr(s.items).map(i => ({ text: str(i.text), sources: arr(i.sources).filter(x => allowed.has(x)) })).filter(i => i.text) }));
    if (!sections.length) throw new Error('The AI reply could not be used. Please retry.');
  } else { sections = templateHandover(pid); mode = 'template'; }
  state.handovers[pid] = { pid, outgoing: p.navigator, incoming: u.incoming, draft: handoverText(pid, sections), mode, model: V.model, approved: false, accepted: false, overlap: '' };
  log('Navigator', `Drafted handover for ${p.name}: ${p.navigator} → ${u.incoming}`);
});
H.handoverApprove = () => { const h = state.handovers[state.pid]; h.approved = true; log('Navigator', `${h.outgoing} approved handover for ${P(h.pid).name}`); };
H.handoverAccept = () => {
  const h = state.handovers[state.pid], p = P(h.pid);
  if (!h.overlap) { V.err.accept = 'Set an agreed overlap or introduction date first.'; return; }
  V.err.accept = null;
  actsOf(p.id).filter(isOpen).forEach(a => { if (a.owner.includes(h.outgoing)) a.owner = a.owner.replace(h.outgoing, h.incoming); });
  p.backup = h.outgoing; p.navigator = h.incoming; h.accepted = true;
  log(h.incoming, `Accepted handover for ${p.name}; overlap on ${fmt(h.overlap)}. Open actions reassigned to ${h.incoming}`);
};
H.handoverDownload = () => {
  const h = state.handovers[state.pid], p = P(h.pid);
  const body = `SOMEONE STAYS — HANDOVER SUMMARY (Prototype • Fictional data)\nParticipant: ${p.name}, ${p.age}\nFrom: ${h.outgoing}   To: ${h.incoming}\nOverlap/introduction date: ${h.overlap ? fmt(h.overlap) : 'not yet agreed'}\nStatus: ${h.accepted ? 'Accepted' : h.approved ? 'Approved by outgoing navigator' : 'Draft'}\n\n${h.draft}\n`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/plain' })); a.download = `handover-${p.id}.txt`; a.click();
};

/* young person's view */
H.agree = () => {
  const pl = curPlan(state.pid), p = P(pl.pid);
  pl.status = ST_AGREED; pl.agreedAt = today();
  pl.actions.forEach(a => state.actions.push({ id: seq('A'), pid: p.id, type: 'action', text: a.text, owner: a.owner, review: a.review || '', status: 'Planned', source: pl.id }));
  log(`Young person (${p.name})`, `Agreed plan v${pl.version}; ${pl.actions.length} action(s) added to tracker`);
  V.flash = { ok: true, text: 'Thank you. Your plan is now agreed.' };
};
H.showChange = () => { V.showChange = true; };
H.sendChange = () => {
  const el = document.getElementById('changeText'), pl = curPlan(state.pid), p = P(pl.pid);
  pl.status = ST_CHANGES; pl.requested = el.value.trim() || '(no details given)'; V.showChange = false;
  log(`Young person (${p.name})`, `Requested changes to plan v${pl.version}`);
  V.flash = { ok: true, text: 'Your request for changes was recorded and returned to your navigator. No one has responded yet.' };
};
H.contact = () => {
  const p = P(state.pid);
  state.tasks.push({ id: seq('T'), pid: p.id, type: 'contact', label: 'Contact request', text: `${p.name} asked for contact.`, date: today(), done: false });
  log(`Young person (${p.name})`, 'Requested contact');
  V.flash = { ok: true, text: 'Your request was recorded. No one has responded yet.' };
};
H.received = d => {
  const a = state.actions.find(x => x.id === d.id), p = P(a.pid);
  a.status = 'Support received'; a.confirm = 'received';
  log(`Young person (${p.name})`, `Confirmed support received: ${a.text}`);
  V.flash = { ok: true, text: 'Thank you for letting us know.' };
};
H.needHelp = d => {
  const a = state.actions.find(x => x.id === d.id), p = P(a.pid);
  a.status = 'Reopened'; a.confirm = 'needs help';
  state.tasks.push({ id: seq('T'), pid: p.id, type: 'needhelp', label: 'Support not received', text: `${p.name} says they still need help with: ${a.text}`, date: today(), done: false, ref: a.id });
  log(`Young person (${p.name})`, `Said they still need help: ${a.text} (referral reopened)`);
  V.flash = { ok: true, text: 'Your request was recorded and the item has been reopened for your navigator. No one has responded yet.' };
};
H.showNav = () => { V.showNav = true; };
H.sendNav = () => {
  const p = P(state.pid), el = document.getElementById('navText');
  state.tasks.push({ id: seq('T'), pid: p.id, type: 'navchange', label: 'Navigator change request', text: `${p.name} asked for a different navigator.${el.value.trim() ? ' Reason: ' + el.value.trim() : ''}`, date: today(), done: false });
  V.showNav = false; log(`Young person (${p.name})`, 'Requested a different navigator');
  V.flash = { ok: true, text: 'Your request was recorded. No one has responded yet.' };
};
H.setLang = (d, el) => { const p = P(state.pid); p.language = el.value; log(`Young person (${p.name})`, `Changed language preference to ${el.value}`); V.flash = { ok: true, text: 'Language preference saved.' }; };
H.translatePlan = () => run('ptrans', async () => {
  const pl = curPlan(state.pid);
  if (!V.live) throw new Error('Translation needs live AI, which is not connected in this demo.');
  const text = ['Goals: ' + pl.goals.map(g => g.text).join('; '), 'Actions: ' + pl.actions.map(a => `${a.text} (${a.owner})`).join('; ')].join('\n');
  V.pTrans = str((await callAI('translate', { text, target: 'Hindi' })).text);
  if (!V.pTrans) throw new Error('The translation came back empty.');
});

/* ---------- record builders for briefing & handover ---------- */
function briefingRecord(pid) {
  const p = P(pid), pl = curPlan(pid);
  return {
    today: today(),
    participant: { name: p.name, age: p.age, language: p.language, navigator: p.navigator, backup: p.backup, nextMeeting: p.nextMeeting, goals: p.goals, facts: p.facts.map(f => ({ item: f.k, value: f.v || 'Unknown / not recorded' })) },
    notes: notesOf(pid).map(n => ({ id: n.id, date: n.date, text: n.text })),
    actions: actsOf(pid).map(a => ({ id: a.id, text: a.text, owner: a.owner, review: a.review || 'not set', status: a.status, overdue: isOverdue(a) })),
    plan: pl ? { id: 'PLAN', status: pl.status, goals: pl.goals.map(g => g.text), open_questions: pl.clarify.map(g => g.text), requested_changes: pl.requested || '' } : null,
    open_requests: state.tasks.filter(t => t.pid === pid && !t.done).map(t => t.text)
  };
}
function templateBriefing(pid) {
  const p = P(pid), pl = curPlan(pid), notes = notesOf(pid), acts = actsOf(pid), pts = [];
  const add = (section, text, sources) => pts.push({ section, text, sources: sources || [] });
  p.goals.forEach(g => add('achieve', `${p.name} wants to: ${g}.`, ['PROFILE']));
  add('achieve', `Preferred language for conversations: ${p.language}.`, ['PROFILE']);
  const last = notes.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
  add('changed', last ? `Latest note (${fmt(last.date)}): ${last.text}` : 'No notes have been recorded yet.', last ? [last.id] : []);
  if (pl) add('changed', `Plan v${pl.version} status: ${pl.status}.${pl.requested ? ' Requested changes: “' + pl.requested + '”' : ''}`, ['PLAN']);
  else add('changed', 'No plan has been drafted yet.');
  p.facts.forEach(f => {
    if (!f.v) { add('unresolved', `${f.k} is not recorded.`, ['PROFILE']); add('ask', `Clarify: ${f.k.toLowerCase()}.`, ['PROFILE']); }
    else if (f.open) { add('unresolved', `${f.k}: ${f.v}.`, ['PROFILE']); add('ask', `Discuss ${f.k.toLowerCase()} preferences and next steps.`, ['PROFILE']); }
  });
  acts.filter(isOverdue).forEach(a => { add('unresolved', `Overdue: “${a.text}” (review date ${fmt(a.review)}, ${a.status}).`, [a.id]); add('ask', `Ask about progress on “${a.text}”.`, [a.id]); });
  acts.filter(a => a.status === 'Reopened').forEach(a => add('unresolved', `${p.name} said support has not arrived: “${a.text}”.`, [a.id]));
  acts.filter(a => a.status === 'Awaiting participant confirmation').forEach(a => add('unresolved', `Waiting for ${p.name} to confirm whether support arrived: “${a.text}”.`, [a.id]));
  if (!pts.some(x => x.section === 'unresolved')) add('unresolved', 'Nothing unresolved is recorded.');
  if (!pts.some(x => x.section === 'ask')) add('ask', 'No specific questions identified from the records. Ask what the young person wants to discuss.');
  return pts;
}
function templateHandover(pid) {
  const p = P(pid), pl = curPlan(pid), acts = actsOf(pid), S = [];
  const goals = pl && pl.status === ST_AGREED ? pl.goals.map(g => ({ text: g.text, sources: ['PLAN'] })) : p.goals.map(g => ({ text: g + (pl ? ' (profile goal; current plan is not yet agreed)' : ' (profile goal; no plan yet)'), sources: ['PROFILE'] }));
  S.push({ key: 'goals', items: goals });
  S.push({ key: 'communication', items: [{ text: `Prefers conversations in ${p.language}. No other communication preferences are recorded.`, sources: ['PROFILE'] }] });
  S.push({ key: 'completed', items: acts.filter(a => !isOpen(a)).map(a => ({ text: `${a.text} (${a.status})`, sources: [a.id] })) });
  S.push({ key: 'outstanding', items: acts.filter(isOpen).map(a => ({ text: `${a.text} — owner ${a.owner}, review ${fmt(a.review)}, status ${a.status}${isOverdue(a) ? ' (OVERDUE)' : ''}`, sources: [a.id] })) });
  const un = [];
  p.facts.forEach(f => { if (!f.v || f.open) un.push({ text: `${f.k}: ${f.v || 'not recorded'}`, sources: ['PROFILE'] }); });
  state.tasks.filter(t => t.pid === pid && !t.done).forEach(t => un.push({ text: `Open request: ${t.text}`, sources: t.ref ? [t.ref] : [] }));
  S.push({ key: 'unresolved', items: un });
  const cf = [];
  if (!pl || pl.status !== ST_AGREED) cf.push({ text: pl ? `Plan v${pl.version} is “${pl.status}”—not yet agreed by ${p.name}` : 'No plan exists yet', sources: pl ? ['PLAN'] : [] });
  acts.filter(a => a.status === 'Awaiting participant confirmation').forEach(a => cf.push({ text: `Awaiting ${p.name}’s confirmation that support arrived: ${a.text}`, sources: [a.id] }));
  S.push({ key: 'confirm', items: cf });
  return S;
}
const SEC_TITLES = { goals: 'Agreed goals', communication: 'Communication preferences', completed: 'Completed actions', outstanding: 'Outstanding commitments and dates', unresolved: 'Unresolved questions', confirm: 'Information that needs confirmation' };
function handoverText(pid, sections) {
  const order = Object.keys(SEC_TITLES);
  const by = {}; sections.forEach(s => { by[s.key] = s; });
  return order.map(k => {
    const items = by[k] ? by[k].items : [];
    const lines = items.length ? items.map(i => `- ${i.text}${i.sources.length ? ' [' + i.sources.join(', ') + ']' : ' [no source]'}`) : ['- Nothing recorded.'];
    return `${SEC_TITLES[k].toUpperCase()}\n${lines.join('\n')}`;
  }).join('\n\n');
}

/* ---------- views ---------- */
function viewDash() {
  const rows = state.participants.map(p => ({ p, s: stats(p.id) }));
  const sum = k => rows.reduce((t, r) => t + r.s[k], 0);
  const open = state.tasks.filter(t => !t.done);
  const cards = rows.map(({ p, s }) => `
    <div class="card clickable ${state.detail === p.id ? 'sel' : ''}" data-act="open" data-id="${p.id}">
      <h3>${esc(p.name)}, ${p.age}</h3>
      <ul class="plain">${p.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
      <p class="small">Navigator: <b>${esc(p.navigator)}</b> · Backup: ${esc(p.backup)}<br>Next contact: ${fmt(p.nextMeeting)}</p>
      <span class="badge amber">Pending ${s.pending}</span>
      <span class="badge ${s.overdue ? 'red' : ''}">Overdue ${s.overdue}</span>
      <span class="badge ${s.awaiting ? 'amber' : ''}">Awaiting young person ${s.awaiting}</span>
      ${s.requests ? `<span class="badge red">Open requests ${s.requests}</span>` : ''}
    </div>`).join('');
  return `
    <h2>My Young People</h2>
    <div class="totals">
      <div class="total"><b>${rows.length}</b><span>Young people</span></div>
      <div class="total"><b>${sum('pending')}</b><span>Pending actions</span></div>
      <div class="total"><b>${sum('overdue')}</b><span>Overdue actions</span></div>
      <div class="total"><b>${sum('awaiting')}</b><span>Awaiting young person</span></div>
      <div class="total"><b>${open.length}</b><span>Open requests</span></div>
    </div>
    ${open.length ? `<div class="card"><h3>Requests and follow-ups</h3>${open.map(t => `
      <div class="item"><span class="badge ${t.type === 'needhelp' ? 'red' : 'amber'}">${esc(t.label)}</span> <b>${esc(P(t.pid).name)}</b> · ${fmt(t.date)}<br>${esc(t.text)}
      <div class="row"><button class="btn small ghost" data-act="taskSeen" data-id="${t.id}">Mark seen</button>
      <button class="btn small ghost" data-act="open" data-id="${t.pid}">Open profile</button></div></div>`).join('')}</div>` : ''}
    <div class="grid">${cards}</div>
    ${state.detail ? viewDetail(state.detail) : '<p class="muted">Click a profile to see details.</p>'}
    <div class="card"><h3>Recent activity</h3>${state.activity.slice(0, 10).map(a => `<div class="small"><span class="muted">${new Date(a.ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span> · <b>${esc(a.actor)}</b> — ${esc(a.text)}</div>`).join('')}</div>`;
}

function viewDetail(pid) {
  const p = P(pid), pl = curPlan(pid), u = U(pid), acts = actsOf(pid), b = u.briefing, key = 'briefing:' + pid;
  const titles = { achieve: 'What they want to achieve', changed: 'What has changed since the last contact', unresolved: 'What remains unresolved', ask: 'Questions to ask next' };
  const brief = b ? `${aiLabel(b.mode, b.model)}${['achieve', 'changed', 'unresolved', 'ask'].map(sec => {
    const pts = b.points.filter(x => x.section === sec);
    return pts.length ? `<h4>${titles[sec]}</h4><ul class="plain">${pts.map(x => `<li>${esc(x.text)}${sources(x.sources)}</li>`).join('')}</ul>` : '';
  }).join('')}` : '';
  return `
  <div class="card"><h2>${esc(p.name)}, ${p.age}</h2>
    <div class="row"><button class="btn" data-act="briefing" ${V.busy ? 'disabled' : ''}>${V.busy === key ? 'Preparing…' : 'Prepare my briefing'}</button></div>
    ${V.err[key] ? `<div class="flash err">${esc(V.err[key])}</div>` : ''}${brief}
    <div class="two">
      <div><h4>Goals and preferences</h4><ul class="plain">${p.goals.map(g => `<li>${esc(g)}</li>`).join('')}<li>Preferred language: ${esc(p.language)}</li></ul>
        <h4>Known facts</h4><ul class="plain">${p.facts.map(f => `<li>${esc(f.k)}: ${f.v ? esc(f.v) : '<span class="muted">Unknown / not recorded</span>'}</li>`).join('')}</ul>
        <h4>Next meeting</h4><p>${fmt(p.nextMeeting)} with ${esc(p.navigator)}</p></div>
      <div><h4>Recent notes</h4>${notesOf(pid).slice().reverse().slice(0, 4).map(n => `<div class="item small"><b>${n.id}</b> · ${fmt(n.date)}<br>${esc(n.text)}</div>`).join('') || '<p class="muted">No notes yet.</p>'}
        <h4>Current plan</h4>${pl ? `<p>Version ${pl.version}: ${statusBadge(pl.status)}</p>` : '<p class="muted">No plan yet.</p>'}</div>
    </div>
    <h4>Actions and referrals</h4>${actionTable(acts, false)}
  </div>`;
}
const statusBadge = s => `<span class="badge ${s === ST_AGREED ? 'green' : s === ST_CHANGES ? 'red' : 'amber'}">${esc(s)}</span>`;

function actionTable(acts, editable) {
  if (!acts.length) return '<p class="muted">No actions yet.</p>';
  return `<div class="tablewrap"><table><tr><th>Action</th><th>Owner</th><th>Review date</th><th>Status</th></tr>${acts.map(a => `
    <tr class="${isOverdue(a) ? 'overdue' : ''}"><td>${a.type === 'referral' ? '<span class="badge">Referral</span> ' : ''}${esc(a.text)}</td><td>${esc(a.owner)}</td>
    <td>${editable ? `<input type="date" value="${a.review || ''}" data-act-change="actField" data-id="${a.id}" data-f="review">` : fmt(a.review)}${isOverdue(a) ? ' <span class="badge red">Overdue</span>' : ''}</td>
    <td>${editable && a.type === 'action' ? `<select data-act-change="actField" data-id="${a.id}" data-f="status">${ACT_STATUS.map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : esc(a.status)}</td></tr>`).join('')}</table></div>`;
}

function viewConv() {
  const pid = state.pid, p = P(pid), u = U(pid), busy = V.busy === 'plan';
  return `
  <h2>Conversation to Plan — ${esc(p.name)}</h2>
  <div class="card">
    <div class="row"><label>Language of the notes <select data-ui="lang">${['English', 'Hindi'].map(l => `<option ${u.lang === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <button class="btn ghost" data-act="loadExample" ${pid === 'asha' ? '' : 'disabled title="The example belongs to Asha—select Asha"'}>Load Asha’s example</button>
      <button class="btn ghost" data-act="translateNotes" ${V.busy ? 'disabled' : ''}>${V.busy === 'translate' ? 'Translating…' : 'Translate to ' + (u.lang === 'Hindi' ? 'English' : 'Hindi')}</button></div>
    <textarea data-ui="notes" placeholder="Type or paste conversation notes…">${esc(u.notes)}</textarea>
    ${V.err.translate ? `<div class="flash err">${esc(V.err.translate)}</div>` : ''}
    ${u.translation ? `<div class="item">${aiLabel(u.translation.mode, V.model)}<div class="small muted">Translation to ${u.translation.target}</div>${esc(u.translation.text)}</div>` : ''}
    <p class="small muted">Voice upload/recording is not included in this prototype; paste or type the notes.</p>
    <label><input type="checkbox" data-ui="consent" ${u.consent ? 'checked' : ''}> ${esc(p.name)} has agreed to these notes being processed by AI.</label>
    <div class="row"><button class="btn" data-act="generatePlan" ${V.busy ? 'disabled' : ''}>${busy ? 'Generating…' : 'Generate draft plan'}</button></div>
    ${V.err.plan ? `<div class="flash err">${esc(V.err.plan)}</div>` : ''}
  </div>
  ${planPanel(pid)}`;
}

function planPanel(pid) {
  const pl = curPlan(pid), p = P(pid);
  if (!pl) return '<div class="card"><h3>Plan</h3><p class="muted">No plan yet. Generate a draft from the notes above.</p></div>';
  const edit = pl.status === ST_DRAFT || pl.status === ST_CHANGES;
  const sec = (key, title) => `<h4>${title}</h4>${pl[key].map((it, i) => `<div class="item">
      ${edit ? `<input type="text" class="wide" data-plan="${key}|${i}|text" value="${esc(it.text)}" placeholder="Describe…">` : `<b>${esc(it.text)}</b>`}
      ${key === 'actions' ? (edit ? `<div class="row"><label class="small">Owner <select data-plan="${key}|${i}|owner">${ownerOptions(pid).map(o => `<option ${o === it.owner ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
        <label class="small">Review date <input type="date" data-plan="${key}|${i}|review" value="${it.review || ''}"></label></div>`
        : `<div class="small">Proposed owner: ${esc(it.owner)} · Review date: ${fmt(it.review)}</div>`) : ''}
      <span class="src">${it.quote ? `Based on: <span class="quote">“${esc(it.quote)}”</span> (${it.src})` : it.warn ? `<span class="warn-text">${esc(it.warn)}</span>` : it.src ? `Recorded in ${it.src}` : 'Added by navigator'}</span>
      ${edit ? `<button class="btn small warn" data-act="planRemove" data-sec="${key}" data-i="${i}">Remove</button>` : ''}</div>`).join('') || '<p class="muted small">None.</p>'}
    ${edit ? `<button class="btn small ghost" data-act="planAdd" data-sec="${key}">+ Add</button>` : ''}`;
  return `<div class="card"><h3>Draft plan, version ${pl.version} ${statusBadge(pl.status)}</h3>
    ${aiLabel(pl.mode === 'seed' ? '' : pl.mode, pl.model)}
    ${pl.status === ST_CHANGES ? `<div class="flash err"><b>${esc(p.name)} asked for changes:</b> ${esc(pl.requested)}</div>` : ''}
    <p class="small muted">Status flow: Draft → Awaiting young person's review → Agreed. Your approval alone does not make the plan agreed.</p>
    ${sec('goals', 'Stated goals')}${sec('concerns', 'Expressed concerns')}${sec('clarify', 'Information to clarify')}${sec('actions', 'Suggested actions')}
    <div class="row">
      ${edit ? '<button class="btn" data-act="approvePlan">Approve for young person’s review</button>' : ''}
      ${pl.status === ST_AWAIT ? `<span class="muted">Waiting for ${esc(p.name)} to respond (use the Young person's view).</span> <button class="btn ghost small" data-act="withdrawPlan">Withdraw to edit</button>` : ''}
      ${pl.status === ST_AGREED ? `<span class="badge green">Agreed by ${esc(p.name)} on ${fmt(pl.agreedAt)}</span>` : ''}
    </div></div>`;
}

function dirCard(s, p) {
  const ageOk = p ? (p.age >= s.minAge && p.age <= s.maxAge) : null;
  return `<div class="card"><h3>${s.id} · ${esc(s.name)}</h3><span class="svc-tag">${DEMO_LABEL}</span>
    <p><b>${esc(s.purpose)}</b><br>${esc(s.desc)}</p>
    <p class="small">Age: ${s.minAge}–${s.maxAge}${p ? ` <span class="badge ${ageOk ? 'green' : 'red'}">${ageOk ? p.name + ' (' + p.age + ') is within range' : p.name + ' (' + p.age + ') is outside range'}</span>` : ''}<br>
    Other conditions (fictional): ${esc(s.other)}<br>Area: ${esc(s.area)}<br>Cost: ${esc(s.cost || 'Unknown—confirm with provider')}<br>
    Availability: ${esc(s.avail)}<br>Demo review date: ${fmt(s.review)}</p></div>`;
}

function viewFind() {
  const pid = state.pid, p = P(pid), u = U(pid), sg = u.suggest, key = 'suggest:' + pid;
  const result = sg ? `${aiLabel(sg.mode, sg.model)}<p class="small muted">Needs used: ${sg.needs.map(esc).join('; ')}</p>${sg.list.length ? sg.list.map(m => {
    const s = SERVICES.find(x => x.id === m.serviceId), ageOk = p.age >= s.minAge && p.age <= s.maxAge;
    const exists = actsOf(pid).some(a => a.serviceId === s.id && isOpen(a));
    return `<div class="card"><h3>${esc(s.name)} — ${s.id}</h3>
      <p><b>Need addressed:</b> ${esc(m.need || '—')}<br><b>Why it may fit:</b> ${esc(m.why || '—')}</p>
      <p class="small"><b>Age check (rules, not AI):</b> ${ageOk ? `${p.name} (${p.age}) is within ${s.minAge}–${s.maxAge}` : `<span class="warn-text">${p.name} (${p.age}) is outside ${s.minAge}–${s.maxAge}</span>`}<br>
      <b>Eligibility conditions that match:</b> ${m.eligibilityMatched.length ? m.eligibilityMatched.map(esc).join('; ') : 'None confirmed'}<br>
      <b>Still needs checking:</b> ${m.toCheck.length ? m.toCheck.map(esc).join('; ') : '—'}<br><b>Source:</b> ${s.id}</p>
      <button class="btn" data-act="createReferral" data-sid="${s.id}" data-need="${esc(m.need)}" ${exists ? 'disabled' : ''}>${exists ? 'Referral already open' : 'Create referral'}</button></div>`;
  }).join('') : '<div class="card"><b>No suitable option found in this directory.</b></div>'}` : '';
  return `
  <h2>Find Support — ${esc(p.name)}</h2>
  <div class="card"><div class="row"><button class="btn" data-act="suggest" ${V.busy ? 'disabled' : ''}>${V.busy === key ? 'Searching…' : 'Suggest relevant services'}</button></div>
    <p class="small muted">Uses ${esc(p.name)}'s agreed needs and the directory below only. Referrals are simulated; nothing is sent.</p>
    ${V.err[key] ? `<div class="flash err">${esc(V.err[key])}</div>` : ''}${result}</div>
  <h3>Service directory (fictional)</h3><div class="grid">${SERVICES.map(s => dirCard(s, p)).join('')}</div>`;
}

function viewProg() {
  const pid = state.pid, p = P(pid), acts = actsOf(pid), plain = acts.filter(a => a.type === 'action'), refs = acts.filter(a => a.type === 'referral');
  const h = state.handovers[pid], u = U(pid), key = 'handover:' + pid;
  const refRows = refs.map(a => {
    const s = SERVICES.find(x => x.id === a.serviceId), done = a.status === 'Support received';
    const opts = REF_FLOW.slice(0, 4).concat(a.status === 'Reopened' ? ['Reopened'] : []);
    return `<tr class="${isOverdue(a) ? 'overdue' : ''}"><td>${esc(s ? s.name + ' (' + s.id + ')' : '')}<br><span class="small muted">${esc(a.text)}</span></td><td>${esc(a.owner)}</td>
      <td><input type="date" value="${a.review || ''}" data-act-change="actField" data-id="${a.id}" data-f="review" ${done ? 'disabled' : ''}>${isOverdue(a) ? ' <span class="badge red">Overdue</span>' : ''}</td>
      <td>${done ? '<span class="badge green">Support received (confirmed by ' + esc(p.name) + ')</span>' : `<select data-act-change="actField" data-id="${a.id}" data-f="status">${opts.map(o => `<option ${o === a.status ? 'selected' : ''}>${o}</option>`).join('')}</select>`}
      ${a.status === 'Awaiting participant confirmation' ? `<div class="small muted">Waiting for ${esc(p.name)} to confirm. Staff cannot mark this as received.</div>` : ''}
      ${a.status === 'Reopened' ? `<div class="small warn-text">${esc(p.name)} said they still need help.</div>` : ''}</td></tr>`;
  }).join('');
  const handover = h && !h.accepted ? `
    ${aiLabel(h.mode, h.model)}<p class="small muted">${esc(h.outgoing)} → ${esc(h.incoming)}. Editable. Facts carry source references in [brackets].</p>
    <textarea data-handover="draft" style="min-height:300px">${esc(h.draft)}</textarea>
    <div class="row">
      <button class="btn" data-act="handoverApprove" ${h.approved ? 'disabled' : ''}>${h.approved ? esc(h.outgoing) + ' approved ✓' : esc(h.outgoing) + ' approves handover'}</button>
      <button class="btn ghost" data-act="handoverDownload">Download summary</button></div>
    <div class="row"><label>Agreed overlap / introduction date <input type="date" data-handover="overlap" value="${h.overlap || ''}"></label>
      <button class="btn" data-act="handoverAccept" ${h.approved ? '' : 'disabled title="Outgoing navigator must approve first"'}>${esc(h.incoming)} accepts handover</button></div>
    ${V.err.accept ? `<div class="flash err">${esc(V.err.accept)}</div>` : ''}`
    : h && h.accepted ? `<div class="flash ok">Handover accepted by ${esc(h.incoming)}. Overlap/introduction date: ${fmt(h.overlap)}. Open actions were reassigned.</div>
      <textarea readonly style="min-height:200px">${esc(h.draft)}</textarea><div class="row"><button class="btn ghost" data-act="handoverDownload">Download summary</button></div>` : '';
  const navReq = state.tasks.filter(t => t.pid === pid && t.type === 'navchange' && !t.done);
  return `
  <h2>Progress and Handover — ${esc(p.name)}</h2>
  <div class="card"><h3>Action tracker</h3>${actionTable(plain, true)}<p class="small muted">Overdue is flagged by ordinary date rules (review date earlier than today).</p></div>
  <div class="card"><h3>Referral tracking</h3><p class="small muted">Planned → Referral recorded → Appointment arranged → Awaiting participant confirmation → Support received (only the young person can confirm).</p>
    ${refs.length ? `<div class="tablewrap"><table><tr><th>Service</th><th>Owner</th><th>Review date</th><th>Status</th></tr>${refRows}</table></div>` : '<p class="muted">No referrals yet. Create one from Find Support.</p>'}</div>
  <div class="card"><h3>Handover to a new navigator</h3>
    ${navReq.length ? `<div class="flash err">${esc(p.name)} has asked for a different navigator.</div>` : ''}
    <p>Current navigator: <b>${esc(p.navigator)}</b></p>
    <div class="row"><label>Incoming navigator <select data-ui="incoming"><option value="">Choose…</option>${NAVIGATORS.filter(n => n !== p.navigator).map(n => `<option ${u.incoming === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="btn" data-act="handoverDraft" ${V.busy ? 'disabled' : ''}>${V.busy === key ? 'Drafting…' : 'Draft handover'}</button></div>
    ${V.err[key] ? `<div class="flash err">${esc(V.err[key])}</div>` : ''}${handover}</div>`;
}

function viewYoung() {
  const pid = state.pid, p = P(pid), pl = curPlan(pid), refs = actsOf(pid).filter(a => a.type === 'referral');
  let plan;
  const list = pl && pl.status === ST_AGREED ? actsOf(pid).filter(a => a.source === pl.id) : (pl ? pl.actions : []);
  const mine = list.filter(a => a.owner.includes(p.name)), nav = list.filter(a => !a.owner.includes(p.name) || a.owner.includes(p.navigator));
  const li = a => `<li>${esc(a.text)} <span class="muted small">— review: ${fmt(a.review)}</span></li>`;
  if (!pl || pl.status === ST_DRAFT) plan = '<p class="muted">Your navigator is still preparing your plan with you.</p>';
  else if (pl.status === ST_CHANGES) plan = `<p>You asked for changes: “${esc(pl.requested)}”. Your navigator will update the plan and bring it back to you.</p>`;
  else plan = `<h4>My goals</h4><ul class="plain">${pl.goals.map(g => `<li>${esc(g.text)}</li>`).join('')}</ul>
    <h4>What I will do</h4><ul class="plain">${mine.map(li).join('') || '<li class="muted">Nothing yet</li>'}</ul>
    <h4>What my navigator will do</h4><ul class="plain">${nav.map(li).join('') || '<li class="muted">Nothing yet</li>'}</ul>
    ${pl.status === ST_AWAIT ? `<div class="row"><button class="btn" data-act="agree">This reflects what I want</button><button class="btn ghost" data-act="showChange">I would like a change</button></div>
      ${V.showChange ? `<textarea id="changeText" placeholder="What would you like to change?"></textarea><div class="row"><button class="btn" data-act="sendChange">Send to my navigator</button></div>` : ''}`
      : `<span class="badge green">Agreed on ${fmt(pl.agreedAt)}</span>`}
    <div class="row"><button class="btn ghost small" data-act="translatePlan" ${V.busy ? 'disabled' : ''}>${V.busy === 'ptrans' ? 'Translating…' : 'हिंदी में दिखाएँ (Show in Hindi)'}</button></div>
    ${V.err.ptrans ? `<div class="flash err">${esc(V.err.ptrans)}</div>` : ''}${V.pTrans ? `<div class="item">${aiLabel('live', V.model)}${esc(V.pTrans)}</div>` : ''}`;
  const support = refs.length ? refs.map(a => {
    const s = SERVICES.find(x => x.id === a.serviceId);
    return `<div class="item"><b>${esc(s ? s.name : a.text)}</b><br><span class="small muted">${esc(a.text)}</span><br>Status: ${esc(a.status)}
      ${a.status === 'Awaiting participant confirmation' ? `<div class="row"><button class="btn" data-act="received" data-id="${a.id}">I received the support</button><button class="btn warn" data-act="needHelp" data-id="${a.id}">I still need help</button></div>` : ''}</div>`;
  }).join('') : '<p class="muted">No support has been arranged yet.</p>';
  return `
  <h2>Hello ${esc(p.name)}</h2>
  <div class="card"><h3>My person</h3><p>Navigator: <b>${esc(p.navigator)}</b><br>Backup: ${esc(p.backup)}<br>Next meeting: ${fmt(p.nextMeeting)}</p>
    <button class="btn" data-act="contact">Request contact</button></div>
  <div class="card"><h3>My plan</h3>${plan}</div>
  <div class="card"><h3>My support</h3>${support}</div>
  <div class="card"><h3>My choices</h3>
    <div class="row"><label>My preferred language <select data-act-change="setLang">${['English', 'Hindi'].map(l => `<option ${p.language === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="row"><button class="btn ghost" data-act="showNav">Request a different navigator</button></div>
    ${V.showNav ? `<textarea id="navText" placeholder="Anything you would like to tell us (optional)"></textarea><div class="row"><button class="btn" data-act="sendNav">Send request</button></div>` : ''}</div>`;
}

function render() {
  const nav = state.role === 'navigator';
  document.getElementById('roleSwitch').innerHTML = [['navigator', 'Navigator view'], ['young', "Young person's view"]].map(([v, l]) => `<button class="${state.role === v ? 'on' : ''}" data-act="role" data-v="${v}">${l}</button>`).join('');
  const sel = document.getElementById('pidSel');
  sel.innerHTML = state.participants.map(p => `<option value="${p.id}" ${p.id === state.pid ? 'selected' : ''}>${p.name}, ${p.age}</option>`).join('');
  const tabs = document.getElementById('tabs');
  tabs.style.display = nav ? '' : 'none';
  tabs.innerHTML = [['dash', 'My Young People'], ['conv', 'Conversation to Plan'], ['find', 'Find Support'], ['prog', 'Progress and Handover']].map(([v, l]) => `<button class="${state.tab === v ? 'on' : ''}" data-act="tab" data-v="${v}">${l}</button>`).join('');
  const st = document.getElementById('aiStatus');
  st.className = 'ai-status' + (V.live ? ' live' : '');
  st.textContent = V.live ? `Live AI connected (${V.model})` : 'Live AI not connected — sample mode';
  const flash = V.flash ? `<div class="flash ${V.flash.ok ? 'ok' : 'err'}">${esc(V.flash.text)}</div>` : '';
  const views = { dash: viewDash, conv: viewConv, find: viewFind, prog: viewProg };
  document.getElementById('app').innerHTML = flash + (nav ? views[state.tab]() : viewYoung());
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.tagName === 'SELECT') return;
  if (!H[b.dataset.act]) return;
  V.flash = null;
  const r = H[b.dataset.act](b.dataset, b);
  if (r && r.then) return; // run() renders itself
  save(); render();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'pidSel') { state.pid = el.value; if (state.detail) state.detail = el.value; V.flash = null; V.pTrans = null; V.showChange = false; V.showNav = false; save(); render(); return; }
  if (el.dataset.actChange) { H[el.dataset.actChange](el.dataset, el); save(); render(); return; }
  if (el.dataset.ui) { const u = U(state.pid); u[el.dataset.ui] = el.type === 'checkbox' ? el.checked : el.value; save(); if (el.dataset.ui === 'incoming' || el.dataset.ui === 'lang') render(); return; }
  if (el.dataset.plan) { setPlan(el); return; }
  if (el.dataset.handover) { state.handovers[state.pid][el.dataset.handover] = el.value; save(); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.ui === 'notes') { U(state.pid).notes = el.value; save(); }
  else if (el.dataset.plan && el.type === 'text') setPlan(el);
  else if (el.dataset.handover === 'draft') { state.handovers[state.pid].draft = el.value; save(); }
});
function setPlan(el) {
  const [sec, i, f] = el.dataset.plan.split('|');
  curPlan(state.pid)[sec][+i][f] = el.value; save();
}

/* ---------- start ---------- */
render();
fetch('/api/status').then(r => r.json()).then(j => { V.live = !!j.live; V.model = j.model; render(); }).catch(() => { V.live = false; });
})();
