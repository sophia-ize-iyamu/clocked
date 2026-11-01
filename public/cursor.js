// The cursor itself is a CSS cursor image (styles.css), so clicks always land where you point.
// This adds a soft ring that trails it and grows over anything clickable, and moves the room's
// lamp (.spot) with the pointer. The ring's animation loop sleeps once it catches up.
// Skipped on touch screens and when reduced motion is on.
export function initCursor() {
  const fine = matchMedia("(pointer: fine)").matches;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || calm) return;

  const ring = document.createElement("div");
  ring.className = "cursorRing hidden";
  document.body.append(ring);
  const root = document.documentElement;

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let moving = false;
  const follow = () => {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    ring.style.transform = `translate(${x}px, ${y}px)`;
    moving = Math.abs(tx - x) + Math.abs(ty - y) > 0.5;
    if (moving) requestAnimationFrame(follow);
  };

  window.addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    ring.classList.remove("hidden");
    root.style.setProperty("--mx", `${e.clientX}px`);
    root.style.setProperty("--my", `${e.clientY}px`);
    if (!moving) {
      moving = true;
      requestAnimationFrame(follow);
    }
  });

  document.addEventListener("pointerover", (e) => {
    ring.classList.toggle("big", Boolean(e.target.closest("button:not(:disabled), .role, summary, a")));
    ring.classList.toggle("hidden", Boolean(e.target.closest("input, textarea")));
  });
  root.addEventListener("pointerleave", () => ring.classList.add("hidden"));
}
