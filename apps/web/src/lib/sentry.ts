import "server-only";
import * as Sentry from "@sentry/node";

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const KEPT_HEADERS = new Set(["accept", "content-type", "user-agent"]);

const mask = (text: string) => text.replace(EMAIL, "[email]");

/**
 * Sentry beforeSend: drop bodies, cookies, query strings, auth headers, locals and the user,
 * and mask email addresses in messages, exceptions and breadcrumbs.
 */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.request) {
    const { headers = {} } = event.request;
    event.request = {
      ...event.request,
      data: undefined,
      cookies: undefined,
      query_string: undefined,
      headers: Object.fromEntries(
        Object.entries(headers).filter(([name]) => KEPT_HEADERS.has(name.toLowerCase())),
      ),
    };
    for (const key of ["data", "cookies", "query_string"] as const) delete event.request[key];
  }
  delete event.user;
  if (event.message) event.message = mask(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = mask(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = mask(crumb.message);
    delete crumb.data;
  }
  return event;
}

/** Starts Sentry when a DSN is configured; otherwise does nothing. */
export function initSentry(dsn: string | undefined): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "local",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    includeLocalVariables: false,
    beforeSend: scrubEvent,
  });
}
