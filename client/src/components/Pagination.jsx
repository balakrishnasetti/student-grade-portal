export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        className="btn light sm"
        type="button"
        disabled={!meta.hasPrevPage}
        onClick={() => onPageChange(meta.page - 1)}
      >
        Previous
      </button>
      <span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
      <button
        className="btn light sm"
        type="button"
        disabled={!meta.hasNextPage}
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next
      </button>
    </div>
  );
}
