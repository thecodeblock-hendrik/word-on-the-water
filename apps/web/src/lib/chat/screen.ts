/** True below `lg`, where the chat is a full screen sheet; from `lg` it is a drawer. */
export function isPhoneScreen(): boolean {
  return !window.matchMedia("(min-width: 1024px)").matches;
}
