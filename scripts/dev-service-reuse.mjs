import { createServer } from 'node:net';

export async function isServiceHealthy({ url, expectedHealth, timeoutMs = 1_000 }) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return false;

    const payload = await response.json();
    return Object.entries(expectedHealth).every(([key, value]) => payload?.[key] === value);
  } catch {
    return false;
  }
}

export async function isPortAvailable(port) {
  if (!(await canListenOnHost(port, '0.0.0.0'))) return false;
  return canListenOnHost(port, '::', { ipv6Only: true });
}

async function canListenOnHost(port, host, options = {}) {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', resolve);
      server.listen({ ...options, port, host });
    });
    return true;
  } catch (error) {
    if (error?.code === 'EADDRINUSE' || error?.code === 'EACCES') return false;
    throw error;
  } finally {
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}
