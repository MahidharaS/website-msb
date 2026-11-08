import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * White light card from the owner's reference (preview_1.html): three blurred halos and a
 * pure white surface. Only size, radius and padding vary between uses.
 */
export function Glow({
  as: Tag = "div",
  children,
  className = "",
  radius = 28,
  style,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  radius?: number;
  style?: CSSProperties;
  [key: string]: unknown;
}) {
  return (
    <Tag
      className={`light-card ${className}`}
      style={{ "--r": `${radius}px`, ...style } as CSSProperties}
      {...rest}
    >
      <span className="halo halo-large" aria-hidden="true" />
      <span className="halo halo-medium" aria-hidden="true" />
      <span className="halo halo-tight" aria-hidden="true" />
      <span className="card-surface">{children}</span>
    </Tag>
  );
}
