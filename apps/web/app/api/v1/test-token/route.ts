/**
 * @file route.ts
 * @description Dev-only endpoint that echoes the raw JWT session token for debugging.
 * @architecture Reads the session token from the request cookies via next-auth and returns it as JSON.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * @desc    Return the raw session JWT (or "null") for agent debugging
 * @param   {NextRequest} req - The incoming request
 * @returns {Promise<NextResponse>} JSON containing the raw token
 */
export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    raw: true,
    secret: process.env.AUTH_SECRET,
  });
  return NextResponse.json({ token: token || "null" });
}
