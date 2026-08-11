"use client";

import { Button, Form, Label, Modal } from "@heroui/react";
import type React from "react";
import { Children, isValidElement } from "react";

function tamanhoPorCampos(total: number): "sm" | "md" | "lg" {
  if (total <= 2) return "sm";
  if (total <= 5) return "md";
  return "lg";
}

function contarCampos(no: React.ReactNode): number {
  return Children.toArray(no).reduce<number>((total, filho) => {
    if (!isValidElement(filho)) return total;
    if (filho.type === CampoModal) return total + 1;

    const { children } = filho.props as { children?: React.ReactNode };
    return total + contarCampos(children);
  }, 0);
}

export function CampoModal({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{rotulo}</Label>
      {children}
    </div>
  );
}

export function LinhaCampos({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

interface ModalFormProps {
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: string;
  descricao?: string;
  gatilho?: React.ReactNode;
  children: React.ReactNode;
  rotuloConfirmar: string;
  rotuloEnviando?: string;
  onConfirmar: () => void | Promise<void>;
  isEnviando?: boolean;
  isConfirmarDesabilitado?: boolean;
}

export function ModalForm({
  isOpen,
  onOpenChange,
  titulo,
  descricao,
  gatilho,
  children,
  rotuloConfirmar,
  rotuloEnviando = "Salvando...",
  onConfirmar,
  isEnviando = false,
  isConfirmarDesabilitado = false,
}: ModalFormProps) {
  const aoEnviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void onConfirmar();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      {gatilho}

      <Modal.Backdrop variant="blur">
        <Modal.Container size={tamanhoPorCampos(contarCampos(children))}>
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Form onSubmit={aoEnviar} className="flex min-h-0 flex-1 flex-col">
              <Modal.Header>
                <Modal.Heading>{titulo}</Modal.Heading>
              </Modal.Header>

              <Modal.Body>
                {descricao && (
                  <p className="mb-4 text-sm text-muted">{descricao}</p>
                )}
                <div className="grid gap-4">{children}</div>
              </Modal.Body>

              <Modal.Footer className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="sm:w-auto"
                  onPress={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  fullWidth
                  className="sm:w-auto"
                  isDisabled={isEnviando || isConfirmarDesabilitado}
                >
                  {isEnviando ? rotuloEnviando : rotuloConfirmar}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
