import "server-only";
import { z } from "zod";

const schema = z.object({
  API_BASE_URL: z.url(),
  SERVICE_TOKEN: z.string().min(16),
  /** The API project's protection-bypass secret (not this project's VERCEL_AUTOMATION_BYPASS_SECRET). */
  API_BYPASS_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

/** Validates server-side environment variables. Blank values count as unset. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value));
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
