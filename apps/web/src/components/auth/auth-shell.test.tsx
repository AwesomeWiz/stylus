import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("@/modules/auth/server/session", () => ({
  getAuthenticatedUser: mocks.user,
}));
vi.mock("@/modules/auth/actions", () => ({
  loginAction: mocks.login,
  signupAction: mocks.signup,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("redirect:" + path);
  },
}));
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import { AuthShell } from "./auth-shell";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(null);
});
describe("V2 authentication composition", () => {
  it("pairs the unchanged login form with decorative identity artwork", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/invite/return" }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in to Stylus" }),
    ).toBeInTheDocument();
    const visual = screen.getByRole("complementary", {
      name: "Stylus identity",
    });
    expect(visual.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(visual.querySelector("a, button, input, [tabindex]")).toBeNull();
    expect(visual.querySelector("[data-auth-tile]")).toBeInTheDocument();
    expect(
      screen.queryByText(/Use your work email and password/),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".brand-logo-light")).toHaveAttribute("src");
    expect(document.querySelector(".brand-logo-dark")).toHaveAttribute("src");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Think clearly.Build together.",
    );
    expect(
      screen.queryByText("Example Marketing workflow"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/signup?next=%2Finvite%2Freturn");
    expect(document.querySelector('input[name="next"]')).toHaveValue(
      "/invite/return",
    );
    expect(
      screen.queryByText(
        /forgot password|single sign-on|continue with google/i,
      ),
    ).not.toBeInTheDocument();
  });
  it("preserves signup fields, password-manager hints and the signin return path", async () => {
    render(
      await SignupPage({
        searchParams: Promise.resolve({ next: "/tasks?view=my" }),
      }),
    );
    expect(
      screen.queryByText(/then set up the organization/),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(
      screen.getByRole("complementary", { name: "Stylus identity" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Use at least 8 characters.",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Ftasks%3Fview%3Dmy",
    );
  });
  it("does not force the showcase into setup or invitation shells", () => {
    render(
      <AuthShell title="Join your team" description="Invitation details">
        <button>Accept invitation</button>
      </AuthShell>,
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Join your team",
    );
  });
  it.each([LoginPage, SignupPage])(
    "preserves existing signed-in redirects",
    async (page) => {
      mocks.user.mockResolvedValue({ id: "user" });
      await expect(page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
        "redirect:/",
      );
    },
  );
});

afterEach(cleanup);
