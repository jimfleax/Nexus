/**
 * @file route.ts
 * @description Next.js route handler proxying list reordering to the backend.
 * @architecture Authenticates the session, mints a service JWT, and forwards PATCH to the Fastify reorder endpoint.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SignJWT } from "jose";

const API_URL = process.env.API_URL || "http://localhost:8080";

/**
 * @desc    Build authenticated backend headers, minting a service JWT from the session and forwarding the Origin
 * @param   {NextRequest} req - The incoming Next.js request
 * @returns {Promise<Record<string, string>>} Headers for the proxied backend request
 */
async function getBackendHeaders(req: NextRequest) {
  const session = await auth();
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ sub: session?.user?.id })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (req.method !== "GET" && req.method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  const origin = req.headers.get("origin");
  if (origin) {
    headers["Origin"] = origin;
  }

  return headers;
}

/**
 * @desc    Proxy PATCH /api/projects/:projectId/lists/reorder to the backend
 * @param   {NextRequest} req - The incoming request body with the reorder payload
 * @returns {Promise<NextResponse>} A success response or an error response
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const body = await req.text();
  const headers = await getBackendHeaders(req);
  const res = await fetch(
    `${API_URL}/api/projects/${projectId}/lists/reorder`,
    {
      method: "PUT",
      headers,
      body,
    },
  );

  if (!res.ok) {
    const error = await res.text();
    return NextResponse.json({ error }, { status: res.status });
  }
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data);
}
