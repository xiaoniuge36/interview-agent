import { isIP } from 'node:net';

const IPV4_FAMILY = 4;
const IPV6_FAMILY = 6;
const IPV4_RADIX = 256;
const NON_GLOBAL_IPV4_CIDRS = [
  ['0.0.0.0', '0.255.255.255'],
  ['10.0.0.0', '10.255.255.255'],
  ['100.64.0.0', '100.127.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.0.0.0', '192.0.0.255'],
  ['192.0.2.0', '192.0.2.255'],
  ['192.88.99.0', '192.88.99.255'],
  ['192.168.0.0', '192.168.255.255'],
  ['198.18.0.0', '198.19.255.255'],
  ['198.51.100.0', '198.51.100.255'],
  ['203.0.113.0', '203.0.113.255'],
  ['224.0.0.0', '255.255.255.255'],
] as const;
const NON_GLOBAL_IPV4_RANGES = NON_GLOBAL_IPV4_CIDRS.map(
  ([start, end]) => [ipv4Number(start), ipv4Number(end)] as const,
);
const FAKE_IP_RANGE = [ipv4Number('198.18.0.0'), ipv4Number('198.19.255.255')] as const;

export function validateProviderAddresses(addresses: string[]) {
  if (!addresses.length || addresses.some((address) => !isGlobalAddress(address))) {
    throw new Error('MODEL_PROVIDER_ENDPOINT_BLOCKED');
  }
}

export function areOnlyFakeIpAddresses(addresses: string[]) {
  return addresses.length > 0 && addresses.every(isFakeIpAddress);
}

function isGlobalAddress(address: string) {
  const family = isIP(address);
  if (family === IPV6_FAMILY) {
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:0?db8:/i.test(address);
  }
  return family === IPV4_FAMILY && !isNonGlobalIpv4(address);
}

function isNonGlobalIpv4(address: string) {
  const value = ipv4Number(address);
  return NON_GLOBAL_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
}

function isFakeIpAddress(address: string) {
  if (isIP(address) !== IPV4_FAMILY) return false;
  const value = ipv4Number(address);
  return value >= FAKE_IP_RANGE[0] && value <= FAKE_IP_RANGE[1];
}

function ipv4Number(address: string) {
  return address.split('.').reduce((value, part) => value * IPV4_RADIX + Number(part), 0);
}
