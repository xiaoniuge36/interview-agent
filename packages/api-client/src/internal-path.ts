export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/** 仅允许站内绝对路径（以单个 / 开头），拒绝外部与协议相对地址。 */
export function isInternalApiPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}
