const CONFIGURED_API_URL = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !CONFIGURED_API_URL)
  throw new Error(
    "VITE_API_URL is not set. Set it in the Vercel project settings and redeploy.",
  );

const PRERENDER_API_URL =
  typeof window === "undefined"
    ? globalThis.process?.env?.BUILD_API_URL
    : undefined;

const API_URL = (
  PRERENDER_API_URL ??
  CONFIGURED_API_URL ??
  "http://localhost:4000/api"
).replace(/\/$/, "");

export const API_ORIGIN = (() => {
  try {
    return CONFIGURED_API_URL ? new URL(CONFIGURED_API_URL).origin : null;
  } catch {
    return null;
  }
})();

export class ApiError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

async function parse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error ?? "Request failed",
      body.details,
      body.code,
    );
  return body.data;
}

export async function apiGet(path, { signal } = {}) {
  const timeout = AbortSignal.timeout(10_000);
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  return parse(response);
}

async function send(method, path, payload) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
    signal: AbortSignal.timeout(20_000),
  });
  return parse(response);
}

export const apiPost = (path, payload) => send("POST", path, payload);

export const apiPatch = (path, payload) => send("PATCH", path, payload);

export const fieldError = (error, field) => error?.details?.[field]?.[0];
