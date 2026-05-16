import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-16">
      <div className="max-w-result mx-auto card p-8 text-center space-y-4">
        <div className="font-display text-[64px] font-bold text-brand">404</div>
        <h1 className="text-[20px] font-bold text-ink">Page not found</h1>
        <p className="text-[13.5px] text-ink-body">
          The URL you requested doesn&apos;t exist on this site.
        </p>
        <Link
          href="/"
          className="inline-block bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded text-[14px] font-medium no-underline"
        >
          Back to home →
        </Link>
      </div>
    </main>
  );
}
