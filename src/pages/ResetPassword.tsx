import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(100, 'A senha não pode ter mais de 100 caracteres'),
  confirmPassword: z.string()
    .min(1, 'Confirme sua senha')
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  // Ao carregar a página, verificar hash na URL (usado pelo Supabase para redefinição de senha)
  useEffect(() => {
    // O Supabase adiciona automaticamente um hash à URL quando o usuário clica no link de redefinição de senha
    // Não precisamos extrair manualmente, o método updateUser irá usar automaticamente
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setResetError(null);
    setIsLoading(true);
    
    try {
      // Usar a API do Supabase para atualizar a senha baseado no hash da URL
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        console.error("Erro ao redefinir senha:", error);
        
        if (error.message.includes('session expired') || error.message.includes('invalid token')) {
          setResetError("O link de redefinição de senha expirou. Solicite um novo link.");
        } else {
          setResetError("Erro ao redefinir senha: " + error.message);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Se a atualização foi bem-sucedida, mostrar mensagem de sucesso
      toast.success("Senha redefinida com sucesso!");
      setResetSuccess(true);
      
      // Aguardar um pouco antes de redirecionar para a página de login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err: any) {
      console.error("Erro na redefinição de senha:", err);
      setResetError("Erro ao redefinir senha: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 transition-all">
        <div className="flex justify-center mb-10">
          <Logo />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">Redefinir Senha</h1>
        
        {resetSuccess ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-green-600">
                Sua senha foi redefinida com sucesso!
              </p>
              <p className="text-green-600 mt-2">
                Você será redirecionado para a página de login em instantes.
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/login')}
              className="mt-4"
            >
              Ir para o Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Nova Senha</Label>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  {...register("password")}
                  className="pr-10"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirmar Senha</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua senha"
                  {...register("confirmPassword")}
                  className="pr-10"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            {resetError && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">{resetError}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-extfire-red hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors duration-200 ease-in-out shadow-sm hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Redefinir Senha"}
            </Button>
            
            <div className="flex justify-center text-sm pt-2">
              <Link to="/login" className="text-blue-600 hover:text-blue-800 transition-colors">
                Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 