import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const { id } = params;

  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${backendUrl}/api/report/${id}`, { headers });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: response.status,
    });
  }

  const data = await response.json();
  return Response.json(data);
}
