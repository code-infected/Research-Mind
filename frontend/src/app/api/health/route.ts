import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  let backendStatus = "unavailable";
  let modelInfo = null;
  
  if (backendUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        backendStatus = "healthy";
        const data = await res.json();
        modelInfo = data.model || null;
      }
    } catch {
      backendStatus = "unavailable";
    }
  }

  return NextResponse.json({
    status: "healthy",
    service: "researchmind-frontend",
    backend_status: backendStatus,
    model: modelInfo,
    timestamp: new Date().toISOString(),
  });
}
