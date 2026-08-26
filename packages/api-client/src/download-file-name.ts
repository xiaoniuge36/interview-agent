const ASCII_CONTROL_CHARACTER_END = 31;
const ASCII_DELETE_CHARACTER = 127;
const MAX_DOWNLOAD_FILE_NAME_LENGTH = 180;

/** 从 Content-Disposition 解析并清洗下载文件名，失败时回退到调用方提供的名称。 */
export function resolveDownloadFileName(
  contentDisposition: string | null,
  fallbackFileName: string,
): string {
  const encodedName = contentDisposition?.match(/(?:^|;)\s*filename\*\s*=\s*([^;]+)/i)?.[1];
  const plainName = contentDisposition?.match(
    /(?:^|;)\s*filename\s*=\s*("(?:[^"\\]|\\.)*"|[^;]+)/i,
  )?.[1];
  const decodedName = encodedName
    ? decodeAttachmentName(encodedName)
    : plainName
      ? decodeAttachmentName(plainName)
      : undefined;
  return sanitizeDownloadFileName(decodedName ?? fallbackFileName, fallbackFileName);
}

function decodeAttachmentName(value: string): string {
  const normalized = value.trim().replace(/^"|"$/g, '');
  const encodedValue = normalized.replace(/^[^']*'[^']*'/, '');
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return normalized;
  }
}

function sanitizeDownloadFileName(value: string, fallbackFileName: string): string {
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return fallbackFileName;
  const safe = removeControlCharacters(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^\.+/, '');
  if (!safe || safe === '_') return fallbackFileName;
  return safe.slice(0, MAX_DOWNLOAD_FILE_NAME_LENGTH);
}

function removeControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > ASCII_CONTROL_CHARACTER_END && code !== ASCII_DELETE_CHARACTER;
    })
    .join('');
}
