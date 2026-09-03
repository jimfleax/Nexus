/**
 * @file auth.ts
 * @description Provides authentication utilities for the frontend.
 * @architecture Handles client-side auth state clearing by communicating with the backend sign-out endpoint.
 */
import { toast } from "sonner";

/**
 * @desc Signs the user out by clearing the HTTP-only cookie and redirecting to the sign-in page.
 * @returns {Promise<void>}
 */
export async function signOut(): Promise<void> {
  try {
    const res = await fetch("/api/auth/signout", { method: "POST" });
    if (res.ok) window.location.href = "/signin";
    else toast.error("Failed to sign out");
  } catch {
    toast.error("Failed to sign out");
  }
}
