/** Arrow pointer used by the swarm cursors (multi-player canvas look). */
export function CursorGlyph() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
      <path
        d="M1.5 1.5 L16 9.2 L9.4 10.6 L6.3 17.6 Z"
        fill="currentColor"
        stroke="var(--background)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
