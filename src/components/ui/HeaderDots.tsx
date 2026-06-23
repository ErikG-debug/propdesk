const W = 1440;
const H = 72;

export function HeaderDots() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Fint rutnät — 20 px */}
        <pattern id="bp-fine" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.4" />
        </pattern>
        {/* Grovt rutnät — 100 px */}
        <pattern id="bp-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.9" />
        </pattern>
        {/* Krysspunkter vid grovt rutnät */}
        <pattern id="bp-dots" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="0"   cy="0"   r="1.4" fill="white" />
          <circle cx="100" cy="0"   r="1.4" fill="white" />
          <circle cx="0"   cy="100" r="1.4" fill="white" />
          <circle cx="100" cy="100" r="1.4" fill="white" />
        </pattern>
        {/* Tonar ut mot höger */}
        <linearGradient id="bp-fade-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="55%" stopColor="#0b2a55" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b2a55" stopOpacity="0.8" />
        </linearGradient>
        {/* Subtil nedåt-ton längst ner */}
        <linearGradient id="bp-fade-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="60%" stopColor="#0b2a55" stopOpacity="0" />
          <stop offset="100%" stopColor="#051828" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="#0b2a55" />
      <rect width={W} height={H} fill="url(#bp-fine)"  opacity="0.055" />
      <rect width={W} height={H} fill="url(#bp-major)" opacity="0.1" />
      <rect width={W} height={H} fill="url(#bp-dots)"  opacity="0.16" />
      <rect width={W} height={H} fill="url(#bp-fade-r)" />
      <rect width={W} height={H} fill="url(#bp-fade-b)" />
    </svg>
  );
}
