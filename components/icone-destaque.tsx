"use client";

import type { LucideIcon } from "lucide-react";

/**
 * Ícone em destaque com fundo tingido pela própria cor, como nos cartões da
 * home. As cores vêm dos tokens de tema (--viz-*), então acompanham claro/escuro.
 */
export function IconeDestaque({
  icone: Icone,
  cor,
}: {
  icone: LucideIcon;
  cor: string;
}) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={{
        color: cor,
        backgroundColor: `color-mix(in oklab, ${cor} 14%, transparent)`,
      }}
    >
      <Icone className="size-5" />
    </span>
  );
}
