"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import {
  Badge,
  Button,
  Dropdown,
  Header,
  Label,
  Separator,
} from "@heroui/react";
import { LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">TechHub</h1>

          <Badge variant={user.tipo === "admin" ? "primary" : "secondary"}>
            {user.tipo === "admin" ? "Administrador" : "Usuário"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Dropdown>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user.nome}</p>
                <p className="text-xs text-muted">{user.departamento}</p>
              </div>
            </Button>

            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "admin") router.push("/admin");
                  if (key === "logout") logout();
                }}
              >
                <Dropdown.Section>
                  <Header>
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </Header>
                </Dropdown.Section>

                {user.tipo === "admin" && <Separator />}

                {user.tipo === "admin" && (
                  <Dropdown.Section>
                    <Dropdown.Item id="admin" textValue="Painel Admin">
                      <Shield className="w-4 h-4 mr-2" />
                      <Label>Painel Admin</Label>
                    </Dropdown.Item>
                  </Dropdown.Section>
                )}

                <Separator />

                <Dropdown.Section>
                  <Dropdown.Item id="logout" textValue="Sair" variant="danger">
                    <LogOut className="w-4 h-4 mr-2" />
                    <Label>Sair</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </nav>
  );
}
