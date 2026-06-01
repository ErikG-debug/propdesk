function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function generateDots(W: number, H: number, focalX: number, focalY: number, sigma: number) {
  const rand = seededRandom(42);
  const step = 2;
  const dots: { x: number; y: number; r: number }[] = [];

  for (let gx = 0; gx <= W; gx += step) {
    for (let gy = 0; gy <= H; gy += step) {
      const dx = gx - focalX;
      const dy = gy - focalY;
      const prob = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

      if (rand() < prob) {
        const x = gx + (rand() - 0.5) * step * 0.6;
        const y = gy + (rand() - 0.5) * step * 0.6;
        // Lite större prickar ute i glesa kanten så dom syns tydligare
        const r = prob < 0.2 ? 1.8 : 1.2;
        dots.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          r,
        });
      }
    }
  }

  return dots;
}

const W = 1440;
const H = 72;
// Fokuspunkt: höger sida, mitten av headern
const DOTS = generateDots(W, H, W * 0.88, H * 0.5, 220);

export function HeaderDots() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMid slice"
    >
      {DOTS.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#3b82f6" />
      ))}
    </svg>
  );
}
