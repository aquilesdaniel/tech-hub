"use client";

import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import type React from "react";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        {children}
        <Toast.Provider />
      </AuthProvider>
    </ThemeProvider>
  );
}
