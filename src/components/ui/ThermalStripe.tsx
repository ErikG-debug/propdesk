import { useId } from "react";

export function ThermalStripe({
  className,
  orientation = "vertical",
}: {
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  const uid = useId().replace(/:/g, "");
  const blobs = `stripe-blobs-${uid}`;
  const grain = `stripe-grain-${uid}`;
  const soften = `leaf-soften-${uid}`;
  const mask = `stripe-mask-${uid}`;

  const isHorizontal = orientation === "horizontal";
  const LONG = 200;
  const SHORT = 40;
  const W = isHorizontal ? LONG : SHORT;
  const H = isHorizontal ? SHORT : LONG;

  const OFFSET = 10;
  const RX_FACTOR = 1.5;
  const rxLong = (LONG / 2) * RX_FACTOR;
  const ryShort = SHORT + OFFSET;

  const ellipse = isHorizontal
    ? { cx: W / 2, cy: H + OFFSET, rx: rxLong, ry: ryShort }
    : { cx: -OFFSET, cy: H / 2, rx: ryShort, ry: rxLong };

  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={blobs} x="-20%" y="-5%" width="140%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.03"
            numOctaves="3"
            seed="7"
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
          <feGaussianBlur in="alpha" stdDeviation="1.2" result="softAlpha" />
          <feComposite in="SourceGraphic" in2="softAlpha" operator="in" />
        </filter>

        <filter id={grain} x="-20%" y="-5%" width="140%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.9"
            numOctaves="2"
            seed="5"
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

        <filter id={soften} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        <mask id={mask} maskUnits="userSpaceOnUse">
          <ellipse
            cx={ellipse.cx}
            cy={ellipse.cy}
            rx={ellipse.rx}
            ry={ellipse.ry}
            fill="white"
            filter={`url(#${soften})`}
          />
        </mask>
      </defs>

      <g mask={`url(#${mask})`}>
        <rect width={W} height={H} fill="#0b2a55" />
        <rect width={W} height={H} fill="#ffffff" filter={`url(#${blobs})`} />
        <rect
          width={W}
          height={H}
          fill="#ffffff"
          filter={`url(#${grain})`}
          opacity="0.55"
        />
      </g>
    </svg>
  );
}
