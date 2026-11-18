// Shared helpers for the API tests: requests with a random visitor IP, and a signed-in staff/admin session.
import { execFileSync } from "node:child_process";

export const API = process.env.API_URL ?? "http://localhost:4000/api";
export const IP = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const BACKEND = new URL("../../backend/", import.meta.url).pathname;

export async function call(method, path, body, headers = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP(), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})), headers: res.headers };
}

// A session is just the cookie the API sets on sign-in.
export async function signIn(email, password) {
  const res = await call("POST", "/auth/login", { email, password });
  if (res.status !== 200) throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(res.body)}`);
  const cookie = res.headers.get("set-cookie").split(";")[0];
  return {
    user: res.body.data,
    call: (method, path, body) => call(method, path, body, { Cookie: cookie }),
  };
}

// Creates (or resets) a dashboard account with the backend's own script, then signs in.
const made = new Map();
export async function teamSession(role = "ADMIN") {
  const email = `qa-${role.toLowerCase()}@brewgrillz.test`;
  const password = "qa-grill-password-2026";
  if (!made.has(email)) {
    execFileSync(process.execPath, ["--env-file-if-exists=.env", "scripts/create-admin.js", email, `QA ${role}`, password, role], { cwd: BACKEND, stdio: "ignore" });
    made.set(email, true);
  }
  return signIn(email, password);
}

export async function newCustomer(extra = {}) {
  const email = `member${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = "steak-and-chips-2026";
  const res = await call("POST", "/auth/register", { name: "Rewards Member", email, password, phone: "9" + String(Math.floor(Math.random() * 1e7)).padStart(7, "0"), ...extra });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return { email, password, ...(await signIn(email, password)) };
}
