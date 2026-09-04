"use client";

import type React from "react";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SpinnerTela } from "./spinner-tela";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }

    if (
      !isLoading &&
      user &&
      requiredRole === "admin" &&
      user.tipo !== "admin"
    ) {
      router.push("/");
    }
  }, [user, isLoading, router, requiredRole]);

  if (isLoading) {
    return <SpinnerTela />;
  }

  if (!user) {
    return null;
  }

  if (requiredRole === "admin" && user.tipo !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
