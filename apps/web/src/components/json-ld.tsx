/**
 * Structured data for search engines, as a JSON-LD script. It is data, not code, so the CSP does not
 * run it. A "<" is written as < so that nothing in the data can close the script tag.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
