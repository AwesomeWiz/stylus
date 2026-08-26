import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn<(path: string) => never>(),
  revalidatePath: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { loginAction, logoutAction, signupAction } from "./actions";
import { initialAuthActionState } from "./schemas";

describe("authentication actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
        signUp: mocks.signUp,
      },
    });
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("does not call Supabase when login input is invalid", async () => {
    const formData = new FormData();
    formData.set("email", "invalid");
    formData.set("password", "");

    const result = await loginAction(initialAuthActionState, formData);

    expect(result.status).toBe("error");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("creates a session with normalized credentials and redirects", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const formData = new FormData();
    formData.set("email", "Founder@Example.com");
    formData.set("password", "correct-horse");

    await expect(loginAction(initialAuthActionState, formData)).rejects.toThrow(
      "redirect:/",
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "founder@example.com",
      password: "correct-horse",
    });
  });

  it("returns to a validated invitation after sign in", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const token = "A".repeat(43);
    const formData = new FormData();
    formData.set("email", "founder@example.com");
    formData.set("password", "correct-horse");
    formData.set("next", `/invite/${token}`);
    await expect(loginAction(initialAuthActionState, formData)).rejects.toThrow(
      `redirect:/invite/${token}`,
    );
  });

  it("returns a non-enumerating login error", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials" },
    });
    const formData = new FormData();
    formData.set("email", "founder@example.com");
    formData.set("password", "incorrect-password");

    const result = await loginAction(initialAuthActionState, formData);

    expect(result).toEqual({
      message: "Email or password is incorrect.",
      status: "error",
    });
  });

  it("returns a confirmation state when signup has no session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const formData = new FormData();
    formData.set("email", "founder@example.com");
    formData.set("fullName", "Alex Morgan");
    formData.set("password", "correct-horse");

    const result = await signupAction(initialAuthActionState, formData);

    expect(result.status).toBe("success");
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "founder@example.com",
        password: "correct-horse",
      }),
    );
  });

  it("terminates the Supabase session before redirecting", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(logoutAction()).rejects.toThrow("redirect:/login");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
