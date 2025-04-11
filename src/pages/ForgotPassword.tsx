
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

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').transform(val => val.trim()),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const { resetPassword, currentUser } = useAuthContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setRequestError(null);
    setIsLoading(true);
    
    try {
      const success = await resetPassword(data.email);
      
      if (success) {
        setRequestSent(true);
      } else {
        setRequestError("Não foi possível enviar email de recuperação. Verifique se o email está correto.");
      }
    } catch (err) {
      setRequestError("Erro ao solicitar recuperação de senha. Tente novamente.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">Recuperar Senha</h1>
        
        {requestSent ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-green-600">
                Email enviado com instruções para redefinir sua senha.
              </p>
              <p className="text-green-600 mt-2">
                Verifique sua caixa de entrada e siga as instruções.
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/login')}
              className="mt-4"
            >
              Voltar para o Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            
            {requestError && (
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-red-600">{requestError}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-extfire-red hover:bg-red-600"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar Email de Recuperação"}
            </Button>
            
            <div className="text-center text-sm">
              <p className="text-gray-500">
                Lembrou da senha?{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-800">
                  Voltar para o Login
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
