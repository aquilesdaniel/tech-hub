"use client";

import { Button, Form, Label, Modal } from "@heroui/react";
import type React from "react";
import { Children, isValidElement } from "react";

function sizeForFieldCount(total: number): "sm" | "md" | "lg" {
  if (total <= 2) return "sm";
  if (total <= 5) return "md";
  return "lg";
}

function countFields(node: React.ReactNode): number {
  return Children.toArray(node).reduce<number>((total, child) => {
    if (!isValidElement(child)) return total;
    if (child.type === ModalField) return total + 1;

    const { children } = child.props as { children?: React.ReactNode };
    return total + countFields(children);
  }, 0);
}

export function ModalField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

interface ModalFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  submittingLabel?: string;
  onConfirm: () => void | Promise<void>;
  isSubmitting?: boolean;
  isConfirmDisabled?: boolean;
}

export function ModalForm({
  isOpen,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  confirmLabel,
  submittingLabel = "Salvando...",
  onConfirm,
  isSubmitting = false,
  isConfirmDisabled = false,
}: ModalFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger}

      <Modal.Backdrop variant="blur">
        <Modal.Container size={sizeForFieldCount(countFields(children))}>
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Header>
                <Modal.Heading>{title}</Modal.Heading>
              </Modal.Header>

              <Modal.Body>
                {description && (
                  <p className="mb-4 text-sm text-muted">{description}</p>
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
                  isDisabled={isSubmitting || isConfirmDisabled}
                >
                  {isSubmitting ? submittingLabel : confirmLabel}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
