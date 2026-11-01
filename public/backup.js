// Backup interviewer: when ElevenLabs can't take the call (for example, when the account is out of credits),
// Tock runs on a text model instead (Gemini's free tier, or Featherless). The browser speaks Tock's lines and transcribes
// the answers. The session offers the same methods and callbacks as an ElevenLabs one, so the round,
// meter, verdict and report all work the same way.
const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
export const backupSupported = () => Boolean(Recognition && window.speechSynthesis);

const VERDICT_LINES = {
  clocked: "Clocked. Nice try, chief.",
  passed: "Fine. You pass, and that's lowkey impressive.",
};
const NUDGE = "Clock's ticking. Answer the question.";

export async function startBackupSession({ dynamicVariables, clientTools, onConnect, onDisconnect, onModeChange, onMessage }) {
  const { role, role_title: roleTitle, posting } = dynamicVariables;
  const id = `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const turns = []; // { q, a, delta, reason, better }
  let question = `${roleTitle}, is it? Walk me through your last day on the job.`;
  let current = null; // the utterance being spoken; events from cancelled ones are ignored
  let speaking = false;
  let ended = false;
  let muted = true;
  let waitingForAnswer = false;
  let rec = null;
  let nudgeTimer = 0;

  // The mic level drives the voice trace, as it does in a normal call.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audio = new AudioContext();
  audio.resume().catch(() => {});
  const analyser = audio.createAnalyser();
  analyser.fftSize = 512;
  audio.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);

  const pickVoice = () => {
    const voices = speechSynthesis.getVoices();
    return voices.find((v) => /en[-_]US/i.test(v.lang) && /google|natural|aria|jenny|samantha/i.test(v.name)) ?? voices.find((v) => /^en/i.test(v.lang));
  };

  function listen() {
    onModeChange?.({ mode: "listening" });
    waitingForAnswer = true;
    clearTimeout(nudgeTimer);
    // A long silence gets one nudge, which also lets the page count the dead air.
    nudgeTimer = setTimeout(() => {
      if (!ended && muted && waitingForAnswer) say(NUDGE);
    }, 9000);
  }

  function say(text, then = listen) {
    if (ended) return;
    clearTimeout(nudgeTimer);
    onMessage?.({ source: "ai", message: text });
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onstart = () => {
      if (current !== u) return;
      speaking = true;
      onModeChange?.({ mode: "speaking" });
    };
    u.onend = u.onerror = () => {
      if (current !== u) return;
      current = null;
      speaking = false;
      if (!ended) then();
    };
    current = u;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function answer(text) {
    if (ended) return;
    onMessage?.({ source: "user", message: text });
    const turn = { q: question, a: text };
    turns.push(turn);
    let scored = null;
    try {
      const r = await fetch("/api/backup/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, posting, turns: turns.map(({ q, a }) => ({ q, a })) }),
      });
      if (r.ok) scored = await r.json();
    } catch (err) {
      console.error(err);
    }
    if (ended) return;
    if (scored) {
      Object.assign(turn, scored);
      await clientTools.update_meter({ delta: scored.delta, reason: scored.reason || "Noted" });
    }
    question = scored?.reply || "Go on. Be more specific.";
    say(question);
  }

  const session = {
    getId: () => id,
    getOutputVolume: () => (speaking ? (Math.sin(performance.now() / 120) * 0.5 + 0.5) * 0.4 : 0),
    getInputVolume() {
      if (muted) return 0;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / samples.length) * 4);
    },
    // Holding to talk starts a transcription; letting go ends it and sends the answer.
    setMicMuted(next) {
      if (ended || next === muted) return;
      muted = next;
      if (!next) {
        waitingForAnswer = false;
        clearTimeout(nudgeTimer);
        if (speaking) {
          current = null; // talking over Tock cuts the line short
          speaking = false;
          speechSynthesis.cancel();
        }
        const mine = new Recognition();
        let heard = "";
        mine.lang = "en-US";
        mine.continuous = true;
        mine.interimResults = false;
        mine.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i += 1) {
            if (e.results[i].isFinal) heard += `${e.results[i][0].transcript} `;
          }
        };
        mine.onend = () => {
          if (rec === mine) rec = null;
          if (heard.trim()) answer(heard.trim());
          else if (!ended && !speaking) listen();
        };
        rec = mine;
        try {
          mine.start();
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          rec?.stop();
        } catch {
          // already stopped
        }
      }
    },
    sendUserMessage(text) {
      const kind = /\[VERDICT clocked/.test(text) ? "clocked" : "passed";
      say(VERDICT_LINES[kind], () => onModeChange?.({ mode: "listening" }));
    },
    // Ending saves a bluff report built from the panel notes, so the verdict card reads it like any other.
    async endSession() {
      if (ended) return;
      ended = true;
      clearTimeout(nudgeTimer);
      current = null;
      speechSynthesis.cancel();
      try {
        rec?.abort();
      } catch {
        // already stopped
      }
      stream.getTracks().forEach((t) => t.stop());
      audio.close().catch(() => {});
      const bluffs = turns.filter((t) => t.delta > 0);
      const quote = (s) => (s.length > 70 ? `${s.slice(0, 67)}...` : s);
      const report = [...bluffs]
        .sort((x, y) => y.delta - x.delta)
        .slice(0, 3)
        .map((t) => `- "${quote(t.a)}": ${t.reason || "a tell"}.${t.better ? ` ${t.better}` : ""}`)
        .join("\n");
      try {
        await fetch("/api/backup/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, report, bluffs: bluffs.length }),
        });
      } catch (err) {
        console.error(err);
      }
      onDisconnect?.({ reason: "user" });
    },
  };

  onConnect?.();
  say(question);
  return session;
}
