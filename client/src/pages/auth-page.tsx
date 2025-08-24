import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ 
    name: "", 
    email: "", 
    password: "",
    confirmPassword: ""
  });

  // Redirect if already logged in - placed after all hooks
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: loginData.email,
        password: loginData.password,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        confirmPassword: registerData.confirmPassword,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/20 animate-pulse"></div>
        <div className="absolute top-40 right-16 w-24 h-24 rounded-full bg-white/15 animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-20 w-28 h-28 rounded-full bg-white/10 animate-pulse delay-2000"></div>
      </div>

      <div className="min-h-screen flex flex-col relative z-10 max-w-md mx-auto">
        {/* Header */}
        <div className="pt-16 pb-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
            <i className="fas fa-graduation-cap text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">StudyGenius</h1>
          <p className="text-white/80 text-sm">Your AI-powered study companion</p>
        </div>

        {/* Auth Forms */}
        <div className="flex-1 px-6">
          <div className="glass-card rounded-3xl p-6 backdrop-blur-lg bg-white/25 border border-white/18">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10 backdrop-blur-sm">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                  data-testid="tab-login"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                  data-testid="tab-register"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-white font-medium mb-2 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-email-login"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white font-medium mb-2 block">Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-password-login"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02]"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label className="text-white font-medium mb-2 block">Full Name</Label>
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-name-register"
                    />
                  </div>

                  <div>
                    <Label className="text-white font-medium mb-2 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-email-register"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white font-medium mb-2 block">Password</Label>
                    <Input
                      type="password"
                      placeholder="Choose a password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-password-register"
                    />
                  </div>

                  <div>
                    <Label className="text-white font-medium mb-2 block">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/40 focus:border-white/40"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02]"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
