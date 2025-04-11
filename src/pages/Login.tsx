import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useClientContext } from '@/contexts/ClientContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Logo from '@/components/Logo';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').transform(val => val.trim()),
  password: z.string().min(1, 'Senha é obrigatória')
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, currentUser, isAdmin, isClientBlocked } = useAuthContext();
  const { clients } = useClientContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    setIsLoading(true);
    
    try {
      // Verificação especial para o admin (atalho)
      if (data.email === "admin" && data.password === "admin123") {
        const success = await login(data.email, data.password);
        if (success) {
          navigate('/dashboard');
        } else {
          setLoginError("Erro ao fazer login como administrador");
        }
        setIsLoading(false);
        return;
      }
      
      // Para usuários normais
      const success = await login(data.email, data.password);
      
      if (!success) {
        setLoginError("Email ou senha inválidos");
      } else {
        // Verificar se o cliente está bloqueado
        if (!isAdmin && isClientBlocked(clients)) {
          navigate('/access-blocked');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setLoginError("Erro ao fazer login. Tente novamente.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 transition-all">
        <div className="flex justify-center mb-10">
          <Logo />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">Login Extfire</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <Input 
                id="email"
                type="email"
                placeholder="Digite seu email"
                {...register("email")}
                autoComplete="email"
                className="pl-10 py-2 border-gray-300 focus:ring-extfire-red focus:border-extfire-red rounded-lg w-full transition-colors"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input 
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                {...register("password")}
                autoComplete="current-password"
                className="pl-10 py-2 border-gray-300 focus:ring-extfire-red focus:border-extfire-red rounded-lg w-full transition-colors"
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                onClick={toggleShowPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>
          
          {loginError && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">{loginError}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-extfire-red hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors duration-200 ease-in-out shadow-sm hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
          
          <div className="flex justify-end text-sm pt-2">
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800 transition-colors">
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
