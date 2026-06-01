function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// Thermal noise: slumpmässig placering med Gaussisk täthet kring fokuspunkt
function generateNoiseDots(
  W: number, H: number,
  focalX: number, focalY: number,
  sigma: number,
  targetCount: number
) {
  const rand = seededRandom(42);
  const dots: { x: number; y: number; r: number }[] = [];
  let attempts = 0;

  while (dots.length < targetCount && attempts < targetCount * 70) {
    attempts++;
    const x = rand() * W;
    const y = rand() * H;
    const dx = x - focalX;
    const dy = y - focalY;
    const prob = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

    if (rand() < prob) {
      // Kornstorleksfördelning: mestadels tiny, ibland medium, sällan stor
      const t = rand();
      const r = t < 0.60 ? 0.2 + rand() * 0.3   // 0.2–0.5
              : t < 0.88 ? 0.5 + rand() * 0.4   // 0.5–0.9
              :             0.9 + rand() * 0.5;  // 0.9–1.4
      dots.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        r: Math.round(r * 100) / 100,
      });
    }
  }
  return dots;
}

// Logoprickar: slumpmässiga i bounding-box, clip-path klipper till textform
function generateLogoNoiseDots(x0: number, y0: number, x1: number, y1: number, count: number) {
  const rand = seededRandom(999);
  const dots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + rand() * (x1 - x0);
    const y = y0 + rand() * (y1 - y0);
    const t = rand();
    const r = t < 0.55 ? 0.25 + rand() * 0.3
            : t < 0.85 ? 0.55 + rand() * 0.35
            :             0.9 + rand() * 0.35;
    dots.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.round(r * 100) / 100,
    });
  }
  return dots;
}

const W = 1440;
const H = 72;
const NAV_DOTS  = generateNoiseDots(W, H, W * 0.88, H * 0.5, 280, 8000);
const LOGO_DOTS = generateLogoNoiseDots(100, 18, 268, 58, 3200);

export function HeaderDots() {
  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full"
           viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet">
        <defs>
          <clipPath id="propdesk-clip">
            <text x="104" y="46" fontSize="21" fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif">PropDesk</text>
          </clipPath>
        </defs>
        <g clipPath="url(#propdesk-clip)">
          {LOGO_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#1a6ba8" />
          ))}
        </g>
      </svg>

      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full"
           viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMid slice">
        {NAV_DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#1a6ba8" />
        ))}
      </svg>
    </>
  );
}
