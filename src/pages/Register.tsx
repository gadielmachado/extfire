import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Logo from '@/components/Logo';
import { Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').transform(val => val.trim()),
  password: z.string().min(6, 'Senha precisa ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { register: registerUser, currentUser } = useAuthContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setRegisterError(null);
    setIsLoading(true);
    
    try {
      const success = await registerUser(data.email, data.password, data.name);
      
      if (success) {
        navigate('/login');
      }
      // Não exibimos erro aqui porque o AuthContext já mostra uma mensagem
    } catch (err: any) {
      console.error("Register error:", err);
      
      // Verificar se o erro está relacionado a email já existente
      if (err.message && (
          err.message.includes("User already registered") || 
          err.message.includes("already registered") || 
          err.message.includes("already exists") || 
          err.message.includes("already in use"))) {
        
        setRegisterError("Este email já está cadastrado. Use a opção 'Esqueci minha senha' na página de login para recuperar seu acesso.");
      } else {
        setRegisterError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">Criar Conta</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input 
              id="name"
              placeholder="Digite seu nome"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              placeholder="Digite seu email"
              {...register("email")}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                {...register("password")}
                autoComplete="new-password"
              />
              <button 
                type="button"
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                onClick={toggleShowPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input 
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirme sua senha"
                {...register("confirmPassword")}
                autoComplete="new-password"
              />
              <button 
                type="button"
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                onClick={toggleShowConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          {registerError && (
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-sm text-red-600">{registerError}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-extfire-red hover:bg-red-600"
            disabled={isLoading}
          >
            {isLoading ? "Criando conta..." : "Criar Conta"}
          </Button>
          
          <div className="text-center text-sm">
            <p className="text-gray-500">
              Já possui uma conta?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-800">
                Faça login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
