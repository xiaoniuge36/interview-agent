const SENSITIVE_TEXT_PATTERNS = [
  [/(api[_ -]?key|secret|password|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[已隐藏]'],
  [/\b(?:sk|rk)-[A-Za-z0-9_-]{8,}\b/g, '[已隐藏]'],
  [/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [已隐藏]'],
] as const;

export function maskUserPageAgentText(value: string) {
  return SENSITIVE_TEXT_PATTERNS.reduce(
    (masked, [pattern, replacement]) => masked.replace(pattern, replacement),
    value,
  );
}
