import { FlapTile } from "./FlapTile.js";

export function FlapText({ text, width }: { text: string; width?: number }) {
  const padded = width ? text.toUpperCase().padEnd(width).slice(0, width) : text.toUpperCase();
  return (
    <span className="flap-text">
      {[...padded].map((char, i) => (
        <FlapTile key={i} char={char} />
      ))}
    </span>
  );
}
