// Tick, the stopwatch mascot, and a help chat that answers from a small knowledge base on the page.
// No AI model is called, so a question costs no tokens, credits or network requests.

// Tick is drawn with SVG gradients for a 3D look: a domed face, a lit lime rim, glossy eyes and soft blush.
// Each copy gets its own id prefix: Chrome won't paint a gradient defined inside a hidden element,
// so 2 copies sharing ids would break the visible one while the chat panel is closed.
export const tickSvg = (p) => `
<svg class="tick" viewBox="0 0 120 134" aria-hidden="true">
  <defs>
    <radialGradient id="${p}-rim" cx="35%" cy="28%" r="78%">
      <stop offset="0" stop-color="#fbffc4"/><stop offset="0.45" stop-color="#e9ff5c"/><stop offset="1" stop-color="#8da11a"/>
    </radialGradient>
    <radialGradient id="${p}-face" cx="40%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f6f2e8"/><stop offset="1" stop-color="#d4cdbd"/>
    </radialGradient>
    <linearGradient id="${p}-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#bdb6a6"/>
    </linearGradient>
    <radialGradient id="${p}-eye" cx="42%" cy="34%" r="70%">
      <stop offset="0" stop-color="#3d3d4c"/><stop offset="0.7" stop-color="#121218"/><stop offset="1" stop-color="#000"/>
    </radialGradient>
    <radialGradient id="${p}-blush">
      <stop offset="0" stop-color="#ff6f9c" stop-opacity="0.95"/><stop offset="1" stop-color="#ff6f9c" stop-opacity="0"/>
    </radialGradient>
    <filter id="${p}-drop" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#${p}-drop)">
    <rect x="48" y="4" width="24" height="14" rx="6" fill="url(#${p}-metal)" stroke="#0b0b0f" stroke-width="2.5"/>
    <rect x="55" y="16" width="10" height="10" fill="url(#${p}-metal)" stroke="#0b0b0f" stroke-width="2.5"/>
    <rect x="92" y="27" width="17" height="11" rx="5" fill="url(#${p}-metal)" stroke="#0b0b0f" stroke-width="2.5" transform="rotate(45 100 32)"/>
    <circle cx="60" cy="78" r="50" fill="url(#${p}-rim)" stroke="#0b0b0f" stroke-width="2.5"/>
    <path d="M20 66A41 41 0 0 1 50 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <circle cx="60" cy="78" r="40" fill="url(#${p}-face)" stroke="#0b0b0f" stroke-width="2.5"/>
    <circle cx="60" cy="78" r="36.5" fill="none" stroke="#000" stroke-width="5" opacity="0.07"/>
  </g>
  <g stroke="#0b0b0f" stroke-width="2.5" stroke-linecap="round" opacity="0.7">
    <path d="M60 41v4M60 115v-4M23 78h4M97 78h-4"/>
  </g>
  <g class="hands" stroke-linecap="round">
    <line class="hHour" x1="60" y1="78" x2="60" y2="61" stroke="#0b0b0f" stroke-width="4.5" opacity="0.85"/>
    <line class="hMin" x1="60" y1="78" x2="60" y2="50" stroke="#0b0b0f" stroke-width="3" opacity="0.85"/>
    <line class="hSec" x1="60" y1="84" x2="60" y2="46" stroke="#ff2d55" stroke-width="1.8"/>
  </g>
  <g class="eyes">
    <rect x="37" y="63" width="15" height="28" rx="7.5" fill="#0b0b0f"/>
    <rect x="68" y="63" width="15" height="28" rx="7.5" fill="#0b0b0f"/>
    <circle cx="41.5" cy="70" r="3.8" fill="#fff"/>
    <circle cx="72.5" cy="70" r="3.8" fill="#fff"/>
    <circle cx="48" cy="84" r="1.7" fill="#fff" opacity="0.9"/>
    <circle cx="79" cy="84" r="1.7" fill="#fff" opacity="0.9"/>
  </g>
  <circle cx="60" cy="78" r="3" fill="#ff2d55" stroke="#0b0b0f" stroke-width="1.2"/>
  <ellipse cx="31" cy="95" rx="10" ry="6" fill="url(#${p}-blush)"/>
  <ellipse cx="89" cy="95" rx="10" ry="6" fill="url(#${p}-blush)"/>
  <ellipse cx="47" cy="53" rx="15" ry="6.5" fill="#fff" opacity="0.5" transform="rotate(-24 47 53)"/>
</svg>`;

// Each entry: phrases and words to match, and the answer. Phrases score 2, single words 1.
const KB = [
  {
    keys: ["hi", "hello", "hey", "who are you", "your name", "tick", "mascot"],
    a: "Hey, I'm Tick, the stopwatch who keeps time in the interrogation room. Tock runs the interrogation; I'm on your side, no cap. Ask me how to play or what happens to your voice.",
  },
  {
    keys: ["tock", "interviewer", "interrogator", "who is the interviewer", "orb", "costume", "props"],
    a: "That's Tock, my counterpart: the speaking orb running your interrogation. Tock sets out props for whatever role you claim, pulses when it talks and glows hotter the more sus you sound.",
  },
  {
    keys: ["play", "start", "begin", "rules", "game", "instructions", "enter the room", "how does it work", "what do i do"],
    a: "Pick a role you're not, or type any role, then click Enter the room and allow your mic. An interrogator questions you for 45 seconds. Hold Space, or the Hold to answer button, while you talk; your mic stays muted otherwise, so voices around you don't count. You've got this.",
  },
  {
    keys: ["meter", "score", "scoring", "sus", "points", "percent", "ring", "bar", "measuring", "dead air", "silence"],
    a: "After each answer, the interrogator logs a note. A bluff adds 5 to 35 points, and a specific, correct answer takes off up to 15. Dead air costs 15 too, so hold to answer when it's your turn. Hit 60% from your 2nd answer on and you're clocked on the spot. Lowkey brutal, I know.",
  },
  {
    keys: ["mic", "microphone", "record", "recording", "recorded", "listening", "rec", "audio", "voice", "privacy", "private", "data", "stored", "store", "save", "saved"],
    a: "Your mic only opens while you hold Space or the Hold to answer button, and the corner light reads REC only during a live round. Your voice goes to ElevenLabs to run the interrogator, and ElevenLabs keeps the call record your report comes from. If the backup interviewer takes the round, your browser's speech recognition turns your answer into text (Chrome uses Google's service for that), and only the text goes to the backup's AI model. Clocked's server has no database. If you ask for an email, your address is held in memory only for the salary negotiation. Full transparency, no cap.",
  },
  {
    keys: ["report", "bluff report", "notes", "panel notes", "feedback", "verdict"],
    a: "When the round ends, ElevenLabs reads the transcript and lists up to 3 moments where you bluffed, each with what an actual pro would have said. Think of it as free coaching.",
  },
  {
    keys: ["email", "offer", "rejection", "letter", "inbox", "negotiate", "negotiation", "salary", "recruiter"],
    a: "On the verdict screen you can get an email from clocked-recruiter@homingbox.net: an offer if you passed, a rejection letter if you were clocked. Reply to an offer with a number and the recruiter negotiates, up to 3 replies. Shoot your shot.",
  },
  {
    keys: ["role", "roles", "job", "posting", "job posting", "custom", "any role", "character", "cover"],
    a: "Pick one of the 5 covers, including the Bill Gates wildcard, or type anyone: a role like astronaut or any famous person. Famous people get questions about their public career only. Paste a job posting to get questions about its requirements. Main character energy only.",
  },
  {
    keys: ["tips", "tip", "pass", "win", "beat", "advice", "trick", "help me", "survive"],
    a: "Be specific: name actual tools and numbers, and use the jargon correctly. Hedges like \"basically\" and buzzwords like \"synergy\" push the meter up. Keep it short and confident. I believe in you.",
  },
  {
    keys: ["bluff", "bluffs", "bluffing", "what is a bluff", "what counts as a bluff"],
    a: "A bluff is an answer that fakes expertise: vague, buzzword-heavy, wrong, dodging the question or made up. Each one adds 5 to 35 points. Dead air isn't a bluff, but it still costs 15, so hold to answer and speak up. You've got this.",
  },
  {
    keys: ["what does a", "what does an", "what do", "what is a", "what's a", "how to sound", "how do i sound", "cheat", "cheat sheet", "answers", "teach me", "explain"],
    a: "No cheat sheets, bestie. Bluffing is the whole game. One tip though: name one actual tool and one number, and you'll sound way more legit.",
  },
  {
    keys: ["time", "timer", "seconds", "45", "long", "duration", "stopwatch"],
    a: "Each round lasts 45 seconds. The timer starts once the interrogator connects, and the round ends on its own at zero. Trust me, I'm a stopwatch.",
  },
  {
    keys: ["again", "retry", "another", "replay", "restart", "new role"],
    a: "Click Claim another identity on the verdict screen to pick a new role. Run it back!",
  },
  {
    keys: ["built", "tech", "stack", "made with", "elevenlabs", "agentboxd", "render", "three", "orb", "sponsor", "api"],
    a: "The voice interrogator, its live meter tool and the post-call report run on ElevenLabs Agents. If ElevenLabs can't take a call, a backup interviewer takes over on Google's Gemini. Agentboxd gives the recruiter an inbox, Render hosts the app, and the orb is drawn with Three.js.",
  },
  {
    keys: ["who built", "who made", "creator", "author", "sophia", "team", "developer"],
    a: "Sophia Ize-Iyamu built Clocked solo at LarpHacks 2026 in Toronto. Big respect.",
  },
  {
    keys: ["clocked mean", "what does clocked", "meaning", "why clocked", "larp", "larphacks", "theme"],
    a: "To get clocked is to be seen through. LARP means live-action role play, and LarpHacks asked for a product that helps you LARP as someone you're not.",
  },
  {
    keys: ["cost", "free", "price", "pay", "account", "sign up", "login", "limit"],
    a: "Clocked is free and needs no account. Each round uses about a minute of the creator's ElevenLabs credits, so rounds have a daily limit.",
  },
  {
    keys: ["thanks", "thank you", "thx", "cool", "nice", "love"],
    a: "Anytime! Go get that PASSED stamp.",
  },
];
const FALLBACK = "That one's outside my stopwatch, sorry! I only know Clocked and the interrogation room. Try asking how to play or what happens to your voice.";
const CHIPS = ["How do I play?", "Is my mic recorded?", "How do I pass?", "Who built this?"];

function answer(question) {
  const q = question.toLowerCase();
  const words = q.replace(/[^a-z0-9%\s]/g, " ").split(/\s+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const item of KB) {
    let score = 0;
    for (const key of item.keys) {
      if (key.includes(" ")) score += q.includes(key) ? 2 : 0;
      else if (words.includes(key)) score += 1;
    }
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best ? best.a : FALLBACK;
}

// Tick's hands show the visitor's own clock. One update a second across every copy of Tick;
// browsers slow the timer down in background tabs, so it costs next to nothing.
function setHands() {
  const now = new Date();
  const sec = now.getSeconds();
  const min = now.getMinutes() + sec / 60;
  const hour = (now.getHours() % 12) + min / 60;
  for (const svg of document.querySelectorAll(".tick")) {
    svg.querySelector(".hHour")?.setAttribute("transform", `rotate(${hour * 30} 60 78)`);
    svg.querySelector(".hMin")?.setAttribute("transform", `rotate(${min * 6} 60 78)`);
    svg.querySelector(".hSec")?.setAttribute("transform", `rotate(${sec * 6} 60 78)`);
  }
}

export function initChat() {
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chatLauncher";
  launcher.setAttribute("aria-label", "Ask Tick, the Clocked helper");
  launcher.innerHTML = `${tickSvg("tickL")}<span class="chatHint">Ask Tick</span>`;

  const panel = document.createElement("section");
  panel.className = "chatPanel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Chat with Tick");
  panel.innerHTML = `
    <header class="chatHead">
      <span class="chatFace">${tickSvg("tickH")}</span>
      <div><b>Tick</b><small class="mono">Instant answers, no AI calls</small></div>
      <button type="button" class="chatClose" aria-label="Close chat">×</button>
    </header>
    <ol class="chatLog" aria-live="polite"></ol>
    <div class="chatChips"></div>
    <form class="chatForm">
      <input type="text" maxlength="200" placeholder="Ask Tick anything about Clocked" aria-label="Your question">
      <button type="submit" aria-label="Send">➜</button>
    </form>`;
  document.body.append(panel, launcher);
  setHands();
  setInterval(setHands, 1000);

  const log = panel.querySelector(".chatLog");
  const input = panel.querySelector("input");
  const say = (who, text) => {
    const li = document.createElement("li");
    li.className = who;
    li.textContent = text;
    log.append(li);
    log.scrollTop = log.scrollHeight;
    return li;
  };
  const ask = (question) => {
    if (!question.trim()) return;
    say("me", question.trim());
    const typing = say("bot typing", "...");
    setTimeout(() => {
      typing.classList.remove("typing");
      typing.textContent = answer(question);
      log.scrollTop = log.scrollHeight;
    }, 450);
  };

  const chips = panel.querySelector(".chatChips");
  for (const text of CHIPS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = text;
    chip.addEventListener("click", () => ask(text));
    chips.append(chip);
  }

  let greeted = false;
  const toggle = (open) => {
    panel.hidden = !open;
    launcher.classList.toggle("open", open);
    if (open && !greeted) {
      greeted = true;
      say("bot", KB[0].a);
    }
    if (open) input.focus();
  };
  launcher.addEventListener("click", () => toggle(panel.hidden));
  panel.querySelector(".chatClose").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) toggle(false);
  });
  panel.querySelector(".chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });
}
