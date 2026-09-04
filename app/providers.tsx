"use client";

import { ConfirmacaoProvider } from "@/components/confirmacao";
import { AuthProvider } from "@/contexts/auth-context";
import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import type React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <ConfirmacaoProvider>{children}</ConfirmacaoProvider>
        <Toast.Provider />
      </AuthProvider>
    </ThemeProvider>
  );
}
