import { useId } from "react";

export function NavActiveIndicator({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const soften = `nav-soften-${uid}`;
  const glow = `nav-glow-${uid}`;
  const mask = `nav-mask-${uid}`;

  const W = 200;
  const H = 40;
  const OFFSET = 10;
  const RX_FACTOR = 1.5;
  const rxLong = (W / 2) * RX_FACTOR;
  const ryShort = H + OFFSET;

  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={glow} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#ffffff" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={soften} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        <mask id={mask} maskUnits="userSpaceOnUse">
          <ellipse
            cx={W / 2}
            cy={H + OFFSET}
            rx={rxLong}
            ry={ryShort}
            fill="white"
            filter={`url(#${soften})`}
          />
        </mask>
      </defs>

      <g mask={`url(#${mask})`} filter={`url(#${glow})`}>
        <rect width={W} height={H} fill="#ffffff" />
      </g>
    </svg>
  );
}
