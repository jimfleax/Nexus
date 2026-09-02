import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import DashboardLayout, { getSessionUser } from "../layout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

// Mock the heavy components so the RSC renders instantly
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: () => "AppShellMock",
}));
vi.mock("@/components/providers", () => ({
  Providers: () => "ProvidersMock",
}));

const mockCookie = (value: string | undefined) => {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === "nexus-session" && value ? { name, value } : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe("Dashboard Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_SECRET", "test-secret-12345678901234567890");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getSessionUser", () => {
    it("returns null if no cookie", async () => {
      mockCookie(undefined);
      expect(await getSessionUser()).toBeNull();
    });

    it("returns null if AUTH_SECRET is unset", async () => {
      vi.stubEnv("AUTH_SECRET", "");
      mockCookie("token");
      expect(await getSessionUser()).toBeNull();
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it("returns mapped user payload if valid", async () => {
      mockCookie("valid.token");
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: "u1", name: "N", email: "e@x", image: "img" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const user = await getSessionUser();
      expect(user).toEqual({ id: "u1", name: "N", email: "e@x", image: "img" });
    });

    it("returns null if payload has no sub", async () => {
      mockCookie("valid.token");
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { name: "N" }, // missing sub
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(await getSessionUser()).toBeNull();
    });

    it("nulled fields if missing name/email/image", async () => {
      mockCookie("valid.token");
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: "u1" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(await getSessionUser()).toEqual({
        id: "u1",
        name: null,
        email: null,
        image: null,
      });
    });

    it("returns null if jwtVerify throws", async () => {
      mockCookie("invalid.token");
      vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid"));

      // hide the console.error from test output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(await getSessionUser()).toBeNull();

      consoleSpy.mockRestore();
    });

    it("verifies with clockTolerance: 30", async () => {
      mockCookie("valid.token");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: "u1" } } as any);

      await getSessionUser();

      // key is Uint8Array
      expect(jwtVerify).toHaveBeenCalledWith(
        "valid.token",
        expect.any(Uint8Array),
        { clockTolerance: 30 },
      );
    });

    it("returns null if cookie is empty string", async () => {
      mockCookie("");
      expect(await getSessionUser()).toBeNull();
    });
  });

  describe("DashboardLayout Component", () => {
    it("redirects to /signin if no user", async () => {
      mockCookie(undefined); // getSessionUser will return null

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await DashboardLayout({ children: "child" } as any);
        // should not reach here
        expect.unreachable("Layout should have thrown redirect");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e.message).toBe("REDIRECT");
        expect(redirect).toHaveBeenCalledWith("/signin");
      }
    });

    it("renders children wrapped in Providers and AppShell if user valid", async () => {
      mockCookie("valid");
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: "u1", name: "N", email: "e@x", image: "img" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = (await DashboardLayout({ children: "child" } as any)) as any;

      expect(redirect).not.toHaveBeenCalled();

      expect(el).toBeDefined();
      expect(el.props).toBeDefined();

      const providersRender = el;
      const appShellRender = providersRender.props.children;
      expect(appShellRender.props.user).toEqual({
        id: "u1",
        name: "N",
        email: "e@x",
        image: "img",
      });
    });
  });
});
