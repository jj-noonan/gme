import { FlapTile } from "./FlapTile.js";

// Real split-flap boards flip character-by-character in a cascade, not all
// at once — this is the delay between each tile's flip start.
const STAGGER_MS = 22;

export function FlapText({ text, width }: { text: string; width?: number }) {
  const padded = width ? text.toUpperCase().padEnd(width).slice(0, width) : text.toUpperCase();
  return (
    <span className="flap-text">
      {[...padded].map((char, i) => (
        <FlapTile key={i} char={char} delayMs={i * STAGGER_MS} />
      ))}
    </span>
  );
}
