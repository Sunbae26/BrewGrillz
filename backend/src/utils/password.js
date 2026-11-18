import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PARAMS = { N: 16384, r: 8, p: 5 };
const MAX_MEMORY = 64 * 1024 * 1024;

const derive = (password, salt, length, { N, r, p }) =>
  scryptAsync(password.normalize("NFKC"), salt, length, {
    N,
    r,
    p,
    maxmem: MAX_MEMORY,
  });

function parse(stored) {
  const parts = String(stored ?? "").split("$");
  if (parts[0] !== "scrypt") return null;
  if (parts.length === 6) {
    const [, N, r, p, salt, hash] = parts;
    return { N: Number(N), r: Number(r), p: Number(p), salt, hash };
  }
  if (parts.length === 4) {
    const [, N, salt, hash] = parts;
    return { N: Number(N), r: 8, p: 1, salt, hash, legacy: true };
  }
  return null;
}

const validParams = ({ N, r, p }) =>
  Number.isInteger(N) &&
  N >= 1024 &&
  N <= 1048576 &&
  (N & (N - 1)) === 0 &&
  Number.isInteger(r) &&
  r >= 1 &&
  r <= 32 &&
  Number.isInteger(p) &&
  p >= 1 &&
  p <= 16;

export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString("base64url");
  const hash = await derive(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, stored) {
  const record = parse(stored);
  if (!record || !record.salt || !record.hash || !validParams(record))
    return false;
  const expected = Buffer.from(record.hash, "base64url");
  const input = record.legacy ? password : password.normalize("NFKC");
  const actual = await scryptAsync(input, record.salt, expected.length, {
    N: record.N,
    r: record.r,
    p: record.p,
    maxmem: MAX_MEMORY,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function needsRehash(stored) {
  const record = parse(stored);
  return (
    !record ||
    record.N !== PARAMS.N ||
    record.r !== PARAMS.r ||
    record.p !== PARAMS.p
  );
}

const DUMMY_HASH = `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${randomBytes(SALT_BYTES).toString("base64url")}$${randomBytes(KEY_LENGTH).toString("base64url")}`;

export const burnPasswordCheck = (password) =>
  verifyPassword(password, DUMMY_HASH);
