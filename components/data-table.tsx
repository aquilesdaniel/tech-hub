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
import { SpinnerTela } from "./spinner-tela";

const OPCOES_POR_PAGINA = ["5", "10", "20", "50"];

type Props<T> = {
  colunas: ColumnDef<T, any>[];
  dados: T[];
  rotulo: string;
  vazio?: string;
  total: number;
  pagina: number;
  totalPaginas: number;
  onMudarPagina: (pagina: number) => void;
  itensPorPagina: number;
  onMudarItensPorPagina: (itens: number) => void;
  busca: string;
  onMudarBusca: (busca: string) => void;
  placeholderBusca?: string;
  filtros?: ReactNode;
  acoes?: ReactNode;
  carregando?: boolean;
  className?: string;
};

export function DataTable<T>({
  colunas,
  dados,
  rotulo,
  vazio = "Nenhum registro encontrado",
  total,
  pagina,
  totalPaginas,
  onMudarPagina,
  itensPorPagina,
  onMudarItensPorPagina,
  busca,
  onMudarBusca,
  placeholderBusca = "Pesquisar...",
  filtros,
  acoes,
  carregando = false,
  className,
}: Props<T>) {
  const tabela = useReactTable({
    columns: colunas,
    data: dados,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPaginas,
  });

  const colunasVisiveis = tabela.getHeaderGroups()[0]?.headers ?? [];
  const primeiro = total === 0 ? 0 : (pagina - 1) * itensPorPagina + 1;
  const ultimo = Math.min(pagina * itensPorPagina, total);

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      <BarraTabela
        busca={busca}
        onMudarBusca={onMudarBusca}
        placeholderBusca={placeholderBusca}
        itensPorPagina={itensPorPagina}
        onMudarItensPorPagina={onMudarItensPorPagina}
        filtros={filtros}
        acoes={acoes}
      />

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={rotulo}>
            <Table.Header>
              {colunasVisiveis.map((header) => (
                <Table.Column
                  key={header.id}
                  id={header.id}
                  isRowHeader={header.index === 0}
                  className={alinhamento(header.column.columnDef)}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Table.Column>
              ))}
            </Table.Header>

            <Table.Body>
              {carregando ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={colunasVisiveis.length}
                    className="py-10 text-center"
                  >
                    <SpinnerTela />
                  </Table.Cell>
                </Table.Row>
              ) : tabela.getRowModel().rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={colunasVisiveis.length}
                    className="py-10 text-center text-muted"
                  >
                    {vazio}
                  </Table.Cell>
                </Table.Row>
              ) : (
                tabela.getRowModel().rows.map((row) => (
                  <Table.Row key={row.id} id={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        className={alinhamento(cell.column.columnDef)}
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
                : `${primeiro} a ${ultimo} de ${total.toLocaleString("pt-BR")} resultados`}
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pagina <= 1}
                  onPress={() => onMudarPagina(Math.max(1, pagina - 1))}
                >
                  <Pagination.PreviousIcon />
                  <span>Anterior</span>
                </Pagination.Previous>
              </Pagination.Item>
              {paginasVisiveis(pagina, totalPaginas).map((p, indice) =>
                p === "…" ? (
                  <Pagination.Item key={`reticencias-${indice}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === pagina}
                      onPress={() => onMudarPagina(p)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ),
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={pagina >= totalPaginas}
                  onPress={() =>
                    onMudarPagina(Math.min(totalPaginas, pagina + 1))
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

function paginasVisiveis(pagina: number, totalPaginas: number) {
  const total = Math.max(1, totalPaginas);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const janela = new Set([1, total, pagina - 1, pagina, pagina + 1]);

  if (pagina <= 3) [2, 3, 4].forEach((p) => janela.add(p));
  if (pagina >= total - 2)
    [total - 3, total - 2, total - 1].forEach((p) => janela.add(p));

  const paginas = [...janela]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const comReticencias: (number | "…")[] = [];
  paginas.forEach((p, i) => {
    if (i > 0 && p - paginas[i - 1] > 1) comReticencias.push("…");
    comReticencias.push(p);
  });
  return comReticencias;
}

function alinhamento(columnDef: { meta?: unknown }) {
  const meta = columnDef.meta as
    | { alinhar?: string; classe?: string }
    | undefined;
  return [meta?.alinhar === "direita" ? "text-right" : "", meta?.classe ?? ""]
    .filter(Boolean)
    .join(" ");
}

function BarraTabela({
  busca,
  onMudarBusca,
  placeholderBusca,
  itensPorPagina,
  onMudarItensPorPagina,
  filtros,
  acoes,
}: {
  busca: string;
  onMudarBusca: (busca: string) => void;
  placeholderBusca: string;
  itensPorPagina: number;
  onMudarItensPorPagina: (itens: number) => void;
  filtros?: ReactNode;
  acoes?: ReactNode;
}) {
  const [texto, setTexto] = useState(busca);

  useEffect(() => {
    if (texto === busca) return;
    const timer = setTimeout(() => onMudarBusca(texto), 300);
    return () => clearTimeout(timer);
  }, [texto, busca, onMudarBusca]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <TextField className="w-full max-w-full" name="email">
        <InputGroup variant="secondary">
          <InputGroup.Prefix>
            <Search className="size-4 text-muted" />
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder={placeholderBusca}
            aria-label={placeholderBusca}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </InputGroup>
      </TextField>

      {filtros}

      <Select
        selectedKey={String(itensPorPagina)}
        onSelectionChange={(chave) =>
          onMudarItensPorPagina(Number(chave) || 10)
        }
        variant="secondary"
        aria-label="Itens por página"
      >
        <Select.Trigger className="w-full sm:w-32">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {OPCOES_POR_PAGINA.map((opcao) => (
              <ListBox.Item key={opcao} id={opcao} textValue={`${opcao} itens`}>
                {opcao} itens
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {acoes}
    </div>
  );
}
