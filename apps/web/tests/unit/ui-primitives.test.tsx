// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

afterEach(cleanup);

describe("Button", () => {
  it("is a 44px button of type button by default", () => {
    render(<Button>Sign me up</Button>);
    const button = screen.getByRole("button", { name: "Sign me up" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toMatch(/min-h-11/);
  });

  it("primary uses accent-ink, never the low-contrast accent, for its fill", () => {
    expect(buttonClasses("primary")).toMatch(/bg-accent-ink/);
    expect(buttonClasses("primary")).not.toMatch(/bg-accent(?!-)/);
  });

  it("offers on-deep and ghost variants", () => {
    expect(buttonClasses("primary-on-deep")).toMatch(/bg-on-deep/);
    expect(buttonClasses("ghost")).toMatch(/border-current/);
  });

  it("busy disables the button and sets aria-busy", () => {
    render(<Button busy>Signing you up</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("Label and Input", () => {
  it("a label is tied to its field", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("uses at least 16px text so iOS does not zoom", () => {
    render(<Input aria-label="x" />);
    expect(screen.getByRole("textbox").className).toMatch(/text-base/);
  });

  it("invalid sets aria-invalid", () => {
    render(<Input aria-label="x" invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("is not marked invalid by default", () => {
    render(<Input aria-label="x" />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Textarea", () => {
  it("is labelled, 16px and can be invalid", () => {
    render(
      <>
        <Label htmlFor="body">Request</Label>
        <Textarea id="body" invalid />
      </>,
    );
    const field = screen.getByLabelText("Request");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field.className).toMatch(/text-base/);
  });
});

describe("Checkbox", () => {
  it("is a labelled checkbox with a 44px target", () => {
    render(<Checkbox id="ok" label="OK to email the prayer team" />);
    const box = screen.getByRole("checkbox", { name: "OK to email the prayer team" });
    expect(box).not.toBeChecked();
    expect(box.closest("label")?.className).toMatch(/min-h-11/);
  });
});

describe("FieldError", () => {
  it("has a tone with enough contrast on the dark band", () => {
    render(
      <FieldError id="on-deep-error" tone="on-deep">
        Enter a valid email address.
      </FieldError>,
    );
    expect(screen.getByText("Enter a valid email address.").className).toContain(
      "text-accent-on-deep",
    );
  });

  it("renders the message with the id used by aria-describedby", () => {
    render(<FieldError id="email-error">Enter an email address like name@example.com</FieldError>);
    const error = screen.getByText(/enter an email address/i);
    expect(error).toHaveAttribute("id", "email-error");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FieldError id="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
