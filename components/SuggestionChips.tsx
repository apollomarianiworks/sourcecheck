"use client";

const CHIPS: { label: string; query: string }[] = [
  { label: "Elections",          query: "election fraud" },
  { label: "Health claims",      query: "do vaccines cause autism" },
  { label: "Celebrity rumors",   query: "celebrity death hoax" },
  { label: "AI images & videos", query: "ai generated deepfake image" },
  { label: "Crime claims",       query: "crime statistics rising" },
  { label: "Viral screenshots",  query: "viral screenshot fake" },
  { label: "Financial scams",    query: "cryptocurrency investment scam" },
];

interface Props {
  onPick: (query: string) => void;
}

export default function SuggestionChips({ onPick }: Props) {
  return (
    <div className="space-y-2 text-left">
      <div className="text-[12px] text-ink-muted">
        Suggested starting points
        <span className="text-ink-dim"> — click to fill the search bar. You can edit before checking.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => onPick(c.query)}
            type="button"
            className="
              text-[13px] px-3 py-1.5 rounded border border-line
              bg-chip text-ink-body
              hover:bg-section hover:border-ink-dim
              transition-colors
            "
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
