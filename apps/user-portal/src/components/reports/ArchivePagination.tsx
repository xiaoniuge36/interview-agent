export function ArchivePagination({
  page,
  totalPages,
  total,
  label,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="training-archive-pagination" aria-label={label}>
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <span>
        共 {total} 条 · 第 {page} / {totalPages} 页
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        下一页
      </button>
    </nav>
  );
}
