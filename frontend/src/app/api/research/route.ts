import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const body = await req.json();

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${backendUrl}/api/research`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "Research request failed" }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
