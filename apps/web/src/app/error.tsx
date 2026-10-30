"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase">Something went wrong</h1>
      <p className="mt-4 max-w-[62ch] text-muted">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-semibold text-bg"
      >
        Try again
      </button>
    </section>
  );
}
