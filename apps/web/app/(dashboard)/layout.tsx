/**
 * @file layout.tsx
 * @description Authenticated app shell: resolves the session server-side and wraps the dashboard in providers and the AppShell frame.
 */
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";

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
  const session = await auth();

  return (
    <Providers>
      <AppShell user={session?.user}>{children}</AppShell>
    </Providers>
  );
}
