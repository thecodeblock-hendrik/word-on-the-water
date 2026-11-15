/** Wording and fixed choices for the Got Questions panel. */
export const chat = {
  title: "Got Questions",
  intro: "Ask about the Christian faith.",
  introNote: "Answers come from our own knowledge base. It is not a replacement for a pastor.",
  privacy: "Please don't share personal details.",
  inputLabel: "Your question",
  placeholder: "Type your question",
  followUpPlaceholder: "Ask a follow-up",
  send: "Send",
  close: "Close",
  clear: "Clear chat",
  readMore: "Read more",
  yourChat: "Your chat",
  hideYourChat: "Hide the Your chat button",
  browse: "Browse by topic",
  browseShort: "Browse topics",
  starterLabel: "Try one of these",
  verses: "Key scriptures",
  related: "You might also ask",
  mail: "hello@wordonthewater.net",
  emailUs: "Email us instead",
  errors: {
    personal_details:
      "This chat can't take personal details. Please ask a question about the Christian faith. To reach a person, email hello@wordonthewater.net.",
    too_long: "Please keep your question under 300 characters.",
    generic: "Something went wrong. Please try again.",
  },
  /** Ids from the knowledge base; a test checks they are still there with these questions. */
  starters: [
    { id: "2.1", question: "Who is Jesus?" },
    { id: "3.1", question: "What is the gospel?" },
    { id: "1.1", question: "Does God exist?" },
  ],
} as const;
