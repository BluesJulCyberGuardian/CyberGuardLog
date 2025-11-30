import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", credentials),
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      onLoginSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.error || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) =>
      apiRequest("POST", "/api/auth/register", data),
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "Your account has been created. You are now logged in.",
      });
      onLoginSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.error || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister) {
      if (!username || !email || !password) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
      registerMutation.mutate({ username, email, password });
    } else {
      if (!username || !password) {
        toast({
          title: "Error",
          description: "Please enter username and password",
          variant: "destructive",
        });
        return;
      }
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">CyberGuard</CardTitle>
          <CardDescription>
            {isRegister ? "Create a new account" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || registerMutation.isPending}
              data-testid={isRegister ? "button-register" : "button-login"}
            >
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setUsername("");
                setEmail("");
                setPassword("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-mode"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
