"use client";

import { useAuth } from "@/contexts/auth-context";
import { Alert, Button, Card, Input, Label, toast } from "@heroui/react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Preencha todos os campos");
      return;
    }

    const success = await login(username, password);

    if (success) {
      toast("Login realizado com sucesso!", {
        description: "Bem-vindo ao sistema Senior.",
      });
      router.push("/");
    } else {
      setError("Usuário ou senha inválidos no sistema Senior");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex justify-center mb-6">
            <Image
              src="/logoPrisma.png"
              alt="Prisma Softwares"
              width={300}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <Card.Header className="space-y-1 pb-6">
            <Card.Title className="text-2xl text-center">
              Fazer Login
            </Card.Title>
            <Card.Description className="text-center">
              Entre com suas credenciais da Senior para acessar o sistema
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário Senior</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="user@prismaproducao.com.br"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert status="danger">
                  <Alert.Description>{error}</Alert.Description>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                isDisabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">Sistema de Autenticação Senior:</p>
                <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                  <p className="font-medium text-blue-600">
                    Credenciais Senior Platform
                  </p>
                  <p>Use suas credenciais da PlatformX Senior</p>
                  <p>
                    <strong>Exemplo:</strong> user@prismaproducao.com.br
                  </p>
                  <p className="text-xs text-gray-500">
                    Novos usuários serão automaticamente criados no sistema
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
