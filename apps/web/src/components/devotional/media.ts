/** The URL of an image in content/, served by src/app/content. */
export function mediaUrl(kind: "devotionals" | "series", slug: string, file: string): string {
  return `/content/${kind}/${slug}/${file}`;
}
