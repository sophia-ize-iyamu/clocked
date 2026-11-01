import { initCursor } from "./cursor.js";
import { initChat } from "./chat.js";
import { costumeFor, fitCostume } from "./costume.js";
import { backupSupported, startBackupSession } from "./backup.js";

// The voice SDK (73 KB) and the 3D orb (Three.js, 392 KB) load only when someone is about to play:
// fetching starts when a role is picked, so they're usually ready by the time Enter is clicked.
let modules = null;
let Conversation = null;
let createOrb = null;
let createPolygraph = null;
const loadModules = () =>
  (modules ??= Promise.all([
    import("https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.32.1/+esm"),
    import("./visuals.js"),
  ]).then(([voice, visuals]) => {
    Conversation = voice.Conversation;
    createOrb = visuals.createOrb;
    createPolygraph = visuals.createPolygraph;
  }));

const heatColor = (heat) => (heat >= 0.6 ? "#ff2d55" : heat >= 0.3 ? "#ffb020" : "#5ee7ff");

const ROUND_SECONDS = 45;
const CLOCKED_AT = 60;
// Hedges and buzzwords. Used only if the agent's meter tool never fires during a round.
const TELLS = /\b(um+|uh+|basically|kind of|sort of|synergy|leverage|agentic|disrupt\w*|paradigm|holistic|world-class|best-in-class|at the end of the day|you know|i mean|honestly|literally)\b/gi;

const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const article = (word) => (/^[aeiou]/i.test(word) ? "an" : "a");
// Restarts a CSS animation class (all motion lives in styles.css).
const replay = (el, cls) => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};
const setRec = (live) => {
  $("rec").dataset.state = live ? "live" : "standby";
  $("recText").textContent = live ? "REC" : "STANDBY";
};

let role = "";
let meter = 0;
let bluffs = 0;
let conversation = null;
let conversationId = null;
let timerId = null;
let elapsed = 0;
let clockedAt = null;
let toolCalls = 0;
let userTurns = 0;
let finished = true;
let verdict = "";
let reportText = "";
let orb = null;
let poly = null;
let lastConversationId = null;
let clockPending = false;
let verdictPending = false;
let verdictSpeaks = 0;
let mode = "listening";
let agentSpoke = false;
let listenStart = 0;
let micUsedThisTurn = false;
let deadAir = 0;
let awaitingScore = false; // an answer finished but the interviewer hasn't scored it yet
let callOptions = null; // the round's call settings, reused if the backup interviewer takes over
let backupOn = null;
let failedOver = false; // the backup interviewer has taken this round

// ?preview=live or ?preview=result plays a scripted round with no call, for checking visuals.
const preview = new URLSearchParams(location.search).get("preview");

const volume = (method) => {
  if (!conversation && preview) return (Math.sin(performance.now() / 170) * 0.5 + 0.5) * 0.35;
  try {
    return conversation ? Number(conversation[method]?.() ?? 0) || 0 : 0;
  } catch {
    return 0;
  }
};

function show(id) {
  for (const s of ["setup", "live", "result"]) $(s).hidden = s !== id;
  replay($(id), "enter");
}

function pickRole(value, card) {
  role = value.trim();
  if (role) loadModules().catch(() => (modules = null));
  document.querySelectorAll(".role").forEach((c) => c.classList.toggle("on", c === card));
  $("start").disabled = !role;
}

document.querySelectorAll(".role").forEach((card) =>
  card.addEventListener("click", () => {
    $("role").value = "";
    roleFromPosting = false;
    // Clicking the selected card again unselects it, and a pasted job posting takes over.
    if (card.classList.contains("on")) {
      pickRole("", null);
      useTitleFromPosting();
      return;
    }
    pickRole(card.dataset.role, card);
  }),
);
let roleFromPosting = false;
$("role").addEventListener("input", () => {
  roleFromPosting = false;
  pickRole($("role").value, null);
});

// A pasted job posting sets the cover: its title fills the role box, so the interview follows the posting.
const NOT_A_TITLE = /^(back to|about|job description|description|overview|summary|responsibilities|requirements|qualifications|minimum|preferred|who we are|the role|the opportunity|company|location|apply|share|save|note)\b/i;
const TITLE_WORD = /\b(manager|engineer|developer|analyst|designer|scientist|director|lead|head|specialist|consultant|associate|intern|coordinator|officer|architect|administrator|representative|assistant|researcher|strategist|producer|writer|editor|nurse|teacher|technician|advisor|accountant|recruiter|owner|vp|president|chef|planner)\b/i;
function titleFrom(text) {
  const labelled = text.match(/^\s*(?:job title|title|position|role)\s*[:\u2013-]\s*(.{3,80})$/im)?.[1].trim();
  const head = text.split(/\r?\n/).map((l) => l.replace(/^[#*\u2022\s-]+|[*\s]+$/g, "")).filter(Boolean).slice(0, 8);
  const short = head.filter((l) => l.length <= 90 && l.split(/\s+/).length <= 12 && !/[.!?:]$/.test(l) && !NOT_A_TITLE.test(l));
  const hiring = text.match(/(?:hiring|looking for|seeking)\s+(?:an?\s+)?([a-z][\w\s/&-]{2,50}?)(?=\s+(?:to|who|with|for|that|in|at|on|and)\b|[.,;:!\n]|$)/i)?.[1].trim();
  const title = labelled ?? short.find((l) => TITLE_WORD.test(l)) ?? hiring ?? short[0] ?? "";
  // "Business Development Manager, New Business Sales" becomes "Business Development Manager".
  const main = title.split(/\s*[,(|\u2013\u2014]\s*|\s+-\s+/)[0];
  return (main.split(/\s+/).length >= 2 ? main : title).slice(0, 80);
}
// Postings end in legal boilerplate; dropping it keeps the interviewer's prompt short.
const BOILERPLATE = /equal (employment )?opportunity|affirmative action|privacy policy|accommodation|\bEEO\b|know your rights|^back to|^(corporate_fare|place|info_outline|x|share|save|apply)$/i;
const condense = (text) => text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !BOILERPLATE.test(l)).join("\n").slice(0, 4000);

function useTitleFromPosting() {
  if ($("role").value.trim() && !roleFromPosting) return; // a role the user typed wins
  const title = titleFrom($("posting").value);
  if (!title) return;
  $("role").value = title;
  roleFromPosting = true;
  pickRole(title, null);
}
$("posting").addEventListener("input", useTitleFromPosting);
if ($("posting").value.trim()) useTitleFromPosting(); // a posting the browser restored on reload

function setMeter(value) {
  meter = Math.max(0, Math.min(100, value));
  const heat = meter / 100;
  document.documentElement.style.setProperty("--heat", heatColor(heat));
  $("meterNum").textContent = String(Math.round(meter));
  $("meterBar").style.width = `${meter}%`;
  orb?.setHeat(heat);
  if (meter >= CLOCKED_AT && clockedAt === null) clockedAt = elapsed;
}

function addNote(delta, reason) {
  const li = document.createElement("li");
  li.className = delta > 0 ? "bad" : "good";
  const badge = document.createElement("b");
  badge.textContent = `${delta > 0 ? "+" : ""}${delta}`;
  li.append(badge, reason || "Noted.");
  $("notes").prepend(li);
  while ($("notes").children.length > 3) $("notes").lastElementChild.remove();
  poly?.mark(reason || "", delta);
  if (delta >= 20) {
    orb?.pulse();
    replay(document.querySelector(".stage"), "shake");
  }
}

// Dead air raises the meter but isn't a bluff, so it's counted separately.
function bump(delta, reason, silent = false) {
  if (verdictPending || finished) return; // the verdict is final once it's been sent
  const d = Math.round(Number(delta) || 0);
  if (!silent) awaitingScore = false;
  if (silent) deadAir += 1;
  else if (d > 0) bluffs += 1;
  setMeter(meter + d);
  addNote(d, reason);
  // Clocked ends the round on the spot, from the 2nd answer on, so one harsh score can't end it early.
  // The short pause lets the meter fill to the line before the stamp.
  if (meter >= CLOCKED_AT && userTurns >= 2 && conversation && !finished && !clockPending) {
    clockPending = true;
    $("status").textContent = "Clocked";
    setTimeout(() => deliverVerdict("clocked"), 700);
  }
}

function caption(who, text) {
  if (!text) return;
  const li = document.createElement("li");
  const name = document.createElement("b");
  name.textContent = `${who}: `;
  li.append(name, text);
  $("captions").append(li);
  while ($("captions").children.length > 2) $("captions").firstElementChild.remove();
}

function onMessage(m) {
  const text = m?.message ?? m?.text ?? "";
  const source = m?.source ?? m?.role ?? "";
  if (source === "user") {
    if (text.startsWith("[VERDICT")) return;
    if (!/[a-z0-9]/i.test(text)) return; // a silent turn comes through as "..."
    userTurns += 1;
    awaitingScore = true;
    caption("You", text);
    // If the meter tool hasn't fired at all, score this answer's hedges a few seconds later.
    setTimeout(() => {
      if (toolCalls === 0 && !finished) {
        const tells = (text.match(TELLS) ?? []).length;
        if (tells) bump(12 * tells, `Hedging x${tells}`);
      }
    }, 4000);
  } else if (text) {
    // Expressive voices take delivery cues in brackets, like [dry] or [sighs]; those are performed, not shown.
    const spoken = text.replace(/\[[^\]]*\]\s*/g, "").trim();
    if (spoken) $("question").textContent = spoken;
  }
}

// Push-to-talk: the mic stays muted unless Space or the Hold to answer button is held,
// so voices around you in a busy room can't count as your answers.
function setMic(open) {
  const live = Boolean(conversation) && !finished && !verdictPending;
  const on = open && live;
  if (on) micUsedThisTurn = true;
  try {
    conversation?.setMicMuted(!on);
  } catch (err) {
    console.error(err);
  }
  $("talk").classList.toggle("on", on);
  $("talk").setAttribute("aria-pressed", String(on));
  $("talkText").textContent = on ? "Listening" : "Hold to answer";
}

function startTimer() {
  elapsed = 0;
  const render = () => {
    const left = Math.max(0, ROUND_SECONDS - elapsed);
    $("timer").textContent = `0:${String(left).padStart(2, "0")}`;
    $("timer").classList.toggle("low", left <= 10);
  };
  render();
  timerId = setInterval(() => {
    elapsed += 1;
    render();
    if (elapsed >= ROUND_SECONDS) finalCall();
  }, 1000);
}

// At time-up, an answer that just finished gets up to 6 seconds to be scored before the verdict is decided.
function finalCall() {
  clearInterval(timerId);
  timerId = null;
  setMic(false);
  const decide = () => deliverVerdict(meter >= CLOCKED_AT ? "clocked" : "passed");
  if (!awaitingScore) {
    decide();
    return;
  }
  $("status").textContent = "Scoring your last answer";
  const started = Date.now();
  const wait = setInterval(() => {
    if (finished || verdictPending) {
      clearInterval(wait);
      return;
    }
    if (!awaitingScore || Date.now() - started > 6000) {
      clearInterval(wait);
      decide();
    }
  }, 300);
}

// The interviewer speaks the verdict in one sentence, then the call ends. If no reply comes,
// a 9-second backstop ends the call anyway.
function deliverVerdict(kind) {
  if (verdictPending || finished) return;
  clearInterval(timerId);
  timerId = null;
  if (!conversation) {
    endRound();
    return;
  }
  setMic(false);
  verdictPending = true;
  verdictSpeaks = 0;
  $("status").textContent = kind === "clocked" ? "Clocked" : "Verdict";
  try {
    conversation.sendUserMessage(
      `[VERDICT ${kind}] Final decision: the user ${kind === "clocked" ? "is clocked" : "passed"}. Say one sentence in character that matches it.`,
    );
  } catch {
    endRound();
    return;
  }
  setTimeout(() => {
    if (!finished) endRound();
  }, 9000);
}

async function endRound() {
  clearInterval(timerId);
  timerId = null;
  if (conversation) {
    const c = conversation;
    try {
      await c.endSession();
    } catch (err) {
      console.error(err);
    }
  }
  finish();
}

async function start() {
  $("start").disabled = true;
  $("setupNote").textContent = "";
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $("setupNote").textContent = "Allow microphone access, then try again.";
    $("start").disabled = false;
    return;
  }

  let signedUrl;
  try {
    await loadModules();
    const r = await fetch("/api/signed-url");
    const body = await r.json();
    if (!r.ok) throw new Error(body.error);
    signedUrl = body.signedUrl;
  } catch (err) {
    modules = modules && Conversation ? modules : null;
    $("setupNote").textContent = `The call didn't start: ${err.message}`;
    $("start").disabled = false;
    return;
  }

  finished = false;
  clockPending = false;
  verdictPending = false;
  verdictSpeaks = 0;
  agentSpoke = false;
  deadAir = 0;
  awaitingScore = false;
  failedOver = false;
  listenStart = 0;
  micUsedThisTurn = false;
  toolCalls = 0;
  userTurns = 0;
  bluffs = 0;
  clockedAt = null;
  elapsed = 0;
  conversationId = null;
  conversation = null;
  $("captions").replaceChildren();
  $("notes").replaceChildren();
  $("question").textContent = "";
  $("claim").textContent = role;
  $("timer").textContent = `0:${ROUND_SECONDS}`;
  $("status").textContent = "Connecting";
  orb ??= createOrb($("orb"), () => volume("getOutputVolume"));
  poly ??= createPolygraph($("poly"), () => volume("getInputVolume"), () => meter / 100);
  orb.resume();
  orb.setPass(false);
  $("costume").innerHTML = costumeFor(role);
  setMeter(0);
  show("live");
  fitCostume($("costume")); // sizing the items needs the stage on screen
  document.activeElement?.blur(); // so Space talks instead of pressing a focused button
  poly.start();

  callOptions = {
    signedUrl,
    dynamicVariables: {
      role,
      role_title: role.charAt(0).toUpperCase() + role.slice(1),
      posting: condense($("posting").value) || "none",
    },
    clientTools: {
      update_meter: async ({ delta, reason }) => {
        toolCalls += 1;
        bump(delta, reason);
        return "ok";
      },
    },
    onConnect: () => {
      setMic(false);
      $("status").textContent = "Live";
      setRec(true);
      startTimer();
    },
    onDisconnect: (details) => {
      clearInterval(timerId);
      // A call that drops before the interviewer says a word never really started, so say why and stay on setup.
      if (details?.reason !== "user" && !agentSpoke && !userTurns) {
        callFailed(details?.message || details?.context?.reason || "the line dropped");
        return;
      }
      finish();
    },
    onError: (err) => console.error("call error:", err),
    onModeChange: ({ mode: next }) => {
      mode = next;
      if (verdictPending) {
        // End once the verdict line has been spoken and the interviewer falls silent.
        if (next === "speaking") verdictSpeaks += 1;
        else if (verdictSpeaks > 0) setTimeout(endRound, 400);
        return;
      }
      if (next === "listening") {
        listenStart = Date.now();
        micUsedThisTurn = false;
      } else if (next === "speaking") {
        if (agentSpoke && listenStart && !micUsedThisTurn && Date.now() - listenStart > 2500) bump(15, "Dead air, very sus", true);
        agentSpoke = true;
        listenStart = 0;
      }
      $("status").textContent = next === "speaking" ? "Interrogator speaking" : "Your turn: hold to answer";
    },
    onMessage,
  };
  try {
    const session = await Conversation.startSession(callOptions);
    // The call may have dropped while connecting and already been handed to the backup, or the round ended.
    if (conversation || finished || failedOver) {
      session.endSession().catch(() => {});
      return;
    }
    conversation = session;
    conversationId = session.getId();
    setMic(false);
  } catch (err) {
    console.error(err);
    callFailed(err.message);
  }
}

// The backup interviewer needs a Featherless key on the server and a browser that can speak and listen.
const backupReady = () => {
  if (!backupSupported()) return Promise.resolve(false);
  backupOn ??= fetch("/api/health")
    .then((r) => r.json())
    .then((h) => Boolean(h.backup))
    .catch(() => false);
  return backupOn;
};

async function startBackup() {
  $("status").textContent = "Switching to the backup interviewer";
  try {
    const session = await startBackupSession(callOptions);
    if (finished) {
      session.endSession();
      return;
    }
    conversation = session;
    conversationId = session.getId();
    setMic(false);
  } catch (err) {
    console.error(err);
    failedOver = false;
    callFailed(err.message);
  }
}

async function callFailed(reason) {
  if (failedOver) return; // the backup interviewer already has this round
  // Out of voice credits: Featherless takes the call, so the round still plays.
  if (/quota|credits/i.test(reason) && !finished && !conversation) {
    failedOver = true;
    if (await backupReady()) {
      startBackup();
      return;
    }
    failedOver = false;
  }
  finished = true;
  conversation = null;
  setRec(false);
  poly?.stop();
  show("setup");
  $("setupNote").textContent = /quota|credits/i.test(reason)
    ? "The interviewer is out of voice credits right now. Try again later."
    : `The call didn't start: ${reason}`;
  $("start").disabled = false;
}

function slam() {
  const tint = verdict === "clocked" ? "var(--hot)" : "var(--pass)";
  $("flash").style.background = `radial-gradient(circle, transparent 30%, ${tint} 120%)`;
  replay($("stamp"), "slam");
  replay($("flash"), "go");
  replay($("case"), "jolt");
}

function typeOut(el, text) {
  if (!motion) {
    el.textContent = text;
    return;
  }
  el.textContent = "";
  let i = 0;
  const step = () => {
    i += 3;
    el.textContent = text.slice(0, i);
    if (i < text.length) setTimeout(step, 14);
  };
  step();
}

function finish() {
  if (finished) return;
  finished = true;
  setRec(false);
  poly?.stop();
  const id = conversationId ?? conversation?.getId?.();
  lastConversationId = id;
  conversation = null;
  verdict = meter >= CLOCKED_AT || userTurns === 0 ? "clocked" : "passed";
  orb?.setPass(verdict === "passed");
  orb?.pause(); // the orb isn't on the verdict screen, so stop rendering it

  $("caseDate").textContent = new Date()
    .toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
  $("factRole").textContent = role;
  // With no finished answer there's nothing to time, so the card says so instead of guessing.
  const noAnswer = userTurns === 0;
  $("factTimeLabel").textContent = noAnswer ? "Answers logged" : verdict === "clocked" ? "Time to clock" : "Survived";
  $("factTime").textContent = noAnswer
    ? "None"
    : verdict === "clocked"
      ? `${clockedAt ?? elapsed} seconds`
      : `${elapsed || ROUND_SECONDS} seconds`;
  $("factMeter").textContent = `${Math.round(meter)}% sus`;
  $("factBluffs").textContent = String(bluffs);
  $("stamp").textContent = verdict === "clocked" ? "CLOCKED" : "PASSED";
  $("stamp").dataset.verdict = verdict;
  $("verdictLine").textContent =
    noAnswer
      ? deadAir > 0
        ? `You stayed silent for ${deadAir} turn${deadAir === 1 ? "" : "s"}, and silence counts as a tell.`
        : "The panel didn't hear a finished answer, and silence counts as a tell."
      : verdict === "clocked"
        ? `Clocked as a fake ${role} in ${clockedAt ?? elapsed} seconds.`
        : `The panel believed you're ${article(role)} ${role}.`;
  $("emailLabel").textContent = verdict === "passed" ? "Get your offer by email" : "Get your rejection letter";
  $("emailNote").textContent = "";
  setSendButton("ready");
  $("report").textContent = "Writing your report.";
  reportText = "";
  show("result");
  slam();
  if (id) pollReport(id);
  else $("report").textContent = "No report this round.";
}

// Post-call analysis usually takes a few seconds. Backing off checks at most 7 times in about
// 30 seconds instead of every 2.5 seconds; the server caches finished reports.
async function pollReport(id) {
  for (const wait of [1500, 2000, 3000, 4000, 5000, 6000, 8000]) {
    await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await fetch(`/api/report/${encodeURIComponent(id)}`);
      if (!r.ok) continue;
      const body = await r.json();
      if (body.status === "done" || body.report) {
        reportText = body.report || "";
        const none =
          userTurns === 0
            ? "No answers to review. Next round, hold Space or the Hold to answer button while you talk."
            : verdict === "passed"
              ? "No bluffs on record. You were convincing."
              : "The panel didn't leave notes this round.";
        typeOut($("report"), reportText || none);
        return;
      }
    } catch (err) {
      console.error(err);
    }
  }
  $("report").textContent = "The report didn't arrive in time.";
}

$("start").addEventListener("click", start);
const talk = $("talk");
talk.addEventListener("pointerdown", (e) => {
  talk.setPointerCapture?.(e.pointerId);
  setMic(true);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) talk.addEventListener(ev, () => setMic(false));
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.repeat || $("live").hidden || e.target.closest("input, textarea")) return;
  e.preventDefault();
  setMic(true);
});
window.addEventListener("keyup", (e) => {
  if (e.code !== "Space" || $("live").hidden || e.target.closest("input, textarea")) return;
  e.preventDefault(); // stops Space from also pressing whichever button has focus
  setMic(false);
});
$("stop").addEventListener("click", endRound);
$("again").addEventListener("click", () => {
  show("setup");
  $("start").disabled = !role;
});

// The button shows Sending, then a green Sent, and stays disabled, so one round can't send twice.
function setSendButton(state) {
  const btn = $("sendBtn");
  btn.textContent = { ready: "Send it", sending: "Sending", sent: "Sent" }[state];
  btn.disabled = state !== "ready";
  btn.classList.toggle("sent", state === "sent");
}

$("emailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setSendButton("sending");
  $("emailNote").textContent = "";
  try {
    const r = await fetch("/api/result-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("email").value, role, verdict, report: reportText, conversationId: lastConversationId }),
    });
    const body = await r.json();
    if (!r.ok && r.status !== 409) throw new Error(body.error);
    setSendButton("sent");
    $("emailNote").textContent =
      verdict === "passed" ? "Check your inbox, then reply to negotiate your salary." : "Check your inbox.";
  } catch (err) {
    setSendButton("ready");
    $("emailNote").textContent = err.message;
  }
});

// Closing or leaving the tab mid-round ends the call, so no one pays for an abandoned session.
window.addEventListener("pagehide", () => {
  if (conversation) conversation.endSession().catch(() => {});
});

initCursor();
initChat();

if (preview === "live" || preview === "result") {
  await loadModules();
  role = new URLSearchParams(location.search).get("role") || "neurosurgeon";
  finished = false;
  $("claim").textContent = role;
  orb ??= createOrb($("orb"), () => volume("getOutputVolume"));
  poly ??= createPolygraph($("poly"), () => volume("getInputVolume"), () => meter / 100);
  $("costume").innerHTML = costumeFor(role);
  setMeter(0);
  show("live");
  fitCostume($("costume")); // sizing the items needs the stage on screen
  poly.start();
  $("status").textContent = "Your turn";
  $("question").textContent = "Walk me through how you'd close a dural tear.";
  const script = [[28, "Called a scalpel a knife"], [-8, "Knew the Glasgow scale"], [34, "Buzzwords, no specifics"]];
  script.forEach(([d, r], i) => setTimeout(() => bump(d, r), 700 + i * 900));
  if (preview === "result") {
    setTimeout(() => {
      userTurns = 2;
      elapsed = 31;
      finish();
      typeOut($("report"), '- "We mostly use the brain tool": no instrument names.\n- "Recovery is about synergy": buzzwords for a clinical question.');
    }, 3600);
  }
}
