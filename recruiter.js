// The recruiter inbox (Agentboxd). It emails each verdict and negotiates offers by reply.
// Replies come from fixed templates, so negotiating calls no AI model. The inbox is watched
// only while an offer is waiting for an answer (LISTEN_MS after the last offer), not around the clock.
// The Builder plan allows 20 sends a day, so each address gets at most MAX_REPLIES replies.

const MAX_REPLIES = 3;
const LISTEN_MS = 30 * 60 * 1000;
let listening = false;
let lastOfferAt = 0;
const SALARY = [
  [/surgeon|doctor|physician/i, 412000],
  [/chef/i, 96000],
  [/vc|venture|partner/i, 350000],
  [/engineer|developer|swe/i, 187000],
  [/astronaut/i, 152000],
];
const offers = new Map(); // email -> { role, base, current, replies }

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const article = (word) => (/^[aeiou]/i.test(word) ? "an" : "a");
// A name like "Bill Gates" reads without an article; a role like "tennis player" or a job title takes one.
const ROLE_WORD = /\b(manager|engineer|developer|analyst|designer|scientist|director|lead|specialist|consultant|associate|intern|officer|architect|assistant|researcher|writer|editor|nurse|teacher|technician|advisor|accountant|recruiter|owner|president|chef|player|worker|doctor|surgeon|pilot|driver|coach|artist|singer|founder|partner|agent|lawyer|judge|captain|student|professor)\b/i;
const isName = (role) => /^[A-Z][a-z'’.-]+(?:\s[A-Z][a-z'’.-]+){1,2}$/.test(role.trim()) && !ROLE_WORD.test(role);
const addressOf = (from) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
const baseFor = (role) => SALARY.find(([re]) => re.test(role))?.[1] ?? 140000;

export async function sendResultEmail(mail, inboxId, { email, role, verdict, report }) {
  const to = email.trim().toLowerCase();
  if (verdict === "passed") {
    const base = baseFor(role);
    offers.set(to, { role, base, current: base, replies: 0 });
    return mail.messages.send(inboxId, {
      to,
      subject: `Your offer: ${role}, ${money(base)}`,
      text: [
        "Hi,",
        "",
        `Congratulations. The panel couldn't clock you, so we'd like to offer you the role of ${role}.`,
        "",
        `Base salary: ${money(base)}`,
        "Start date: Monday",
        "Equity: 0.001% of a company that exists only in this email",
        "",
        "Reply to this email if you'd like to negotiate.",
        "",
        "Clocked Recruiting",
      ].join("\n"),
    });
  }
  return mail.messages.send(inboxId, {
    to,
    subject: `Your application: ${role}`,
    text: [
      "Hi,",
      "",
      `Thank you for your time today. After careful consideration, we've decided to move forward with a candidate who is ${isName(role) ? `the real ${role}` : `an actual ${role}`}.`,
      "",
      "Where the panel clocked you:",
      String(report || "The panel clocked you early.").slice(0, 1500),
      "",
      "You're free to LARP again.",
      "",
      "Clocked Recruiting",
    ].join("\n"),
  });
}

// Finds the largest salary-sized figure in a reply: "$195,000", "195k", "195 thousand".
function askedAmount(text) {
  const found = [];
  for (const m of text.matchAll(/\$?\s?(\d{2,3}(?:[,\s]\d{3})+|\d{2,7})(?:\.\d+)?\s*(k|thousand)?/gi)) {
    let n = Number(m[1].replace(/[,\s]/g, ""));
    if (m[2]) n *= 1000;
    if (n >= 20000 && n <= 5000000) found.push(n);
  }
  return found.length ? Math.max(...found) : null;
}

// Decides the recruiter's move. Returns the text the email must contain, plus a fallback wording.
function decide(offer, ask) {
  const ceiling = offer.base * 1.15;
  if (ask === null) {
    return { must: null, text: "Thanks for getting back to me. Which number did you have in mind?" };
  }
  if (ask <= offer.current) {
    return { must: money(offer.current), text: `Easy yes. We're confirmed at ${money(offer.current)}. See you Monday.` };
  }
  if (ask <= offer.base * 1.1) {
    offer.current = ask;
    return { must: money(ask), text: `You drive a hard bargain. ${money(ask)} it is. See you Monday.` };
  }
  if (ask <= offer.base * 1.3) {
    const counter = Math.min(ceiling, Math.round((offer.current + ask) / 2 / 1000) * 1000);
    offer.current = counter;
    return {
      must: money(counter),
      text: `${money(ask)} is above our band for ${isName(offer.role) ? offer.role : `${article(offer.role)} ${offer.role}`}. I can meet you at ${money(counter)}.`,
    };
  }
  offer.current = ceiling;
  return {
    must: money(ceiling),
    text: `${money(ask)} is well outside our band. Our best and final is ${money(ceiling)}, plus a ring light for your home office.`,
  };
}

async function handleReply(mail, inboxId, msg) {
  const from = addressOf(msg.from ?? "");
  const subject = msg.subject ?? "";
  let offer = offers.get(from);
  if (!offer) {
    // After a restart the map is empty, so rebuild the offer from the subject line.
    const m = subject.match(/your offer:\s*(.+?),\s*\$([\d,]+)/i);
    if (!m) return;
    const base = Number(m[2].replace(/,/g, ""));
    offer = { role: m[1], base, current: base, replies: 0 };
    offers.set(from, offer);
  }
  if (offer.replies >= MAX_REPLIES) return;
  offer.replies += 1;

  const move = decide(offer, askedAmount(msg.extracted_text ?? msg.text ?? ""));
  await mail.messages.reply(inboxId, msg.id, { text: `${move.text}\n\nClocked Recruiting` });
  console.log(`replied to ${from}: ${move.must ?? "asked for a number"}`);
}

// Starts watching the inbox after an offer goes out. Each wait is one long-poll of up to
// 60 seconds; the loop ends LISTEN_MS after the most recent offer.
export function wakeRecruiter(mail, inboxId) {
  lastOfferAt = Date.now();
  if (listening) return;
  listening = true;
  console.log("recruiter inbox is listening");
  (async () => {
    let since = new Date(Date.now() - 60_000).toISOString();
    while (Date.now() - lastOfferAt < LISTEN_MS) {
      try {
        const msg = await mail.messages.wait(inboxId, { timeout: 60, since });
        if (!msg) continue;
        since = msg.created_at;
        await handleReply(mail, inboxId, msg);
      } catch (err) {
        console.error("recruiter loop:", err.message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    listening = false;
    console.log("recruiter inbox stopped listening");
  })();
}
