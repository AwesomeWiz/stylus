import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const actions = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn() }));
vi.mock("@/modules/auth/actions", () => ({
  loginAction: actions.login,
  signupAction: actions.signup,
}));
import { AuthForm } from "./auth-form";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
describe("auth form behavior through the visual redesign", () => {
  it("submits the existing credentials and return path, retaining a generic login error", async () => {
    actions.login.mockResolvedValue({
      status: "error",
      message: "Email or password is incorrect.",
    });
    render(<AuthForm mode="login" returnPath="/invite/existing-return" />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "founder@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-password" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await screen.findByRole("alert");
    const data = actions.login.mock.calls[0]![1] as FormData;
    expect(data.get("email")).toBe("founder@example.com");
    expect(data.get("password")).toBe("test-password");
    expect(data.get("next")).toBe("/invite/existing-return");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
  });
  it("keeps server field validation associated with the field", async () => {
    actions.login.mockResolvedValue({
      status: "error",
      fieldErrors: { email: ["Enter a valid email address."] },
    });
    render(<AuthForm mode="login" />);
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await screen.findByText("Enter a valid email address.");
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
  });
  it("preserves signup submission and the confirmation state", async () => {
    actions.signup.mockResolvedValue({
      status: "success",
      message:
        "Check your email to confirm your account, then return to sign in.",
    });
    render(<AuthForm mode="signup" returnPath="/invite/existing-return" />);
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Alex Morgan" },
    });
    fireEvent.submit(screen.getByLabelText("Full name").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Check your email to confirm your account",
      ),
    );
    expect((actions.signup.mock.calls[0]![1] as FormData).get("fullName")).toBe(
      "Alex Morgan",
    );
    expect((actions.signup.mock.calls[0]![1] as FormData).get("next")).toBe(
      "/invite/existing-return",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });
});
