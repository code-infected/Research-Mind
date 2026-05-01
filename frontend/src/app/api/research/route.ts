import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error("NEXT_PUBLIC_BACKEND_URL is not configured");
      return NextResponse.json(
        { error: "Backend service not configured" },
        { status: 503 }
      );
    }

    const { getToken } = await auth();
    const token = await getToken();

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for initial connection

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/research`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Backend connection timed out" },
          { status: 504 }
        );
      }
      console.error("Backend connection error:", error);
      return NextResponse.json(
        { error: "Unable to connect to backend service" },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Backend error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Research request failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "No response body from backend" },
        { status: 500 }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Unexpected error in research route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
