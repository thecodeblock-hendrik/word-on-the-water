import "server-only";

import { type Env, getEnv } from "@/lib/env";

const TIMEOUT_MS = 10_000;

export type ApiOptions = {
  method?: string;
  body?: unknown;
  /** The visitor's IP, forwarded so the API can rate limit the right person. */
  clientIp?: string;
};

/** Builds a server-side client for the FastAPI service (the browser never calls it directly). */
export function createApiClient(env: Env, fetchImpl: typeof fetch = fetch) {
  return function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
    const headers = new Headers({ Authorization: `Bearer ${env.SERVICE_TOKEN}` });
    if (options.clientIp) headers.set("X-Forwarded-For", options.clientIp);
    if (env.API_BYPASS_SECRET) {
      headers.set("x-vercel-protection-bypass", env.API_BYPASS_SECRET);
    }
    if (options.body !== undefined) headers.set("Content-Type", "application/json");

    return fetchImpl(`${env.API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  };
}

export function apiFetch(path: string, options?: ApiOptions): Promise<Response> {
  return createApiClient(getEnv())(path, options);
}
