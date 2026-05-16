"use client";

// PASS 12 category list — exactly as specified.
const CHIPS: { label: string; query: string }[] = [
  { label: "Politics",          query: "election fraud claim" },
  { label: "Health",            query: "do vaccines cause autism" },
  { label: "Science",           query: "human caused climate change evidence" },
  { label: "Crime",             query: "violent crime rate rising" },
  { label: "AI images/videos",  query: "ai generated deepfake image" },
  { label: "Celebrity rumors",  query: "celebrity death hoax" },
  { label: "Finance scams",     query: "cryptocurrency investment scam" },
  { label: "Viral posts",       query: "viral screenshot fake quote" },
];

interface Props {
  onPick: (query: string) => void;
}

export default function SuggestionChips({ onPick }: Props) {
  return (
    <div className="space-y-2 text-left">
      <div className="text-[12px] text-ink-muted">
        Suggested topics
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
