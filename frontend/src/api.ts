export const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export async function postJson<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }

  return payload as TResponse;
}
