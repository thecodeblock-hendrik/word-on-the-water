/**
 * What the server stamps on a sign-up form when it draws one: the time (a form sent too fast is a
 * bot) and a key for this drawing (a repeat of the same post does nothing). Pages render once per
 * request, so each visit gets its own.
 */
export function drawSignup(): { renderedAt: number; idempotencyKey: string } {
  return { renderedAt: Date.now(), idempotencyKey: crypto.randomUUID() };
}
