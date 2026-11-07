// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "@/components/signup/signup-form";
import { signup } from "@/content/landing";
import type { SignupState } from "@/lib/signup-state";

const subscribe = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/subscribe", () => ({ subscribe }));
vi.mock("next/script", () => ({
  default: ({ src }: { src: string }) => <span data-testid="turnstile-script" data-src={src} />,
}));

const props = {
  source: "landing_closing",
  renderedAt: 1790000000000,
  idempotencyKey: "11111111-2222-3333-4444-555555555555",
  siteKey: "1x00000000000000000000AA",
};

beforeEach(() => subscribe.mockReset());
afterEach(cleanup);

const submit = () => fireEvent.click(screen.getByRole("button", { name: signup.button }));
const answer = (state: SignupState) => subscribe.mockResolvedValue(state);

describe("SignupForm fields", () => {
  it("has a visible, required email field for phones", () => {
    render(<SignupForm {...props} />);
    const email = screen.getByLabelText(signup.emailLabel);
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("name", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAttribute("inputmode", "email");
    expect(email).toBeRequired();
  });

  it("has an optional first name field", () => {
    render(<SignupForm {...props} />);
    const name = screen.getByLabelText(signup.nameLabel);
    expect(name).toHaveAttribute("autocomplete", "given-name");
    expect(name).not.toBeRequired();
  });

  it("hides the trap field from people: out of sight, out of the tab order, not announced", () => {
    render(<SignupForm {...props} />);
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap.tabIndex).toBe(-1);
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest("[aria-hidden=true]")).not.toBeNull();
    expect(trap.value).toBe("");
  });

  it("carries where it came from, when it was drawn and the idempotency key", () => {
    render(<SignupForm {...props} />);
    const hidden = (name: string) =>
      document.querySelector<HTMLInputElement>(`input[type=hidden][name="${name}"]`)?.value;
    expect(hidden("source")).toBe("landing_closing");
    expect(hidden("rendered_at")).toBe("1790000000000");
    expect(hidden("idempotency_key")).toBe(props.idempotencyKey);
  });

  it("shows the Turnstile widget for the site key", () => {
    render(<SignupForm {...props} />);
    const widget = document.querySelector(".cf-turnstile");
    expect(widget).toHaveAttribute("data-sitekey", props.siteKey);
    expect(widget).toHaveAttribute("data-appearance", "interaction-only");
  });

  it("in a browser without IntersectionObserver, waits until a field is used", () => {
    render(<SignupForm {...props} />);
    expect(screen.queryByTestId("turnstile-script")).toBeNull();
    fireEvent.focusIn(screen.getByLabelText(signup.emailLabel));
    expect(screen.getAllByTestId("turnstile-script")).toHaveLength(1);
    expect(screen.getByTestId("turnstile-script").dataset.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js",
    );
  });

  it("says what they agree to next to the button, and the button is 44px tall", () => {
    render(<SignupForm {...props} />);
    expect(screen.getByText(signup.consent)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: signup.button }).className).toMatch(/min-h-11/);
  });

  it("says so, and shows no form, when there is no site key", () => {
    render(<SignupForm {...props} siteKey={undefined} />);
    expect(screen.getByText(signup.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: signup.button })).toBeNull();
  });
});

describe("SignupForm answers", () => {
  it("sends the typed fields to the Server Action", async () => {
    answer({ status: "success" });
    render(<SignupForm {...props} />);
    fireEvent.change(screen.getByLabelText(signup.emailLabel), {
      target: { value: "reader@example.com" },
    });
    submit();
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    const form = subscribe.mock.calls[0][1] as FormData;
    expect(form.get("email")).toBe("reader@example.com");
    expect(form.get("source")).toBe("landing_closing");
  });

  it("replaces the form with a check-your-inbox message on success", async () => {
    answer({ status: "success" });
    render(<SignupForm {...props} />);
    fireEvent.change(screen.getByLabelText(signup.emailLabel), {
      target: { value: "reader@example.com" },
    });
    submit();
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(signup.success.heading);
    expect(status).toHaveTextContent(signup.success.body);
    expect(screen.queryByLabelText(signup.emailLabel)).toBeNull();
  });

  it("shows a field error on the field and keeps what was typed", async () => {
    answer({
      status: "error",
      fieldErrors: { email: "Enter a valid email address." },
      values: { email: "a@b", firstName: "Ann" },
    });
    render(<SignupForm {...props} />);
    fireEvent.change(screen.getByLabelText(signup.emailLabel), { target: { value: "a@b" } });
    submit();
    const email = await screen.findByLabelText(signup.emailLabel);
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    const error = screen.getByText("Enter a valid email address.");
    expect(email.getAttribute("aria-describedby")).toContain(error.id);
    expect(email).toHaveValue("a@b");
    expect(screen.getByLabelText(signup.nameLabel)).toHaveValue("Ann");
  });

  it("announces a general error and resets the widget, because a Turnstile token is used once", async () => {
    const reset = vi.fn();
    (window as unknown as { turnstile: { reset: () => void } }).turnstile = { reset };
    answer({
      status: "error",
      message: "The check did not pass. Please try again.",
      tokenUsed: true,
      values: { email: "reader@example.com", firstName: "" },
    });
    render(<SignupForm {...props} />);
    fireEvent.change(screen.getByLabelText(signup.emailLabel), {
      target: { value: "reader@example.com" },
    });
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The check did not pass. Please try again.",
    );
    await waitFor(() => expect(reset).toHaveBeenCalled());
    expect(screen.getByLabelText(signup.emailLabel)).toHaveValue("reader@example.com");
  });

  it("leaves the widget alone when the token was not spent, so the visitor does not wait again", async () => {
    const reset = vi.fn();
    (window as unknown as { turnstile: { reset: () => void } }).turnstile = { reset };
    answer({
      status: "error",
      fieldErrors: { email: "Enter a valid email address." },
      values: { email: "a@b", firstName: "" },
    });
    render(<SignupForm {...props} />);
    fireEvent.change(screen.getByLabelText(signup.emailLabel), { target: { value: "a@b" } });
    submit();
    await screen.findByText("Enter a valid email address.");
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("SignupForm loads Cloudflare's script only when needed", () => {
  let intersect: (isIntersecting: boolean) => void;
  const observed = vi.fn();

  beforeEach(() => {
    observed.mockClear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          intersect = (isIntersecting) => callback([{ isIntersecting }]);
        }
        observe = observed;
        disconnect = vi.fn();
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not load it for a visitor who never reaches the form", () => {
    render(<SignupForm {...props} />);
    expect(observed).toHaveBeenCalled();
    expect(screen.queryByTestId("turnstile-script")).toBeNull();
  });

  it("loads it as the form comes near the screen", () => {
    render(<SignupForm {...props} />);
    act(() => intersect(false));
    expect(screen.queryByTestId("turnstile-script")).toBeNull();
    act(() => intersect(true));
    expect(screen.getAllByTestId("turnstile-script")).toHaveLength(1);
  });

  it("loads it as soon as someone uses a field", () => {
    render(<SignupForm {...props} />);
    fireEvent.focusIn(screen.getByLabelText(signup.emailLabel));
    expect(screen.getAllByTestId("turnstile-script")).toHaveLength(1);
  });
});
