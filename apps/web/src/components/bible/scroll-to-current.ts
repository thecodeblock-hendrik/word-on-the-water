/**
 * A ref callback: when the current item mounts, centre it in its list. Only the list's own scroll
 * box (marked data-scroll) moves; scrollIntoView would also scroll the page and the pickers around it.
 */
export function scrollToCurrent(element: HTMLElement | null) {
  const box = element?.closest<HTMLElement>("[data-scroll]");
  if (!element || !box) return;
  const top = element.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  box.scrollTop = top - (box.clientHeight - element.clientHeight) / 2;
}
