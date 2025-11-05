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
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background com gradiente moderno e padrão sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(229,57,53,0.08),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.08),transparent_50%)]"></div>
      
      {/* Padrão de pontos decorativo */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 md:p-10 transition-all duration-300 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
          {/* Logo com animação sutil */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-br from-extfire-red/10 to-red-50 rounded-2xl inline-block transform transition-all duration-500 hover:scale-105">
              <Logo />
            </div>
          </div>
          
          {/* Título melhorado */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-gray-500 font-medium">Faça login para continuar</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Campo Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 transition-colors duration-200 ${errors.email ? 'text-red-500' : 'text-gray-400 group-focus-within:text-extfire-red'}`} />
                </div>
                <Input 
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register("email")}
                  autoComplete="email"
                  className={`pl-12 h-12 border-2 transition-all duration-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-extfire-red focus:ring-2 focus:ring-extfire-red/20 ${
                    errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>
            
            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                Senha
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors duration-200 ${errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-extfire-red'}`} />
                </div>
                <Input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  autoComplete="current-password"
                  className={`pl-12 pr-12 h-12 border-2 transition-all duration-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-extfire-red focus:ring-2 focus:ring-extfire-red/20 ${
                    errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={toggleShowPassword}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>
            
            {/* Mensagem de erro melhorada */}
            {loginError && (
              <div className="bg-red-50/80 backdrop-blur-sm p-4 rounded-xl border-2 border-red-200 animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{loginError}</p>
                </div>
              </div>
            )}
            
            {/* Botão de login melhorado */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-extfire-red to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </Button>
            
            {/* Link de esqueci senha */}
            <div className="flex justify-center pt-2">
              <Link 
                to="/forgot-password" 
                className="text-sm text-gray-600 hover:text-extfire-red font-medium transition-colors duration-200 hover:underline underline-offset-2"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </div>
        
        {/* Rodapé sutil */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © 2025 Extfire. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
