import Scanner from "@/components/Scanner";

export default function HomePage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-4 md:py-6">
      <Scanner />
      <SiteFooter />
    </main>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 pt-6 border-t border-line text-[12px] text-ink-muted space-y-1.5">
      <div>
        Data sources: Google Fact Check Tools (when API key present) · GDELT 2.0 DOC API · Wikimedia REST · Local source rules.
      </div>
      <div>
        Free · No account · No paid services · No tracking.
      </div>
      <div>
        &copy; {new Date().getFullYear()} SourceCheck — Educational tool. Not a substitute for primary sources or professional advice.
      </div>
    </footer>
  );
}
