import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate ID parameter
    if (!id || typeof id !== "string" || id.length < 1) {
      return NextResponse.json(
        { error: "Invalid report ID" },
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

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/report/${id}`, {
        headers,
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
        { error: response.status === 404 ? "Report not found" : `Failed to fetch report: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error in report route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
