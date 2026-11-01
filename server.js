// Clocked: LARP as anyone, and an AI interviewer tries to clock you.
// The browser holds the voice call (ElevenLabs JS SDK). This server keeps the API keys:
// it signs the call URL, fetches the post-call bluff report and sends the recruiter's emails.
// If ElevenLabs can't take a call, the backup interviewer scores answers with a text model (Gemini or Featherless).
import express from "express";
import { Agentboxd } from "agentboxd";
import { sendResultEmail, wakeRecruiter } from "./recruiter.js";

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  AGENTBOXD_API_KEY,
  AGENTBOXD_INBOX_ID,
  GEMINI_API_KEY,
  FEATHERLESS_API_KEY,
  BACKUP_MODEL,
  PORT = 3000,
} = process.env;

const ELEVEN = "https://api.elevenlabs.io/v1/convai";
const HOUR = 3600_000;
const DAY = 24 * HOUR;
// Spending guards. A round costs about a minute of ElevenLabs call time, and Agentboxd allows
// 20 sends a day. Per-address limits stay generous because a venue's Wi-Fi shares one address.
const LIMITS = { roundsPerAddressPerHour: 30, roundsPerDay: 120, emailsPerAddressPerDay: 10, emailsPerDay: 15 };

// The backup interviewer's model, through an OpenAI-compatible API: Gemini's free tier if its key is set,
// otherwise Featherless. With neither key, the backup stays off.
const BACKUP = GEMINI_API_KEY
  ? { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: GEMINI_API_KEY, model: BACKUP_MODEL || "gemini-2.5-flash" }
  : FEATHERLESS_API_KEY
    ? { url: "https://api.featherless.ai/v1/chat/completions", key: FEATHERLESS_API_KEY, model: BACKUP_MODEL || "Qwen/Qwen2.5-14B-Instruct" }
    : null;

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "64kb" }));
app.use(express.static("public"));

const mail = AGENTBOXD_API_KEY && AGENTBOXD_INBOX_ID ? new Agentboxd() : null;

const hits = new Map();
function allow(key, max, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const ok = recent.length < max;
  if (ok) recent.push(now);
  hits.set(key, recent);
  return ok;
}

// Finished reports never change, so each is fetched from ElevenLabs once and served from memory.
const reports = new Map();
const emailedRounds = new Set();

app.get("/api/health", (req, res) => {
  res.json({ voice: Boolean(ELEVENLABS_API_KEY && ELEVENLABS_AGENT_ID), mail: Boolean(mail), backup: Boolean(BACKUP) });
});

// Signed URLs are valid for 15 minutes, so the page asks for one right before each round.
app.get("/api/signed-url", async (req, res) => {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return res.status(503).json({ error: "Voice isn't configured yet." });
  }
  if (!allow(`round:${req.ip}`, LIMITS.roundsPerAddressPerHour, HOUR) || !allow("round:all", LIMITS.roundsPerDay, DAY)) {
    return res.status(429).json({ error: "Round limit reached. Try again later." });
  }
  const url = `${ELEVEN}/conversation/get-signed-url?agent_id=${encodeURIComponent(ELEVENLABS_AGENT_ID)}`;
  const r = await fetch(url, { headers: { "xi-api-key": ELEVENLABS_API_KEY } });
  if (!r.ok) return res.status(502).json({ error: `ElevenLabs returned ${r.status}` });
  const { signed_url } = await r.json();
  res.json({ signedUrl: signed_url });
});

// Post-call analysis runs after the call ends, so the page polls this until status is "done".
app.get("/api/report/:id", async (req, res) => {
  if (!ELEVENLABS_API_KEY) return res.status(503).json({ error: "Voice isn't configured yet." });
  const id = req.params.id;
  if (reports.has(id)) return res.json(reports.get(id));
  const r = await fetch(`${ELEVEN}/conversations/${encodeURIComponent(id)}`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  if (!r.ok) return res.status(502).json({ error: `ElevenLabs returned ${r.status}` });
  const convo = await r.json();
  const results = convo.analysis?.data_collection_results ?? {};
  const payload = {
    status: convo.status,
    report: results.bluff_report?.value ?? null,
    bluffs: results.bluff_count?.value ?? null,
  };
  if (convo.status === "done") {
    reports.set(id, payload);
    if (reports.size > 500) reports.delete(reports.keys().next().value);
  }
  res.json(payload);
});

// The backup interviewer's instructions: the same character and scoring as the voice agent, answered as JSON.
const backupPrompt = (role, posting) => `You are Tock, the interviewer in Clocked, a comedy game. The user claims to be ${role}, and your job is to catch them bluffing.
Job posting from the user, if any: ${posting}
Real people: if ${role} is a real, well-known person, ask only about their public career, never their private life, and don't state facts you aren't sure of.
Character: a sharp, dry senior expert who spends too much time online. A little smug, never cruel. PG only. Never mock looks, identity or accents. Use at most one slang word (aura, cooked, chief, lowkey, mid, no cap, fr).
Each turn, judge the user's last answer, then ask one insider question that someone who really works as ${role} would answer easily: tools, jargon, numbers, everyday details, common mistakes. If there's a job posting, you're hiring for that exact job, so ask about its duties and requirements. Get more specific each turn.
Reply with JSON only, in this shape:
{"delta": 0, "reason": "a 3 to 6 word note", "better": "one sentence on what a real ${role} would have said", "reply": "one short spoken sentence: a quick jab, then your next question"}
delta is +10 to +30 when the answer bluffs (vague, buzzwords, wrong, evasive or off topic), -10 to -5 when it's specific and correct, and 0 when it's unclear.`;

const clip = (s, n) => String(s ?? "").slice(0, n);

// One backup turn: score the latest answer and write the next question.
app.post("/api/backup/turn", async (req, res) => {
  if (!BACKUP) return res.status(503).json({ error: "The backup interviewer isn't configured." });
  if (!allow(`backup:${req.ip}`, 200, HOUR) || !allow("backup:all", 1500, DAY)) {
    return res.status(429).json({ error: "Turn limit reached. Try again later." });
  }
  const { role, posting, turns } = req.body ?? {};
  if (!role || !Array.isArray(turns) || !turns.length) return res.status(400).json({ error: "No answer to score." });
  const transcript = turns
    .slice(-8)
    .map((t) => `Tock: ${clip(t.q, 300)}\nUser: ${clip(t.a, 600)}`)
    .join("\n");
  try {
    const r = await fetch(BACKUP.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${BACKUP.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BACKUP.model,
        max_tokens: 220,
        temperature: 0.7,
        messages: [
          { role: "system", content: backupPrompt(clip(role, 80), clip(posting, 4000) || "none") },
          { role: "user", content: `${transcript}\n\nScore the user's last answer and ask your next question. JSON only.` },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`the backup model returned ${r.status}`);
    const text = (await r.json()).choices?.[0]?.message?.content ?? "";
    const j = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    res.json({
      delta: Math.max(-10, Math.min(30, Math.round(Number(j.delta) || 0))),
      reason: clip(j.reason, 60),
      better: clip(j.better, 200),
      reply: clip(String(j.reply ?? "").replace(/\[[^\]]*\]/g, "").trim(), 240),
    });
  } catch (err) {
    console.error("backup turn failed:", err.message);
    res.status(502).json({ error: "The backup interviewer didn't answer." });
  }
});

// A backup round's report is saved under its round ID, so the verdict screen fetches it like any other.
app.post("/api/backup/report", (req, res) => {
  const { id, report, bluffs } = req.body ?? {};
  if (!/^backup-[a-z0-9-]{6,40}$/.test(id ?? "")) return res.status(400).json({ error: "Unknown round." });
  if (!allow(`report:${req.ip}`, 60, HOUR)) return res.status(429).json({ error: "Too many reports." });
  reports.set(id, { status: "done", report: clip(report, 2000) || null, bluffs: Number(bluffs) || 0 });
  if (reports.size > 500) reports.delete(reports.keys().next().value);
  res.json({ saved: true });
});

// Sends the offer (passed) or the rejection (clocked) from the recruiter inbox, once per round.
app.post("/api/result-email", async (req, res) => {
  if (!mail) return res.status(503).json({ error: "Email isn't configured yet." });
  const { email, role, verdict, report, conversationId } = req.body ?? {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "") || !role || !["passed", "clocked"].includes(verdict)) {
    return res.status(400).json({ error: "Enter a valid email." });
  }
  if (!conversationId || emailedRounds.has(conversationId)) {
    return res.status(409).json({ error: "This round's email has already been sent." });
  }
  if (!allow(`email:${req.ip}`, LIMITS.emailsPerAddressPerDay, DAY) || !allow("email:all", LIMITS.emailsPerDay, DAY)) {
    return res.status(429).json({ error: "Email limit reached for today." });
  }
  try {
    await sendResultEmail(mail, AGENTBOXD_INBOX_ID, { email, role: String(role).slice(0, 80), verdict, report });
    emailedRounds.add(conversationId);
    if (verdict === "passed") wakeRecruiter(mail, AGENTBOXD_INBOX_ID);
    res.json({ sent: true });
  } catch (err) {
    console.error("send failed:", err.message);
    res.status(502).json({ error: "The email didn't send. Try again in a minute." });
  }
});

// Express 5 also calls this when listening fails (for example, the port is taken), so say why and stop.
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Clocked couldn't start: ${err.message}`);
    process.exit(1);
  }
  console.log(`Clocked on http://localhost:${PORT}`);
});
