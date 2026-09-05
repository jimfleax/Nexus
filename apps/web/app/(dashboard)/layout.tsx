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
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { getSessionUser } from "@/lib/session";

export { getSessionUser };

export const dynamic = "force-dynamic";

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

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexus-session")?.value || "";

  const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
    /\/+$/,
    "",
  );

  return (
    <Providers>
      <AppShell user={user} apiUrl={apiUrl} sessionToken={sessionToken}>
        {children}
      </AppShell>
    </Providers>
  );
}
