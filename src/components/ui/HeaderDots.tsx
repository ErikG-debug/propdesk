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
  focalX: number,
  focalY: number,
  sigma: number,
  seed = 42
) {
  const rand = seededRandom(seed);
  const step = 1.0;
  const dots: { x: number; y: number }[] = [];

  for (let gx = 0; gx <= W; gx += step) {
    for (let gy = 0; gy <= H; gy += step) {
      const dx = gx - focalX;
      const dy = gy - focalY;
      const prob = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      if (rand() < prob) {
        dots.push({
          x: Math.round((gx + (rand() - 0.5) * 0.4) * 10) / 10,
          y: Math.round((gy + (rand() - 0.5) * 0.4) * 10) / 10,
        });
      }
    }
  }
  return dots;
}

function generateLogoDots(
  x0: number, y0: number, x1: number, y1: number
) {
  const rand = seededRandom(777);
  const step = 2.2;
  const dots: { x: number; y: number }[] = [];
  for (let gx = x0; gx <= x1; gx += step) {
    for (let gy = y0; gy <= y1; gy += step) {
      dots.push({
        x: Math.round((gx + (rand() - 0.5) * step * 0.35) * 10) / 10,
        y: Math.round((gy + (rand() - 0.5) * step * 0.35) * 10) / 10,
      });
    }
  }
  return dots;
}

const W = 1440;
const H = 72;

// Nav-prickar: fokus symmetriskt mellan Ärenden och Inställningar
const NAV_DOTS = generateDots(W, H, W * 0.88, H * 0.5, 280);

// Logo-prickar: täcker text-bounding-box, klipps av clip-path
const LOGO_DOTS = generateLogoDots(100, 20, 260, 55);

export function HeaderDots() {
  return (
    <>
      {/* Logo: prickar klippta till textform */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          <clipPath id="propdesk-clip">
            <text
              x="104"
              y="46"
              fontSize="21"
              fontWeight="700"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              PropDesk
            </text>
          </clipPath>
        </defs>
        <g clipPath="url(#propdesk-clip)">
          {LOGO_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={0.05} fill="#3b82f6" />
          ))}
        </g>
      </svg>

      {/* Nav-prickar: tät kluster bakom länkarna */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMaxYMid slice"
      >
        {NAV_DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={0.05} fill="#3b82f6" />
        ))}
      </svg>
    </>
  );
}
