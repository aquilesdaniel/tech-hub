"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  Spinner,
  toast,
} from "@heroui/react";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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

        <Card>
          <Card.Header>
            <Card.Title>Fazer Login</Card.Title>
            <Card.Description>
              Entre com suas credenciais da PlatformX Sênior para acessar o
              sistema
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="username">Usuário Sênior</Label>
                <Input
                  id="username"
                  type="text"
                  variant="secondary"
                  placeholder="user@prismaproducao.com.br"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    variant="secondary"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
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

              <Button type="submit" fullWidth size="lg" isDisabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="text-white" />
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn />
                    Entrar
                  </div>
                )}
              </Button>
            </form>

            <div className="text-sm space-y-2 mt-3">
              <p>Sistema de Autenticação Sênior:</p>

              <Card variant="secondary">
                <p>
                  <strong>Exemplo:</strong> user@prismaproducao.com.br
                </p>
                <p className="text-xs">
                  Novos usuários serão automaticamente criados no sistema
                </p>
              </Card>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
