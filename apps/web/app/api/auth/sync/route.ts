import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/signin?error=auth_failed", request.url),
    );
  }

  const response = NextResponse.redirect(new URL("/projects", request.url));

  response.cookies.set("nexus-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2592000, // 30 days
  });

  return response;
}
