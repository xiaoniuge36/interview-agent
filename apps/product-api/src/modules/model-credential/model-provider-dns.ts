import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { areOnlyFakeIpAddresses } from './model-provider-address-policy';

const TRUSTED_DNS_URL = 'https://dns.alidns.com/resolve';
const TRUSTED_DNS_TIMEOUT_MS = 5_000;
const DNS_STATUS_OK = 0;
const DNS_TYPE_A = 1;
const DNS_TYPE_AAAA = 28;

export type ResolveAll = (hostname: string) => Promise<string[]>;

export async function systemResolveAll(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export async function resolveProviderAddresses(hostname: string, resolveAll: ResolveAll) {
  const addresses = await resolveAll(hostname);
  if (!areOnlyFakeIpAddresses(addresses)) return addresses;
  const ipv4 = await resolveTrustedAddresses(hostname, DNS_TYPE_A);
  return ipv4.length ? ipv4 : resolveTrustedAddresses(hostname, DNS_TYPE_AAAA);
}

async function resolveTrustedAddresses(hostname: string, recordType: number) {
  const url = new URL(TRUSTED_DNS_URL);
  url.searchParams.set('name', hostname);
  url.searchParams.set('type', String(recordType));
  const response = await fetch(url, {
    redirect: 'error',
    headers: { Accept: 'application/dns-json' },
    signal: AbortSignal.timeout(TRUSTED_DNS_TIMEOUT_MS),
  });
  if (!response.ok) return [];
  return addressesFromDnsResponse(await response.json(), recordType);
}

function addressesFromDnsResponse(payload: unknown, recordType: number) {
  if (!isRecord(payload) || payload.Status !== DNS_STATUS_OK || !Array.isArray(payload.Answer)) {
    return [];
  }
  return payload.Answer.flatMap((answer) => {
    if (!isRecord(answer) || answer.type !== recordType || typeof answer.data !== 'string')
      return [];
    return isIP(answer.data) ? [answer.data] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
