function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function generateDots(
  W: number,
  H: number,
  count: number,
  focalX: number,
  focalY: number,
  sigma: number
) {
  const rand = seededRandom(7331);
  const dots: { x: number; y: number; r: number }[] = [];
  let attempts = 0;

  while (dots.length < count && attempts < count * 40) {
    attempts++;
    const x = rand() * W;
    const y = rand() * H;
    const dx = x - focalX;
    const dy = y - focalY;
    const prob = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

    if (rand() < prob) {
      // Prickar lite synligare ute i glesa kanten
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = dist > sigma ? 2 : 1.5;
      dots.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r });
    }
  }

  return dots;
}

const W = 1440;
const H = 72;
// Fokuspunkt uppe till höger
const DOTS = generateDots(W, H, 900, W * 0.84, H * 0.15, 280);

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
