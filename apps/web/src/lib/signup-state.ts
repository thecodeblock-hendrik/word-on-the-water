/** What the sign-up form shows. Plain data, shared by the Server Action and the form. */
export type SignupState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message?: string;
      /** True when the Turnstile token went to the API: a token works once, so the widget resets. */
      tokenUsed?: boolean;
      fieldErrors?: { email?: string; firstName?: string };
      /** What was typed, so the fields keep their values (React clears a form after its action). */
      values?: { email: string; firstName: string };
    };

export const idleSignup: SignupState = { status: "idle" };
