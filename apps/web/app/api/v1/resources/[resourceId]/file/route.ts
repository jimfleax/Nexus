/**
 * @file route.ts
 * @description Next.js route handler proxying the resource file stream from the backend.
 * @architecture Authenticates the session, mints a service JWT, and proxies the binary file stream.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SignJWT } from "jose";

const API_URL = process.env.API_URL || "http://localhost:8080";

async function getBackendHeaders(req: NextRequest) {
  const session = await auth();
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ sub: session?.user?.id })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const range = req.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  return headers;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resourceId } = await params;
  const headers = await getBackendHeaders(req);

  try {
    const res = await fetch(`${API_URL}/api/resources/${resourceId}/file`, {
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();

    const responseHeaders = new Headers();
    const safeHeaders = [
      "content-type",
      "content-length",
      "content-disposition",
      "accept-ranges",
      "content-range",
    ];
    res.headers.forEach((value, key) => {
      if (safeHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set("content-length", arrayBuffer.byteLength.toString());
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");

    return new NextResponse(arrayBuffer, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
