export function decodeCanonicalBase64(value: string): Buffer | undefined {
  const decoded = Buffer.from(value, 'base64');
  return decoded.toString('base64') === value ? decoded : undefined;
}
