export type KbForTopics = {
  themes: { number: number; name: string }[];
  entries: { id: string; theme_number: number; question: string }[];
};

export type Topic = {
  number: number;
  name: string;
  entries: { id: string; question: string }[];
};

/** The themes with their questions, for the topic browser. Only ids and questions, no answers. */
export function buildTopics(kb: KbForTopics): Topic[] {
  return kb.themes.map(({ number, name }) => ({
    number,
    name,
    entries: kb.entries
      .filter((e) => e.theme_number === number)
      .map(({ id, question }) => ({ id, question })),
  }));
}
