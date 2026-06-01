function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

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
const LOGO_DOTS = generateLogoNoiseDots(100, 18, 268, 58, 18000);

export function HeaderDots() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Termisk gradient: kall (svart) → sval (mörk navy) → varm (denim) → het (ljusblå) */}
        <radialGradient id="thermal" cx="88%" cy="50%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#b8ddf5" /> {/* het kärna */}
          <stop offset="18%"  stopColor="#2a82c8" /> {/* varm */}
          <stop offset="48%"  stopColor="#0b2d50" /> {/* sval */}
          <stop offset="100%" stopColor="#04090f" /> {/* kall: nästintill svart */}
        </radialGradient>

        {/* Sensor grain / termisk brus-filter */}
        <filter id="grain" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72 0.72"
            numOctaves="4"
            seed="12"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
          <feBlend in="SourceGraphic" in2="mono" mode="soft-light" result="blended" />
          <feComponentTransfer in="blended">
            <feFuncR type="linear" slope="1.05" />
            <feFuncG type="linear" slope="1.05" />
            <feFuncB type="linear" slope="1.1" />
          </feComponentTransfer>
        </filter>

        {/* Logo clip-path */}
        <clipPath id="logo-clip">
          <text
            x="104" y="46"
            fontSize="21" fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            PropDesk
          </text>
        </clipPath>
      </defs>

      {/* Termisk bakgrund med sensor-brus */}
      <rect width={W} height={H} fill="url(#thermal)" filter="url(#grain)" />

      {/* Logo: ljusa prickar klippta till textform mot mörk bakgrund */}
      <g clipPath="url(#logo-clip)">
        {LOGO_DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(200,230,250,0.92)" />
        ))}
      </g>
    </svg>
  );
}
