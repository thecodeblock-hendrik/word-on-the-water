import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase">Page not found</h1>
      <p className="mt-4 max-w-[62ch] text-muted">That page does not exist or has moved.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center text-accent-ink underline">
        Back to the home page
      </Link>
    </section>
  );
}
