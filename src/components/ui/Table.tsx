import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T, index: number) => ReactNode;
}

type SortDir = "asc" | "desc";

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  sortKey?: string;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  emptyState?: ReactNode;
  loading?: boolean;
}

export function Table<T>({
  columns,
  rows,
  getRowKey,
  sortKey,
  sortDir,
  onSort,
  emptyState,
  loading,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[
                  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500",
                  col.sortable && onSort
                    ? "cursor-pointer select-none hover:text-gray-700"
                    : "",
                  col.className ?? "",
                ].join(" ")}
                onClick={
                  col.sortable && onSort ? () => onSort(col.key) : undefined
                }
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span aria-hidden="true">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-0">
                {emptyState ?? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No results
                  </p>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={getRowKey(row)}
                className="transition-colors hover:bg-gray-50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-gray-700 ${col.className ?? ""}`}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
