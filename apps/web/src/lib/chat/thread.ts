import { z } from "zod";

export const MAX_THREAD = 30;
export const MAX_IDS = 20;

const option = z.object({ id: z.string(), question: z.string() });

const termView = z.object({
  term: z.string(),
  meaning: z.string(),
  key_verses: z.array(z.string()),
  entries: z.array(option),
});

const entryView = z.object({
  id: z.string(),
  question: z.string(),
  short_answer: z.string(),
  explanation: z.string(),
  contested: z.boolean(),
  contested_note: z.string().nullable(),
  key_verses: z.array(z.string()),
  related: z.array(option),
  glossary_terms: z.array(termView),
});

const replySchema = z.object({
  kind: z.enum(["answer", "clarify", "no_answer", "crisis", "smalltalk", "rejected", "term"]),
  kb_version: z.string(),
  entry: entryView.nullable(),
  term: termView.nullable(),
  options: z.array(option),
  text: z.string().nullable(),
  reason: z.string().nullable(),
  expand: z.boolean(),
});

export type ChatReply = z.infer<typeof replySchema>;
export type EntryView = z.infer<typeof entryView>;
export type TermView = z.infer<typeof termView>;
export type Option = z.infer<typeof option>;

/** Checks a reply from the API, or one read back from sessionStorage, before it is drawn. */
export const parseReply = (value: unknown) => replySchema.safeParse(value);

export type ThreadItem = { role: "me"; text: string } | { role: "bot"; reply: ChatReply };
export type Thread = ThreadItem[];

export const threadSchema = z.array(
  z.union([
    z.object({ role: z.literal("me"), text: z.string() }),
    z.object({ role: z.literal("bot"), reply: replySchema }),
  ]),
);

const newest = <T>(items: T[], max: number) => items.slice(-max);

export const addVisitor = (thread: Thread, text: string): Thread =>
  newest([...thread, { role: "me", text }], MAX_THREAD);

export const addReply = (thread: Thread, reply: ChatReply): Thread =>
  newest([...thread, { role: "bot", reply }], MAX_THREAD);

export type ChatContext = {
  last_entry_id: string | null;
  seen_entry_ids: string[];
  explained_entry_ids: string[];
};

/** What the API needs to follow the conversation: entry ids only, never any text. */
export function buildContext(thread: Thread): ChatContext {
  const answers = thread.flatMap((item) =>
    item.role === "bot" && item.reply.kind === "answer" && item.reply.entry ? [item.reply] : [],
  );
  const unique = (ids: string[]) => newest([...new Set(ids)], MAX_IDS);
  return {
    last_entry_id: answers.at(-1)?.entry?.id ?? null,
    seen_entry_ids: unique(answers.map((r) => r.entry?.id ?? "")),
    explained_entry_ids: unique(answers.filter((r) => r.expand).map((r) => r.entry?.id ?? "")),
  };
}
