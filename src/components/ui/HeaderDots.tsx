export function HeaderDots() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 72"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Mikroprick-pattern: 0.1px radius, 0.55px spacing */}
        <pattern id="pd" x="0" y="0" width="1.1" height="1.1" patternUnits="userSpaceOnUse">
          <circle cx="0.55" cy="0.55" r="0.4" fill="#3b82f6" />
        </pattern>

        {/* Nav-mask: tät mitt (88%, 50%), tonar ut mot kanterna */}
        <radialGradient id="nav-grd" cx="88%" cy="50%" r="32%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="45%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="nav-m">
          <rect width="1440" height="72" fill="url(#nav-grd)" />
        </mask>

        {/* Logo-clip: prickar beskärs till textform */}
        <clipPath id="logo-cp">
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

      {/* Nav-prickar med gradient-densitet */}
      <rect width="1440" height="72" fill="url(#pd)" mask="url(#nav-m)" />

      {/* Logo-prickar klippta till textform */}
      <rect width="1440" height="72" fill="url(#pd)" clipPath="url(#logo-cp)" />
    </svg>
  );
}
