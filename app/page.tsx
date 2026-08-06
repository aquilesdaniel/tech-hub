"use client";

import { SERIE } from "@/components/dashboard/viz";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Button, Card } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Cookie,
  Shield,
  Trophy,
} from "lucide-react";
import Link from "next/link";

type Modulo = {
  href: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  cor: string;
  somenteAdmin?: boolean;
};

const MODULOS: Modulo[] = [
  {
    href: "/salgados",
    titulo: "Salgados",
    descricao:
      "Lance dívidas para os funcionarios, acompanhe as dívidas em aberto e registre pagamentos.",
    icone: Cookie,
    cor: SERIE.s2,
  },
  {
    href: "/biblioteca",
    titulo: "Biblioteca",
    descricao:
      "Consulte a biblioteca, visualize livros disponiveis, faça empréstimos e devolva os livros no prazo.",
    icone: BookOpen,
    cor: SERIE.s1,
  },
  {
    href: "/certificacoes",
    titulo: "Certificações",
    descricao:
      "Consulte as certificações lançadas, datas de obtenção e tipo de certificação.",
    icone: Award,
    cor: SERIE.s3,
  },
  {
    href: "/ranking",
    titulo: "Ranking",
    descricao:
      "Veja a classificação de certificações da empresa e a sua posição nela.",
    icone: Trophy,
    cor: SERIE.s4,
  },
  {
    href: "/admin",
    titulo: "Administração",
    descricao:
      "Gerencie os colaboradores, setores e as configurações gerais do TechHub.",
    icone: Shield,
    cor: SERIE.s7,
    somenteAdmin: true,
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const ehAdmin = user?.tipo === "admin";
  const modulos = MODULOS.filter((m) => !m.somenteAdmin || ehAdmin);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto flex flex-col gap-8 px-4 py-8 sm:py-12">
          <header className="flex flex-col">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Olá, {user?.nome?.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Selecione uma opção abaixo para navegar até a tela da
              funcionalidade desejada.
            </p>
          </header>

          <section
            aria-label="Módulos do TechHub"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {modulos.map((modulo) => (
              <CartaoModulo key={modulo.href} modulo={modulo} />
            ))}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function CartaoModulo({ modulo }: { modulo: Modulo }) {
  const { icone: Icone } = modulo;

  return (
    <Card className="group relative h-full transition-colors hover:bg-surface-secondary">
      <Card.Content className="flex h-full flex-col gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: modulo.cor,
            backgroundColor: `color-mix(in oklab, ${modulo.cor} 14%, transparent)`,
          }}
        >
          <Icone className="size-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            {modulo.titulo}
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            {modulo.descricao}
          </p>
        </div>

        {/* O cartão inteiro é o alvo do clique, mas existe um único link. */}
        <Link
          href={modulo.href}
          className="mt-auto w-fit rounded-lg outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {/* O foco vive no link; o botão é a superfície visual da ação. */}
          <Button excludeFromTabOrder>
            Acessar
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Button>
        </Link>
      </Card.Content>
    </Card>
  );
}
