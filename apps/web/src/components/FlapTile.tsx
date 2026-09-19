import { useEffect, useRef, useState } from "react";

const FLIP_DURATION_MS = 360;

export function FlapTile({ char }: { char: string }) {
  const [display, setDisplay] = useState(char);
  const [flipping, setFlipping] = useState(false);
  const prevChar = useRef(char);

  useEffect(() => {
    if (prevChar.current === char) return;
    prevChar.current = char;
    setFlipping(true);
    const timeout = setTimeout(() => {
      setDisplay(char);
      setFlipping(false);
    }, FLIP_DURATION_MS / 2);
    return () => clearTimeout(timeout);
  }, [char]);

  return (
    <span className={`flap-tile${flipping ? " flap-tile--flipping" : ""}`}>
      <span className="flap-tile__face">{display === " " ? " " : display}</span>
    </span>
  );
}
