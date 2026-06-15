"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">TechHub</h1>

          <Badge variant={user.tipo === "admin" ? "default" : "secondary"}>
            {user.tipo === "admin" ? "Administrador" : "Usuário"}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user.nome}</p>
                <p className="text-xs text-gray-500">{user.departamento}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-full">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user.nome}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>

            {user.tipo === "admin" && <DropdownMenuSeparator />}

            {user.tipo === "admin" && (
              <DropdownMenuItem asChild>
                <Link
                  href="/admin"
                  className="flex items-center cursor-pointer"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Painel Admin
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={logout}
              className="!text-red-500 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
