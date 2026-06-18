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
  const sheen = `stripe-sheen-${uid}`;

  const isHorizontal = orientation === "horizontal";
  const W = isHorizontal ? 200 : 40;
  const H = isHorizontal ? 40 : 200;

  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ overflow: "hidden" }}
    >
      <defs>
        <filter id={blobs} x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.04"
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
          <feGaussianBlur in="alpha" stdDeviation="1.5" result="softAlpha" />
          <feComposite in="SourceGraphic" in2="softAlpha" operator="in" />
        </filter>

        <filter id={grain} x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.9"
            numOctaves="2"
            seed="3"
            stitchTiles="stitch"
            result="grainSrc"
          />
          <feColorMatrix
            in="grainSrc"
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    1 0 0 0 -0.35"
            result="grainAlpha"
          />
          <feComposite in="SourceGraphic" in2="grainAlpha" operator="in" />
        </filter>

        <linearGradient
          id={sheen}
          x1="0"
          y1="0"
          x2={isHorizontal ? "0" : "1"}
          y2={isHorizontal ? "1" : "0"}
        >
          <stop offset="0%" stopColor="#1e4a82" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#1e4a82" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="#0b2a55" />
      <rect width={W} height={H} fill="#ffffff" filter={`url(#${blobs})`} opacity="0.55" />
      <rect width={W} height={H} fill="#ffffff" filter={`url(#${grain})`} opacity="0.18" />
      <rect width={W} height={H} fill={`url(#${sheen})`} />
    </svg>
  );
}
