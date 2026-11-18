const store = new Map();

export async function cached(key, ttlSeconds, loader) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = loader();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });

  try {
    return await value;
  } catch (error) {
    store.delete(key);
    throw error;
  }
}

export function invalidate(prefix = "") {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
