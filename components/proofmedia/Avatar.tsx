"use client";

interface Props {
  name: string;
  src?: string | null;
  size?: number;
}

/** Small initials-only avatar. Loads a real image only if `src` is provided. */
export default function Avatar({ name, src, size = 32 }: Props) {
  const initials = (name || "?")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full bg-section object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-section text-ink-muted font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.4)) }}
      title={name}
    >
      {initials}
    </span>
  );
}
