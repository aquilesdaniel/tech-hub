"use client";

import { ListBox, Pagination, Select } from "@heroui/react";

const OPCOES_POR_PAGINA = ["5", "10", "20", "50"];

type Props = {
  pagina: number;
  totalPaginas: number;
  onMudarPagina: (pagina: number) => void;
  total?: number;
  itensPorPagina?: number;
  onMudarItensPorPagina?: (itens: number) => void;
};

export function Paginador({
  pagina,
  totalPaginas,
  onMudarPagina,
  total,
  itensPorPagina,
  onMudarItensPorPagina,
}: Props) {
  const temSeletor =
    itensPorPagina !== undefined && onMudarItensPorPagina !== undefined;

  if (totalPaginas <= 1 && !temSeletor) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {total !== undefined
          ? `${total.toLocaleString("pt-BR")} registro(s)`
          : ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {temSeletor && (
          <Select
            selectedKey={String(itensPorPagina)}
            onSelectionChange={(chave) =>
              onMudarItensPorPagina(Number(chave) || 10)
            }
            variant="secondary"
            aria-label="Itens por página"
          >
            <Select.Trigger className="w-32">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {OPCOES_POR_PAGINA.map((opcao) => (
                  <ListBox.Item
                    key={opcao}
                    id={opcao}
                    textValue={`${opcao} itens`}
                  >
                    {opcao} itens
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        {totalPaginas > 1 && (
          <Pagination>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={pagina === 1}
                  onPress={() => onMudarPagina(Math.max(1, pagina - 1))}
                >
                  <Pagination.PreviousIcon />
                  <span>Anterior</span>
                </Pagination.Previous>
              </Pagination.Item>
              <Pagination.Item>
                <span className="flex items-center justify-center px-4 text-sm font-medium">
                  Página {pagina} de {totalPaginas}
                </span>
              </Pagination.Item>
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={pagina === totalPaginas}
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
        )}
      </div>
    </div>
  );
}
