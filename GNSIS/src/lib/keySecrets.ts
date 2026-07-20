// In-memory store for freshly-created / rotated gns_ virtual-key secrets.
//
// The full secret is returned by the backend exactly once (on create/rotate).
// We keep it ONLY in module memory so a component can reveal + copy it, and we
// drop it aggressively. It is:
//   - never written to localStorage / sessionStorage / cookies
//   - never logged, never sent to analytics
//   - never placed in a URL
//   - cleared on sign-out, on disable, on rotate (old key), or on explicit forget
//
// Because it lives in a plain Map (not React state), a component unmount doesn't
// silently leave it retrievable elsewhere — and sign-out can wipe every secret
// regardless of what's mounted.

type Listener = () => void;

const secrets = new Map<string, string>(); // keyId -> secret
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      // one listener throwing must not stop the rest
    }
  }
}

export function rememberSecret(keyId: string, secret: string): void {
  secrets.set(keyId, secret);
  emit();
}

export function getSecret(keyId: string): string | null {
  return secrets.get(keyId) ?? null;
}

export function hasSecret(keyId: string): boolean {
  return secrets.has(keyId);
}

export function forgetSecret(keyId: string): void {
  if (secrets.delete(keyId)) emit();
}

/** Wipe every remembered secret (called on sign-out). */
export function clearAllSecrets(): void {
  if (secrets.size > 0) {
    secrets.clear();
    emit();
  }
}

export function subscribeSecrets(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: number of secrets currently held in memory. */
export function _secretCount(): number {
  return secrets.size;
}
