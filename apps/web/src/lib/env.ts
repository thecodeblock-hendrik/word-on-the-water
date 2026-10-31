import "server-only";
import { z } from "zod";

const schema = z.object({
  API_BASE_URL: z.url(),
  SERVICE_TOKEN: z.string().min(16),
  /** The API project's protection-bypass secret (not this project's VERCEL_AUTOMATION_BYPASS_SECRET). */
  API_BYPASS_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

/** On a preview, the API preview of the same branch: its alias differs only in the project name. */
function previewApiUrl(source: Record<string, string | undefined>): string | undefined {
  if (source.VERCEL_ENV !== "preview" || !source.VERCEL_BRANCH_URL) return undefined;
  return `https://${source.VERCEL_BRANCH_URL.replace(/^wotw-web-/, "wotw-api-")}`;
}

/** Validates server-side environment variables. Blank values count as unset. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value));
  present.API_BASE_URL ??= previewApiUrl(present);
  const result = schema.safeParse(present);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
