import { useState, type ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  className?: (row: T) => string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage,
  loadFailed,
  onDelete,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage: string;
  loadFailed?: boolean;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function handleDelete(id: string) {
    if (!window.confirm("Apagar este registo?")) return;
    setDeleteFailed(false);
    try {
      await onDelete(id);
    } catch (err) {
      console.error(err);
      setDeleteFailed(true);
    }
  }

  return (
    <>
      {deleteFailed && <div className="msg">Não foi possível apagar. Tenta novamente.</div>}
      <table>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={i} className={column.numeric ? "num" : undefined}>
                {column.header}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column, i) => {
                const classes = [column.numeric && "num", column.className?.(row)].filter(Boolean);
                return (
                  <td key={i} className={classes.join(" ") || undefined}>
                    {column.render(row)}
                  </td>
                );
              })}
              <td>
                <button className="del" aria-label="Apagar" onClick={() => handleDelete(row.id)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="empty">
                {loadFailed ? "Não foi possível carregar os dados." : emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
