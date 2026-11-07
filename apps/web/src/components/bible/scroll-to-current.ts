/** A ref callback: when the current item mounts, scroll it to the middle of its list. */
export const scrollToCurrent = (element: HTMLElement | null) =>
  element?.scrollIntoView({ block: "center" });
