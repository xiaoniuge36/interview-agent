export function getAntdPageSize(total: number, pageCount: number): number {
  const safeTotal = Math.max(0, Math.floor(total));
  const safePageCount = Math.max(1, Math.floor(pageCount));
  return Math.max(1, Math.ceil(safeTotal / safePageCount));
}
