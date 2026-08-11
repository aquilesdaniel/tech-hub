"use client";

import {
  Button,
  Card,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { RotateCw } from "lucide-react";
import type { Setor } from "./types";

export const PERIODOS = [
  { id: "3", rotulo: "3 meses" },
  { id: "6", rotulo: "6 meses" },
  { id: "12", rotulo: "12 meses" },
  { id: "0", rotulo: "Tudo" },
] as const;

type Props = {
  meses: number;
  onMesesChange: (meses: number) => void;
  setorId: string;
  onSetorChange: (setorId: string) => void;
  setores: Setor[];
  mostrarSetor: boolean;
  revalidando: boolean;
  onAtualizar: () => void;
};

export function FiltroDashboard({
  meses,
  onMesesChange,
  setorId,
  onSetorChange,
  setores,
  mostrarSetor,
  revalidando,
  onAtualizar,
}: Props) {
  return (
    <Card className="flex flex-row items-center">
      <div className="flex flex-col gap-1.5">
        <ToggleButtonGroup
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[String(meses)]}
          onSelectionChange={(chaves) => {
            const escolhida = Array.from(chaves)[0];
            if (escolhida != null) {
              onMesesChange(Number(escolhida));
            }
          }}
          aria-labelledby="rotulo-periodo"
        >
          {PERIODOS.map((periodo) => (
            <ToggleButton key={periodo.id} id={periodo.id}>
              {periodo.rotulo}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      {mostrarSetor && (
        <div className="flex min-w-52 flex-col gap-1.5">
          <Select
            selectedKey={setorId}
            onSelectionChange={(chave) => onSetorChange(String(chave))}
            aria-labelledby="rotulo-setor"
            variant="secondary"
          >
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="todos" textValue="Todos os setores">
                  Todos os setores
                </ListBox.Item>
                {setores.map((setor) => (
                  <ListBox.Item
                    key={setor.id}
                    id={String(setor.id)}
                    textValue={setor.nome}
                  >
                    {setor.nome}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onPress={onAtualizar}
        isPending={revalidando}
        className="ml-auto"
      >
        <RotateCw
          aria-hidden
          className={`size-4 ${revalidando ? "animate-spin" : ""}`}
        />
        Atualizar
      </Button>
    </Card>
  );
}
