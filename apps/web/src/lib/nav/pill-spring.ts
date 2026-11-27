/**
 * The liquid movement of the navigation pill (docs/design/landing_nav_new.html): its left and
 * right edges are two springs. The edge on the side it is heading for is stiffer, so the pill
 * stretches, then settles with a small overshoot.
 */

export type Span = { left: number; right: number };
type Edge = { x: number; v: number };
export type Pill = { left: Edge; right: Edge };

type Spring = { stiffness: number; damping: number };
const LEADING: Spring = { stiffness: 520, damping: 34 };
const TRAILING: Spring = { stiffness: 190, damping: 21 };

/** A longer gap between frames (a hidden tab) counts as this much, in seconds. */
const LONGEST_FRAME = 0.032;
const SUBSTEPS = 4;
/** At rest: this close in pixels, and this slow in pixels a second, both edges together. */
const NEAR = 0.4;
const SLOW = 4;

const MIN_SQUASH = 0.82;

/** A pill at rest on `span`. */
export const pillAt = ({ left, right }: Span): Pill => ({
  left: { x: left, v: 0 },
  right: { x: right, v: 0 },
});

function pull(edge: Edge, target: number, spring: Spring, seconds: number): Edge {
  const v = edge.v + (spring.stiffness * (target - edge.x) - spring.damping * edge.v) * seconds;
  return { x: edge.x + v * seconds, v };
}

/** The pill one frame later; once settled it sits exactly on the target. */
export function stepPill(pill: Pill, target: Span, seconds: number) {
  const slice = Math.min(seconds, LONGEST_FRAME) / SUBSTEPS;
  const rightward = target.left + target.right > pill.left.x + pill.right.x;
  let { left, right } = pill;
  for (let i = 0; i < SUBSTEPS; i++) {
    left = pull(left, target.left, rightward ? TRAILING : LEADING, slice);
    right = pull(right, target.right, rightward ? LEADING : TRAILING, slice);
  }
  const settled =
    Math.abs(left.x - target.left) + Math.abs(right.x - target.right) <= NEAR &&
    Math.abs(left.v) + Math.abs(right.v) <= SLOW;
  return { pill: settled ? pillAt(target) : { left, right }, settled };
}

/** The vertical scale of a pill `width` wide that rests at `restWidth`: thinner when stretched. */
export const squash = (width: number, restWidth: number) =>
  Math.max(MIN_SQUASH, Math.min(1, 1 - (width - restWidth) / (restWidth * 3.5)));
