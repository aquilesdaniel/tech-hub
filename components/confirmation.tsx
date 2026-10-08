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

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmFn | null>(null);

export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((newOptions) => {
    setOptions(newOptions);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}

      <AlertDialog
        isOpen={options !== null}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <AlertDialog.Backdrop variant="blur">
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>{options?.title}</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>{options?.description}</AlertDialog.Body>

              <AlertDialog.Footer className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  fullWidth
                  className="sm:w-auto"
                  onPress={() => close(false)}
                >
                  {options?.cancelLabel ?? "Cancelar"}
                </Button>

                <Button
                  variant={options?.destructive ? "danger" : "primary"}
                  fullWidth
                  className="sm:w-auto"
                  onPress={() => close(true)}
                >
                  {options?.confirmLabel ?? "Confirmar"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "O useConfirmation deve ser usado dentro de um ConfirmationProvider.",
    );
  }
  return context;
}
