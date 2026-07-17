const SOURCE_PREVIEW_LENGTH = 72;
const SOURCE_CHUNK_REFERENCE = /\/chunk\/(\d+)$/;

type SourceChunk = { sequence: number; content: string };

export function sourceChunkPresentation(chunk: SourceChunk, total: number) {
  const content = normalizeContent(chunk.content);
  return {
    title: `资料段落 ${chunk.sequence} / ${total}`,
    preview: contentPreview(content),
    characterCount: Array.from(content).length,
  };
}

export function sourceChunksForCandidate(chunks: SourceChunk[], sourceRefs: string[]) {
  const sequences = new Set(
    sourceRefs.flatMap((sourceRef) => {
      const match = sourceRef.match(SOURCE_CHUNK_REFERENCE);
      return match ? [Number(match[1])] : [];
    }),
  );
  return chunks.filter((chunk) => sequences.has(chunk.sequence));
}

function normalizeContent(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function contentPreview(value: string) {
  const characters = Array.from(value);
  if (characters.length <= SOURCE_PREVIEW_LENGTH) return value;
  return `${characters.slice(0, SOURCE_PREVIEW_LENGTH).join('')}…`;
}
