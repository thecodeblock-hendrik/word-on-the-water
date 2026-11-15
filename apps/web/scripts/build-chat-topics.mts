import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildTopics } from "../src/lib/chat/topics.ts";

const root = join(import.meta.dirname, "..");
const kb = JSON.parse(readFileSync(join(root, "../api/app/data/faith_kb.json"), "utf8"));
writeFileSync(
  join(root, "src/content/chat-topics.json"),
  JSON.stringify(buildTopics(kb), null, 2) + "\n",
);
console.log("chat-topics.json written");
