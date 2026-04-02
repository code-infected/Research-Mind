import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${backendUrl}/api/history?limit=${limit}&offset=${offset}`,
    { headers }
  );

  const data = await response.json();
  return Response.json(data);
}
