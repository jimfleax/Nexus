import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as syncGET } from "../sync/route";
import { POST as signoutPOST } from "../signout/route";

vi.mock("next/server", () => {
  class NextResponse extends Response {
    cookies: any;
    constructor(body?: any, init?: any) {
      super(body, init);
      this.cookies = { set: vi.fn(), delete: vi.fn() };
    }
    static redirect(url: any) {
      const r = new NextResponse(null, { status: 302 });
      r.headers.set("location", String(url));
      return r;
    }
    static json(obj: any) {
      return new NextResponse(JSON.stringify(obj), {
        headers: { "content-type": "application/json" },
      });
    }
  }
  return { NextResponse };
});

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/auth/sync", () => {
  it("redirects to signin with auth_failed if no token param", async () => {
    const req = new Request("http://localhost/api/auth/sync");
    const res = (await syncGET(req)) as any;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/signin?error=auth_failed");
  });

  it("redirects to signin with auth_failed if token param is empty string", async () => {
    const req = new Request("http://localhost/api/auth/sync?token=");
    const res = (await syncGET(req)) as any;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/signin?error=auth_failed");
  });

  it("redirects to /projects if token is present", async () => {
    const req = new Request("http://localhost/api/auth/sync?token=abc");
    const res = (await syncGET(req)) as any;
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/projects");
  });

  it("sets nexus-session cookie with token and correct options", async () => {
    const req = new Request("http://localhost/api/auth/sync?token=abc");
    const res = (await syncGET(req)) as any;
    expect(res.cookies.set).toHaveBeenCalledWith(
      "nexus-session",
      "abc",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 2592000,
      }),
    );
  });

  it("sets secure: true cookie if NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = new Request("http://localhost/api/auth/sync?token=abc");
    const res = (await syncGET(req)) as any;
    expect(res.cookies.set).toHaveBeenCalledWith(
      "nexus-session",
      "abc",
      expect.objectContaining({ secure: true }),
    );
  });

  it("sets secure: false cookie if NODE_ENV is test/development", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const req = new Request("http://localhost/api/auth/sync?token=abc");
    const res = (await syncGET(req)) as any;
    expect(res.cookies.set).toHaveBeenCalledWith(
      "nexus-session",
      "abc",
      expect.objectContaining({ secure: false }),
    );
  });
});

describe("POST /api/auth/signout", () => {
  it("returns ok JSON and deletes nexus-session cookie", async () => {
    const req = new Request("http://localhost/api/auth/signout", {
      method: "POST",
    });
    const res = (await signoutPOST()) as any;

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json();
    expect(body).toEqual({ ok: true });

    expect(res.cookies.delete).toHaveBeenCalledWith("nexus-session");
  });
});
