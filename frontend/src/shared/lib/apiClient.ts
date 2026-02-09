import { API_BASE_URL } from "@/shared/constants";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & {
  token?: string;
};

async function request<TResponse>(
  path: string,
  options?: RequestOptions,
): Promise<TResponse> {
  const { token, ...fetchOptions } = options ?? {};
  const headers: HeadersInit = {
    ...(fetchOptions.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (
    fetchOptions.method === "POST" ||
    fetchOptions.method === "PUT" ||
    fetchOptions.method === "PATCH"
  ) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { message: res.statusText, code: "UNKNOWN" },
    }));
    throw new ApiError(
      res.status,
      body.error?.message ?? "Request failed",
      body.error?.code,
    );
  }

  return res.json() as Promise<TResponse>;
}

export function get<TResponse>(
  path: string,
  token?: string,
): Promise<TResponse> {
  return request<TResponse>(path, { method: "GET", token });
}

export function post<TResponse>(
  path: string,
  body: unknown,
  token?: string,
): Promise<TResponse> {
  return request<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}
