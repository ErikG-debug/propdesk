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
        <filter id="thermal-blobs" x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014 0.022"
            numOctaves="3"
            seed="11"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    1 0 0 0 -0.15"
            result="alpha"
          />
          <feGaussianBlur in="alpha" stdDeviation="3" result="softAlpha" />
          <feComposite in="SourceGraphic" in2="softAlpha" operator="in" />
        </filter>

        <filter id="thermal-grain" x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.9"
            numOctaves="2"
            seed="3"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    1 0 0 0 -0.35"
            result="grainAlpha"
          />
          <feComposite in="SourceGraphic" in2="grainAlpha" operator="in" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="#0b2a55" />
      <rect width={W} height={H} fill="#ffffff" filter="url(#thermal-blobs)" />
      <rect
        width={W}
        height={H}
        fill="#ffffff"
        filter="url(#thermal-grain)"
        opacity="0.55"
      />
    </svg>
  );
}
