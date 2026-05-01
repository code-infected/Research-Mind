import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit") || "20";
    const offsetParam = searchParams.get("offset") || "0";

    // Validate and sanitize parameters
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error("NEXT_PUBLIC_BACKEND_URL is not configured");
      return NextResponse.json(
        { error: "Backend service not configured", sessions: [] },
        { status: 503 }
      );
    }

    const { getToken } = await auth();
    const token = await getToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response: Response;
    try {
      response = await fetch(
        `${backendUrl}/api/history?limit=${limit}&offset=${offset}`,
        { headers, signal: controller.signal }
      );
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Backend connection timed out", sessions: [] },
          { status: 504 }
        );
      }
      console.error("Backend connection error:", error);
      return NextResponse.json(
        { error: "Unable to connect to backend service", sessions: [] },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Backend error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Failed to fetch history: ${response.statusText}`, sessions: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error in history route:", error);
    return NextResponse.json(
      { error: "Internal server error", sessions: [] },
      { status: 500 }
    );
  }
}
