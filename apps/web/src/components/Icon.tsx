import { ICONS, type IconName } from "../lib/icons.js";

/**
 * Line icon from the GME set. Color comes from `currentColor`.
 * Pass `title` when the icon carries meaning without adjacent text.
 */
export function Icon({
  name,
  size = 24,
  title,
}: {
  name: IconName;
  size?: 16 | 20 | 24;
  title?: string;
}) {
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : "") + ICONS[name] }}
    />
  );
}
