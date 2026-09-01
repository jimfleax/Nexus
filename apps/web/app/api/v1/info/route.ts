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

  const origin = req.headers.get("origin");
  if (origin) {
    headers["Origin"] = origin;
  }

  return headers;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const headers = await getBackendHeaders(req);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/info?type=${type}&id=${id}`, {
      headers,
    });
    
    if (!res.ok) {
      try {
        const errorData = await res.json();
        return NextResponse.json(errorData, { status: res.status });
      } catch {
        const errorText = await res.text();
        return NextResponse.json({ error: errorText }, { status: res.status });
      }
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
