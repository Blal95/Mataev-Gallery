type LogoProps = {
  /** Render only the tower-M mark, without the MATAEV wordmark. */
  iconOnly?: boolean;
  className?: string;
  title?: string;
};

/**
 * Mataev gallery identity.
 *
 * A capital "M" built from two mirrored Vainakh (Chechen highland) watchtowers:
 * tapering stone bodies, stepped pyramidal crowns, arrow-slit windows. The bold
 * solid wedge between them is the center of the M and reads as a mountain valley.
 * Chechen form, Nordic restraint. One mark, two readings.
 *
 * Pure vector, single fill colour (currentColor), symmetric by mirror transform.
 */
export default function Logo({ iconOnly = false, className, title = "Mataev" }: LogoProps) {
  return (
    <svg
      viewBox={iconOnly ? "0 0 200 210" : "0 0 200 250"}
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Ground line connecting both towers into one mark */}
      <rect x="26" y="182" width="148" height="7" />

      {/* Bold central wedge = center of the M / mountain valley */}
      <path d="M58 50 L100 150 L142 50 L123 50 L100 118 L77 50 Z" />

      {/* Left tower (outline + crown + windows). Right tower = mirror of this group. */}
      <g id="tower">
        {/* Body: tapering trapezoid, stroked as an outline */}
        <path
          d="M30 182 L42 48 L58 48 L66 182 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        {/* Stepped pyramidal crown */}
        <path d="M37 48 L61 48 L59 42 L39 42 Z" />
        <path d="M40 41 L58 41 L56 35 L42 35 Z" />
        <path d="M43 34 L55 34 L53 28 L45 28 Z" />
        <path d="M46 27 L52 27 L49 21 Z" />
        {/* Arrow-slit + square windows, on the tower centreline */}
        <rect x="46.5" y="62" width="5" height="13" />
        <rect x="45" y="95" width="8" height="9" />
        <rect x="44" y="128" width="9" height="9" />
        <rect x="43" y="158" width="10" height="9" />
      </g>
      {/* Mirror the tower across the vertical centre line (x = 100) */}
      <use href="#tower" transform="matrix(-1,0,0,1,200,0)" />

      {!iconOnly && (
        <text
          x="104"
          y="232"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="30"
          letterSpacing="8"
          fill="currentColor"
        >
          MATAEV
        </text>
      )}
    </svg>
  );
}
