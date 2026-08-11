"use client";

import { AlertDialog, Button } from "@heroui/react";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface OpcoesConfirmacao {
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  destrutivo?: boolean;
}

type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ConfirmacaoContext = createContext<Confirmar | null>(null);

export function ConfirmacaoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao | null>(null);
  const responder = useRef<((confirmado: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((novasOpcoes) => {
    setOpcoes(novasOpcoes);
    return new Promise<boolean>((resolve) => {
      responder.current = resolve;
    });
  }, []);

  const fechar = (confirmado: boolean) => {
    responder.current?.(confirmado);
    responder.current = null;
    setOpcoes(null);
  };

  return (
    <ConfirmacaoContext.Provider value={confirmar}>
      {children}

      <AlertDialog
        isOpen={opcoes !== null}
        onOpenChange={(aberto) => {
          if (!aberto) fechar(false);
        }}
      >
        <AlertDialog.Backdrop variant="blur">
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>{opcoes?.titulo}</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>{opcoes?.descricao}</AlertDialog.Body>

              <AlertDialog.Footer className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  fullWidth
                  className="sm:w-auto"
                  onPress={() => fechar(false)}
                >
                  {opcoes?.rotuloCancelar ?? "Cancelar"}
                </Button>

                <Button
                  variant={opcoes?.destrutivo ? "danger" : "primary"}
                  fullWidth
                  className="sm:w-auto"
                  onPress={() => fechar(true)}
                >
                  {opcoes?.rotuloConfirmar ?? "Confirmar"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </ConfirmacaoContext.Provider>
  );
}

export function useConfirmacao() {
  const contexto = useContext(ConfirmacaoContext);
  if (!contexto) {
    throw new Error(
      "O useConfirmacao deve ser usado dentro de um ConfirmacaoProvider.",
    );
  }
  return contexto;
}
