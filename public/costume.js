// Tock's props: the claimed role's most recognisable items sit beside the speaking orb, at its lower left
// and lower right, picked by keyword rules so any typed role gets a look with no AI calls.
// Nothing is worn or held. Items are drawn at assorted sizes; fitCostume() scales each into its corner.

const INK = "#0b0b0f";

const HATS = {
  surgeonCap: `<path d="M72 102C72 58 98 46 120 46s48 12 48 56c-16-14-80-14-96 0z" fill="#2a9d8f" stroke="${INK}" stroke-width="2.5"/>
    <g fill="#bfeee8"><circle cx="98" cy="70" r="2.4"/><circle cx="120" cy="62" r="2.4"/><circle cx="142" cy="70" r="2.4"/><circle cx="110" cy="82" r="2.4"/><circle cx="132" cy="82" r="2.4"/></g>`,
  toque: `<rect x="82" y="64" width="76" height="24" rx="5" fill="#fff" stroke="#c9c3b5" stroke-width="2.5"/>
    <g fill="#fff" stroke="#c9c3b5" stroke-width="2.5"><circle cx="92" cy="50" r="19"/><circle cx="148" cy="50" r="19"/><circle cx="120" cy="38" r="24"/></g>
    <rect x="84" y="56" width="72" height="12" fill="#fff"/>`,
  hardHat: `<path d="M70 94C70 52 96 40 120 40s50 12 50 54z" fill="#f2c230" stroke="${INK}" stroke-width="2.5"/>
    <rect x="62" y="88" width="116" height="11" rx="5.5" fill="#e0ad1c" stroke="${INK}" stroke-width="2.5"/>
    <rect x="114" y="42" width="12" height="46" rx="4" fill="#e9b81f"/>`,
  pilotCap: `<path d="M70 82c0-26 100-26 100 0l-10 10H80z" fill="#1f3a5f" stroke="${INK}" stroke-width="2.5"/>
    <rect x="80" y="86" width="80" height="9" fill="#111"/><path d="M80 95q40 14 80 0z" fill="#111"/>
    <circle cx="120" cy="72" r="7" fill="#f2c94c" stroke="${INK}" stroke-width="2"/>`,
  policeCap: `<path d="M70 82c0-26 100-26 100 0l-10 10H80z" fill="#14213d" stroke="${INK}" stroke-width="2.5"/>
    <rect x="80" y="86" width="80" height="9" fill="#e9ecef"/><path d="M80 95q40 14 80 0z" fill="#111"/>
    <path d="M120 64l6 6-6 9-6-9z" fill="#c0c6cc" stroke="${INK}" stroke-width="1.5"/>`,
  cowboyHat: `<ellipse cx="120" cy="82" rx="76" ry="13" fill="#8b5a2b" stroke="${INK}" stroke-width="2.5"/>
    <path d="M86 82c-2-34 16-40 34-30 18-10 36-4 34 30z" fill="#9c6a36" stroke="${INK}" stroke-width="2.5"/>
    <rect x="87" y="70" width="66" height="7" fill="#5c3a19"/>`,
  crown: `<path d="M84 86V52l18 16 18-26 18 26 18-16v34z" fill="#f2c94c" stroke="#a8821a" stroke-width="2.5"/>
    <circle cx="102" cy="76" r="4" fill="#d6303f"/><circle cx="120" cy="72" r="5" fill="#2a9d8f"/><circle cx="138" cy="76" r="4" fill="#d6303f"/>`,
  wizardHat: `<path d="M74 88L120 8l46 80z" fill="#5b3fa0" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="120" cy="88" rx="60" ry="10" fill="#4a3185" stroke="${INK}" stroke-width="2.5"/>
    <g fill="#f2c94c"><path d="M112 46l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z"/><circle cx="134" cy="66" r="3"/><circle cx="104" cy="70" r="2.2"/></g>`,
  beret: `<ellipse cx="112" cy="62" rx="52" ry="18" fill="#c0392b" stroke="${INK}" stroke-width="2.5"/><rect x="108" y="38" width="8" height="10" rx="3" fill="#c0392b"/>`,
  gradCap: `<path d="M84 72h72v18H84z" fill="#151515"/><path d="M58 62l62-22 62 22-62 22z" fill="#1d1d1d" stroke="${INK}" stroke-width="2.5"/>
    <path d="M120 62l40 10v26" fill="none" stroke="#f2c94c" stroke-width="3"/><circle cx="160" cy="100" r="4" fill="#f2c94c"/>`,
  headphones: `<path d="M68 112C68 40 172 40 172 112" fill="none" stroke="#222" stroke-width="11" stroke-linecap="round"/>
    <rect x="56" y="98" width="20" height="36" rx="8" fill="#e9ff5c" stroke="${INK}" stroke-width="2.5"/>
    <rect x="164" y="98" width="20" height="36" rx="8" fill="#e9ff5c" stroke="${INK}" stroke-width="2.5"/>`,
  // The helmet is a glass bowl around the whole orb.
  helmet: `<circle cx="120" cy="116.8" r="74" fill="rgba(180,220,255,0.12)" stroke="#dfe6ee" stroke-width="6"/>
    <path d="M74 84a56 56 0 0 1 38-26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`,
  // Bands narrow toward the top, so they follow the curve of the orb.
  visor: `<path d="M84.2 78Q120 82 155.8 78L164.9 89Q120 94 75.1 89Z" fill="#f4f1ea" stroke="${INK}" stroke-width="2"/>
    <path d="M120 86l66 5q-12 11-66 7z" fill="#e9ff5c" stroke="${INK}" stroke-width="2.5"/>`,
  headband: `<path d="M86.5 76Q120 80 153.5 76L163.6 87Q120 92 76.4 87Z" fill="#d6303f" stroke="${INK}" stroke-width="2"/>`,
  baseballCap: `<path d="M74 94c0-40 92-40 92 0z" fill="#3d5a80" stroke="${INK}" stroke-width="2.5"/>
    <path d="M120 90l70 4q-14 10-70 6z" fill="#2f4866" stroke="${INK}" stroke-width="2.5"/>`,
  pirateHat: `<path d="M54 84Q120 18 186 84Q120 62 54 84z" fill="#151515" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="120" cy="58" r="7" fill="#f4f1ea"/><path d="M112 70l16-6M112 64l16 6" stroke="#f4f1ea" stroke-width="2.5"/>`,
};

const NECK = {
  stethoscope: `<path d="M100 184c-6 30 4 46 20 46s26-16 20-46" fill="none" stroke="#2b2b30" stroke-width="5" stroke-linecap="round"/>
    <circle cx="120" cy="234" r="9" fill="#c0c6cc" stroke="${INK}" stroke-width="2.5"/>`,
  tie: `<path d="M112 188h16l-4 10h-8z" fill="#c0392b" stroke="${INK}" stroke-width="2"/>
    <path d="M116 198h8l6 40-10 14-10-14z" fill="#c0392b" stroke="${INK}" stroke-width="2"/>`,
  bowtie: `<path d="M120 194l-18-9v18zM120 194l18-9v18z" fill="#151515" stroke="${INK}" stroke-width="2"/><circle cx="120" cy="194" r="4" fill="#151515"/>`,
  lanyard: `<path d="M104 186l14 40M136 186l-14 40" stroke="#e9ff5c" stroke-width="4"/>
    <rect x="104" y="224" width="32" height="22" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <rect x="109" y="229" width="10" height="12" fill="#c9c3b5"/><path d="M122 232h9M122 238h7" stroke="#888" stroke-width="2"/>`,
  whistle: `<path d="M106 186l10 40M134 186l-10 40" stroke="#222" stroke-width="2.5"/>
    <rect x="110" y="224" width="22" height="12" rx="6" fill="#c0c6cc" stroke="${INK}" stroke-width="2"/>`,
  medal: `<path d="M106 186l10 36h8l10-36" fill="none" stroke="#2a6fdb" stroke-width="7"/>
    <circle cx="120" cy="232" r="11" fill="#f2c94c" stroke="#a8821a" stroke-width="2.5"/>`,
  vip: `<path d="M104 186l14 40M136 186l-14 40" stroke="#f2c94c" stroke-width="4"/>
    <rect x="102" y="224" width="36" height="22" rx="3" fill="#151515" stroke="#f2c94c" stroke-width="2"/>
    <text x="120" y="240" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="13" fill="#f2c94c">VIP</text>`,
  scarf: `<path d="M96 182q24 16 48 0l2 12q-26 16-52 0z" fill="#d6303f" stroke="${INK}" stroke-width="2"/><path d="M128 194l6 40h-12z" fill="#d6303f" stroke="${INK}" stroke-width="2"/>`,
};

// Props sit at the orb's lower right.
const PROPS = {
  clipboard: `<g transform="rotate(8 176 222)"><rect x="156" y="190" width="42" height="56" rx="4" fill="#b8875a" stroke="${INK}" stroke-width="2.5"/>
    <rect x="162" y="200" width="30" height="40" fill="#fff"/><rect x="168" y="186" width="18" height="9" rx="2" fill="#888" stroke="${INK}" stroke-width="2"/>
    <path d="M166 210h22M166 218h18M166 226h20" stroke="#bbb" stroke-width="2"/></g>`,
  laptop: `<g transform="rotate(-6 177 230)"><path d="M152 214h50l-5 32h-40z" fill="#c9ccd2" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="177" cy="229" r="6" fill="#e9ff5c" stroke="${INK}" stroke-width="2"/><path d="M177 229v-4" stroke="${INK}" stroke-width="2"/></g>`,
  mug: `<rect x="160" y="212" width="28" height="32" rx="5" fill="#f4f1ea" stroke="${INK}" stroke-width="2.5"/>
    <path d="M188 220c10 0 10 16 0 16" fill="none" stroke="${INK}" stroke-width="3"/><path d="M168 204q4-6 0-12M178 204q4-6 0-12" stroke="#aaa" stroke-width="2" fill="none"/>`,
  wine: `<path d="M164 204h28q0 22-14 24-14-2-14-24z" fill="rgba(255,255,255,0.25)" stroke="${INK}" stroke-width="2"/>
    <path d="M166 212h24q-2 14-12 15-10-1-12-15z" fill="#8e1b3a"/><path d="M178 228v18M168 248h20" stroke="${INK}" stroke-width="2.5"/>`,
  whisk: `<g transform="rotate(-20 176 226)"><rect x="173" y="226" width="7" height="30" rx="3" fill="#8b5a2b"/>
    <path d="M176 228c-12-14-10-30 0-34 10 4 12 20 0 34M176 228c-6-14-4-30 0-34 4 4 6 20 0 34" fill="none" stroke="#9aa1a8" stroke-width="2"/></g>`,
  wrench: `<g transform="rotate(-35 178 226)"><rect x="174" y="210" width="9" height="40" rx="3" fill="#9aa1a8" stroke="${INK}" stroke-width="2"/>
    <path d="M168 202a12 12 0 1 0 22 0l-5 6h-12z" fill="#9aa1a8" stroke="${INK}" stroke-width="2"/></g>`,
  palette: `<path d="M156 226c0-18 40-24 44-6 2 10-10 8-10 16s10 8 2 12c-14 6-36-6-36-22z" fill="#d8b98a" stroke="${INK}" stroke-width="2.5"/>
    <g><circle cx="168" cy="220" r="4" fill="#d6303f"/><circle cx="180" cy="214" r="4" fill="#2a6fdb"/><circle cx="190" cy="222" r="4" fill="#f2c94c"/><circle cx="170" cy="234" r="4" fill="#2a9d8f"/></g>`,
  mic: `<rect x="172" y="220" width="10" height="30" rx="4" fill="#222" stroke="${INK}" stroke-width="2"/><circle cx="177" cy="212" r="12" fill="#9aa1a8" stroke="${INK}" stroke-width="2.5"/>`,
  paddle: `<g transform="rotate(25 180 222)"><rect x="164" y="184" width="32" height="42" rx="14" fill="#2a6fdb" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="180" cy="203" r="6" fill="#e9ff5c" stroke="${INK}" stroke-width="1.5"/><rect x="176" y="224" width="8" height="26" rx="3" fill="#222"/></g>`,
  racket: `<g transform="rotate(25 180 224)"><ellipse cx="180" cy="206" rx="15" ry="19" fill="rgba(255,255,255,0.15)" stroke="#e9ff5c" stroke-width="4"/>
    <path d="M168 200h24M168 212h24M176 189v34M184 189v34" stroke="#e9ff5c" stroke-width="1.2" opacity="0.7"/><rect x="176" y="225" width="8" height="26" rx="3" fill="#222"/></g>`,
  gavel: `<g transform="rotate(-25 176 224)"><rect x="160" y="208" width="34" height="16" rx="4" fill="#8b5a2b" stroke="${INK}" stroke-width="2"/>
    <rect x="173" y="222" width="8" height="30" rx="3" fill="#a0703c" stroke="${INK}" stroke-width="2"/></g>`,
  book: `<rect x="154" y="222" width="46" height="12" rx="2" fill="#2a6fdb" stroke="${INK}" stroke-width="2"/><rect x="158" y="210" width="40" height="12" rx="2" fill="#d6303f" stroke="${INK}" stroke-width="2"/>`,
  magnifier: `<circle cx="174" cy="212" r="14" fill="rgba(180,220,255,0.25)" stroke="#c9a227" stroke-width="5"/><path d="M184 222l14 18" stroke="#5c3a19" stroke-width="7" stroke-linecap="round"/>`,
  flask: `<path d="M170 196h16v14l12 28q2 8-6 8h-28q-8 0-6-8l12-28z" fill="rgba(255,255,255,0.18)" stroke="${INK}" stroke-width="2.5"/>
    <path d="M162 236l8-14h16l8 14q1 6-5 6h-22q-6 0-5-6z" fill="#e9ff5c" opacity="0.85"/>`,
};

// A few famous looks first, then role families. Any other name typed with capitals gets the VIP look,
// and anything else gets the default HR look.
const RULES = [
  [/bill gates/i, { prop: "laptop" }],
  [/steve jobs/i, { prop: "laptop" }],
  [/elon musk|jeff bezos|mark zuckerberg|sam altman|jensen huang/i, { neck: "vip" }],
  [/taylor swift|beyonc|rihanna|drake|bad bunny|billie eilish/i, { hat: "headphones", prop: "mic" }],
  [/serena williams|roger federer|rafael nadal|novak djokovic/i, { hat: "headband", prop: "racket" }],
  [/gordon ramsay/i, { hat: "toque", prop: "whisk" }],
  [/neuro|surgeon|surgery/i, { hat: "surgeonCap", neck: "stethoscope", prop: "clipboard" }],
  [/doctor|physician|nurse|medic|dentist|pharmac|vet\b|veterinar|therapist|psychiatr/i, { neck: "stethoscope", prop: "clipboard" }],
  [/chef|cook|baker|pastry|culinar/i, { hat: "toque", prop: "whisk" }],
  [/sommelier|wine|bartender|mixolog|waiter|server/i, { neck: "bowtie", prop: "wine" }],
  [/barista|coffee/i, { hat: "baseballCap", prop: "mug" }],
  [/civil|structural|construction|builder|carpenter|electrician|plumber|mechanic|welder|contractor|architect/i, { hat: "hardHat", prop: "wrench" }],
  [/pickleball|padel/i, { hat: "visor", prop: "paddle" }],
  [/tennis|badminton|squash/i, { hat: "headband", prop: "racket" }],
  [/coach|referee|umpire/i, { hat: "baseballCap", neck: "whistle", prop: "clipboard" }],
  [/f1|formula|racer|race car|driver/i, { hat: "baseballCap" }],
  [/athlete|olymp|soccer|football|basketball|hockey|runner|swimmer|boxer|player/i, { hat: "headband", neck: "medal" }],
  [/engineer|developer|programmer|coder|software|swe\b|devops|data|machine learning|\bml\b|\bai\b|hacker|cyber/i, { neck: "lanyard", prop: "laptop" }],
  [/designer|artist|painter|illustrator|animator|sculpt/i, { hat: "beret", prop: "palette" }],
  [/streamer|youtuber|influencer|gamer|content creator|podcast/i, { hat: "headphones", prop: "mic" }],
  [/musician|singer|rapper|\bdj\b|producer|guitar|drummer|composer/i, { hat: "headphones", prop: "mic" }],
  [/astronaut|cosmonaut|space/i, { hat: "helmet" }],
  [/pilot|aviator|flight/i, { hat: "pilotCap" }],
  [/detective|investigator|spy|agent/i, { prop: "magnifier" }],
  [/police|officer|\bcop\b|sheriff|security|guard/i, { hat: "policeCap", prop: "clipboard" }],
  [/judge/i, { prop: "gavel" }],
  [/lawyer|attorney|paralegal|solicitor|barrister/i, { neck: "tie", prop: "book" }],
  [/teacher|professor|lecturer|tutor|librarian|principal/i, { prop: "book" }],
  [/scientist|chemist|biolog|physicist|research|\blab\b|astronom|geolog/i, { prop: "flask" }],
  [/\bvc\b|venture|investor|angel/i, { prop: "mug" }],
  [/founder|co-founder|cofounder|startup/i, { neck: "lanyard", prop: "laptop" }],
  [/ceo|founder|executive|director|manager|consultant|banker|analyst|trader|accountant|finance|lawyer/i, { neck: "tie", prop: "clipboard" }],
  [/farmer|rancher|cowboy|cowgirl/i, { hat: "cowboyHat" }],
  [/king|queen|prince|princess|royal|monarch|emperor/i, { hat: "crown" }],
  [/wizard|magician|witch|sorcer|mage/i, { hat: "wizardHat" }],
  [/pirate/i, { hat: "pirateHat" }],
  [/graduate|student|intern/i, { hat: "gradCap", neck: "lanyard" }],
  [/journalist|reporter|writer|author|editor|photographer|poet/i, { neck: "scarf", prop: "book" }],
  [/dancer|ballet|actor|actress|performer|model/i, { neck: "scarf" }],
];
const DEFAULT_KIT = { neck: "lanyard", prop: "clipboard" };
const VIP_KIT = { neck: "vip" };
const looksLikeName = (role) => /^[A-Z][a-z'’.-]+(?:\s[A-Z][a-z'’.-]+){1,2}$/.test(role.trim());

export const kitFor = (role) =>
  RULES.find(([re]) => re.test(role))?.[1] ?? (looksLikeName(role) ? VIP_KIT : DEFAULT_KIT);

// Corner boxes in the 200 x 200 stage (x, y, width, height), just outside the orb, which has a radius of about 66.
const SLOTS = { left: [4, 152, 42, 42], right: [154, 152, 42, 42] };

// The role's two most recognisable items, most distinctive first. A lone headband doesn't read as anything,
// and a clipboard fits too many roles, so it only shows when nothing better is left.
function itemsFor(kit) {
  return [
    kit.hat !== "headband" && HATS[kit.hat],
    NECK[kit.neck],
    kit.prop !== "clipboard" && PROPS[kit.prop],
    kit.prop === "clipboard" && PROPS.clipboard,
  ].filter(Boolean).slice(0, 2);
}

export function costumeFor(role) {
  const [first, second] = itemsFor(kitFor(role));
  const slot = (name, svg) => (svg ? `<g data-slot="${name}"><g>${svg}</g></g>` : "");
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${second ? slot("left", first) + slot("right", second) : slot("right", first)}</svg>`;
}

// Scales each item to fit its corner box, resting on the box's bottom edge. It measures the drawings,
// so it runs once the stage is on screen, and retries for a few frames if it isn't yet.
export function fitCostume(container, tries = 5) {
  for (const g of container.querySelectorAll("[data-slot]")) {
    const box = g.firstElementChild.getBBox();
    if (!box.width || !box.height) {
      if (tries > 0) requestAnimationFrame(() => fitCostume(container, tries - 1));
      return;
    }
    const [x, y, w, h] = SLOTS[g.dataset.slot];
    const s = Math.min(w / box.width, h / box.height);
    const tx = x + (w - box.width * s) / 2 - box.x * s;
    const ty = y + h - box.height * s - box.y * s;
    g.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
}
