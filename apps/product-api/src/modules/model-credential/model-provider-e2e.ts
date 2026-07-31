export function e2eModelStubUrl(): string | null {
  if (process.env.NODE_ENV !== 'test') return null;
  const value = process.env.E2E_MODEL_STUB_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.username || url.password) return null;
    return ['127.0.0.1', '::1', 'localhost'].includes(url.hostname) ? value : null;
  } catch {
    return null;
  }
}
