"use client";

import {
  InputGroup,
  ListBox,
  Pagination,
  Select,
  Table,
  TextField,
} from "@heroui/react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ScreenSpinner } from "./screen-spinner";

const ITEMS_PER_PAGE_OPTIONS = ["5", "10", "20", "50"];

type Props<T> = {
  columns: ColumnDef<T, any>[];
  data: T[];
  label: string;
  emptyMessage?: string;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  label,
  emptyMessage = "Nenhum registro encontrado",
  total,
  page,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  search,
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
  filters,
  actions,
  loading = false,
  className,
}: Props<T>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const visibleColumns = table.getHeaderGroups()[0]?.headers ?? [];
  const first = total === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const last = Math.min(page * itemsPerPage, total);

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      <TableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
        filters={filters}
        actions={actions}
      />

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={label}>
            <Table.Header>
              {visibleColumns.map((header) => (
                <Table.Column
                  key={header.id}
                  id={header.id}
                  isRowHeader={header.index === 0}
                  className={alignmentClass(header.column.columnDef)}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body>
              {loading ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={visibleColumns.length}
                    className="py-10 text-center"
                  >
                    <ScreenSpinner />
                  </Table.Cell>
                </Table.Row>
              ) : table.getRowModel().rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={visibleColumns.length}
                    className="py-10 text-center text-muted"
                  >
                    {emptyMessage}
                  </Table.Cell>
                </Table.Row>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Table.Row key={row.id} id={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        className={alignmentClass(cell.column.columnDef)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>

        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>
              {total === 0
                ? "Nenhum registro"
                : `${first} a ${last} de ${total.toLocaleString("pt-BR")} resultados`}
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page <= 1}
                  onPress={() => onPageChange(Math.max(1, page - 1))}
                >
                  <Pagination.PreviousIcon />
                  <span>Anterior</span>
                </Pagination.Previous>
              </Pagination.Item>
              {visiblePages(page, totalPages).map((p, index) =>
                p === "…" ? (
                  <Pagination.Item key={`ellipsis-${index}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === page}
                      onPress={() => onPageChange(p)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ),
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={page >= totalPages}
                  onPress={() =>
                    onPageChange(Math.min(totalPages, page + 1))
                  }
                >
                  <span>Próximo</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      </Table>
    </div>
  );
}

function visiblePages(page: number, totalPages: number) {
  const total = Math.max(1, totalPages);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pageWindow = new Set([1, total, page - 1, page, page + 1]);

  if (page <= 3) [2, 3, 4].forEach((p) => pageWindow.add(p));
  if (page >= total - 2)
    [total - 3, total - 2, total - 1].forEach((p) => pageWindow.add(p));

  const pages = [...pageWindow]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const withEllipsis: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) withEllipsis.push("…");
    withEllipsis.push(p);
  });
  return withEllipsis;
}

function alignmentClass(columnDef: { meta?: unknown }) {
  const meta = columnDef.meta as
    | { align?: string; className?: string }
    | undefined;
  return [meta?.align === "right" ? "text-right" : "", meta?.className ?? ""]
    .filter(Boolean)
    .join(" ");
}

function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  itemsPerPage,
  onItemsPerPageChange,
  filters,
  actions,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder: string;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  const [text, setText] = useState(search);

  useEffect(() => {
    if (text === search) return;
    const timer = setTimeout(() => onSearchChange(text), 300);
    return () => clearTimeout(timer);
  }, [text, search, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <TextField className="w-full max-w-full" name="email">
        <InputGroup variant="secondary">
          <InputGroup.Prefix>
            <Search className="size-4 text-muted" />
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </InputGroup>
      </TextField>

      {filters}

      <Select
        selectedKey={String(itemsPerPage)}
        onSelectionChange={(key) => onItemsPerPageChange(Number(key) || 10)}
        variant="secondary"
        aria-label="Itens por página"
      >
        <Select.Trigger className="w-full sm:w-32">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <ListBox.Item key={option} id={option} textValue={`${option} itens`}>
                {option} itens
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {actions}
    </div>
  );
}
