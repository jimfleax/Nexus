import { toast } from "sonner";

export async function signOut(): Promise<void> {
  try {
    const res = await fetch("/api/auth/signout", { method: "POST" });
    if (res.ok) window.location.href = "/signin";
    else toast.error("Failed to sign out");
  } catch {
    toast.error("Failed to sign out");
  }
}
