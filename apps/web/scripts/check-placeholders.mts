import { landing } from "../src/content/landing.ts";
import { privacyPolicy } from "../src/content/privacy.ts";
import { findPlaceholders } from "../src/lib/placeholders.ts";

const found = findPlaceholders({
  landing,
  privacy: privacyPolicy({ bibleEnabled: true, videosEnabled: true }),
});

if (found.length > 0) {
  console.error(`${found.length} placeholder(s) still in the landing and privacy content:`);
  for (const { path, text } of found) console.error(`  ${path}: ${text}`);
  process.exit(1);
}
console.log("No placeholders in the landing and privacy content.");
