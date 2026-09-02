import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    redirect("/signin?error=auth_failed");
  }

  // Set the cookie natively in Next.js (100% reliable)
  const cookieStore = await cookies();
  cookieStore.set("nexus-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2592000, // 30 days
  });

  redirect("/projects");
}
