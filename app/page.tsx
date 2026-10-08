"use client";

import { SERIES } from "@/components/dashboard/viz";
import { PageHeader, PageLayout } from "@/components/page-layout";
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

type Module = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
};

const MODULES: Module[] = [
  {
    href: "/salgados",
    title: "Salgados",
    description:
      "Lance dívidas para os funcionarios, acompanhe as dívidas em aberto e registre pagamentos.",
    icon: Cookie,
    color: SERIES.s2,
  },
  {
    href: "/biblioteca",
    title: "Biblioteca",
    description:
      "Consulte a biblioteca, visualize livros disponiveis, faça empréstimos e devolva os livros no prazo.",
    icon: BookOpen,
    color: SERIES.s1,
  },
  {
    href: "/certificacoes",
    title: "Certificações",
    description:
      "Consulte as certificações lançadas, datas de obtenção e tipo de certificação.",
    icon: Award,
    color: SERIES.s3,
  },
  {
    href: "/ranking",
    title: "Ranking",
    description:
      "Consulte o ranking de certificações da empresa, métricas e a sua posição nela.",
    icon: Trophy,
    color: SERIES.s4,
  },
  {
    href: "/admin",
    title: "Administração",
    description:
      "Gerencie os colaboradores, setores e as configurações gerais do TechHub.",
    icon: Shield,
    color: SERIES.s7,
    adminOnly: true,
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";
  const modules = MODULES.filter((m) => !m.adminOnly || isAdmin);

  return (
    <ProtectedRoute>
      <PageLayout>
        <PageHeader
          title={`Olá, ${user?.nome?.split(" ")[0] ?? ""}`}
          description="Selecione uma opção abaixo para navegar até a tela da funcionalidade desejada."
        />

        <section
          aria-label="Módulos do TechHub"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modules.map((appModule) => (
            <ModuleCard key={appModule.href} appModule={appModule} />
          ))}
        </section>
      </PageLayout>
    </ProtectedRoute>
  );
}

function ModuleCard({ appModule }: { appModule: Module }) {
  const { icon: Icon } = appModule;

  return (
    <Card className="group relative h-full transition-colors hover:bg-surface-secondary">
      <Card.Content className="flex h-full flex-col gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: appModule.color,
            backgroundColor: `color-mix(in oklab, ${appModule.color} 14%, transparent)`,
          }}
        >
          <Icon className="size-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            {appModule.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            {appModule.description}
          </p>
        </div>

        <Link
          href={appModule.href}
          className="mt-auto w-fit rounded-lg outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
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
