/**
 * @file layout.tsx
 * @description Authenticated app shell: resolves the session server-side by verifying the nexus-session JWT
 *   cookie and wraps the dashboard in providers and the AppShell frame.
 * @architecture Reads the nexus-session HttpOnly cookie via next/headers, verifies it with jose's jwtVerify
 *   against AUTH_SECRET, and extracts the user payload. If missing or invalid, redirects to /signin
 *   (middleware also handles this as a belt-and-suspenders guard).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";

export const dynamic = "force-dynamic";

/**
 * @desc    Verify the nexus-session JWT and return the decoded user payload, or null if invalid
 */
export async function getSessionUser(): Promise<{
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexus-session")?.value;
    if (!token) return null;

    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { clockTolerance: 30 }); // Allow 30s clock skew

    if (!payload.sub) return null;

    return {
      id: payload.sub,
      name: (payload.name as string) ?? null,
      email: (payload.email as string) ?? null,
      image: (payload.image as string) ?? null,
    };
  } catch (err) {
    console.error("JWT Verification failed in layout.tsx:", err);
    return null;
  }
}

/**
 * @desc    Render the dashboard frame with the current session user
 * @param   {{children: React.ReactNode}} props - The page content inside the shell
 * @returns {JSX.Element} Providers + AppShell wrapping children
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/signin");
  }

  const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
    /\/+$/,
    "",
  );

  return (
    <Providers>
      <AppShell user={user} apiUrl={apiUrl}>
        {children}
      </AppShell>
    </Providers>
  );
}
