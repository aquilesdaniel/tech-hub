"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type React from "react";

export function LayoutPagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto flex flex-col gap-6 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: string;
  voltarHref?: string;
  acoes?: React.ReactNode;
}

export function CabecalhoPagina({
  titulo,
  descricao,
  voltarHref,
  acoes,
}: CabecalhoPaginaProps) {
  return (
    <header className="flex flex-col gap-4">
      {voltarHref && (
        <Link href={voltarHref} className="w-fit">
          <Button size="sm" variant="outline">
            <ArrowLeft aria-hidden />
            Voltar
          </Button>
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {titulo}
          </h1>
          {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
        </div>

        {acoes && (
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        )}
      </div>
    </header>
  );
}
