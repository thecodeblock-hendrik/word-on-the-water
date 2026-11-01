import type { Instrumentation } from "next";

/** Starts error reporting once per server instance (Node.js runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { initSentry } = await import("@/lib/sentry");
  initSentry(process.env.SENTRY_DSN || undefined);
}

/** Reports server errors by route and type; the request itself (path, query, headers) is never sent. */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const { captureException } = await import("@sentry/node");
  const digest = (error as { digest?: string }).digest;
  captureException(error, {
    tags: { routePath: context.routePath, routeType: context.routeType, digest },
  });
};
