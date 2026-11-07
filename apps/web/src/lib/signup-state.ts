/** What the sign-up form shows. Plain data, shared by the Server Action and the form. */
export type SignupState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message?: string;
      fieldErrors?: { email?: string; firstName?: string };
    };

export const idleSignup: SignupState = { status: "idle" };
