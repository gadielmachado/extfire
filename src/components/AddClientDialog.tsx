import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClientContext } from '@/contexts/ClientContext';
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  cnpj: z.string().regex(/^\d*$/, 'CNPJ deve conter apenas números'),
  name: z.string().min(3, 'Nome da empresa deve ter pelo menos 3 caracteres'),
  createLoginCredentials: z.boolean().default(false),
  loginEmail: z.string().email('Email de login inválido').optional(),
  loginPassword: z.string().min(6, 'Senha de login deve ter pelo menos 6 caracteres').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddClientDialog: React.FC<AddClientDialogProps> = ({ isOpen, onClose }) => {
  const { addClient } = useClientContext();
  const { currentUser } = useAuthContext();
  const [isCreatingCredentials, setIsCreatingCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: '',
      name: '',
      createLoginCredentials: false,
      loginEmail: '',
      loginPassword: '',
    }
  });

  const createLoginCredentials = watch('createLoginCredentials');

  const handleCheckboxChange = (checked: boolean) => {
    setValue('createLoginCredentials', checked);
    setIsCreatingCredentials(checked);
  };

  const resetUserPassword = async (email: string, newPassword: string) => {
    try {
      // Recuperar o UUID do usuário pelo email
      const { data: adminAuthData } = await supabase.auth.getUser();
      
      if (!adminAuthData?.user) {
        toast.error("Não foi possível autenticar para redefinir a senha");
        return false;
      }
      
      // Como não podemos acessar diretamente a tabela auth.users sem direitos de admin,
      // vamos usar uma alternativa: redefinir a senha através da API de admin
      const { error } = await supabase.auth.admin.updateUserById(
        adminAuthData.user.id, 
        { password: newPassword }
      );
      
      if (error) {
        console.error("Erro ao redefinir senha:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return false;
    }
  };

  const handlePasswordResetConfirm = async () => {
    if (!pendingFormData) return;
    
    setIsLoading(true);
    
    try {
      // Criar o cliente primeiro para ter o ID
      const newClient = {
        id: crypto.randomUUID(), // Usar UUID para maior consistência
        cnpj: pendingFormData.cnpj,
        name: pendingFormData.name,
        password: pendingFormData.loginPassword!,
        email: pendingFormData.loginEmail!,
        maintenanceDate: null,
        isBlocked: false,
        documents: [],
        userRole: 'client',
        userEmail: pendingFormData.loginEmail!,
      };
      
      // Vamos tentar uma abordagem alternativa para resolver o problema
      // Vamos fazer o cadastro de um novo usuário, para isso precisamos remover o usuário antigo primeiro
      
      // 1. Tenta encontrar e remover o usuário existente pelo email
      try {
        // Tenta remover pelo email usando metadados - pode não funcionar sem privilégios de admin
        // Esta é uma operação aproximada, se falhar continuamos com o fluxo
        await supabase.rpc('delete_user_by_email', { 
          user_email: pendingFormData.loginEmail 
        });
      } catch (error) {
        console.log("Tentativa de remover usuário existente falhou, continuando fluxo:", error);
      }
      
      // 2. Tenta criar um novo usuário com o mesmo email e nova senha
      const { error: signUpError } = await supabase.auth.signUp({
        email: pendingFormData.loginEmail!,
        password: pendingFormData.loginPassword!,
        options: {
          data: {
            name: pendingFormData.name,
            cnpj: pendingFormData.cnpj,
            role: 'client',
            clientId: newClient.id // Associar o usuário ao cliente
          }
        }
      });
      
      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("Não foi possível redefinir a senha. Entre em contato com um administrador.");
          setIsLoading(false);
          return;
        }
        
        toast.error("Erro ao criar credenciais: " + signUpError.message);
        setIsLoading(false);
        return;
      }
      
      // 3. Adicionar o cliente ao contexto
      addClient(newClient);
      
      toast.success('Cliente adicionado com sucesso e credenciais atualizadas!');
      reset();
      onClose();
      setShowPasswordResetDialog(false);
      setPendingFormData(null);
    } catch (error: any) {
      toast.error("Erro ao processar cliente: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  // Função para tentar lidar com um email já registrado
  const handleExistingEmail = async (email: string, password: string, clientData: any) => {
    try {
      // Primeiro, tentar atualizar os metadados do usuário para incluir o clientId
      try {
        // Importar a função para atualizar metadados
        const { updateUserMetadata } = await import('@/lib/supabaseAdmin');
        
        // Atualizar os metadados do usuário para incluir o clientId e informações do cliente
        const metadataUpdated = await updateUserMetadata(email, {
          clientId: clientData.id,
          role: 'client',
          cnpj: clientData.cnpj,
          name: clientData.name
        });
        
        if (metadataUpdated) {
          console.log(`Metadados do usuário ${email} atualizados com sucesso para o cliente ${clientData.id}`);
        } else {
          console.warn(`Não foi possível atualizar os metadados do usuário ${email}`);
        }
      } catch (error) {
        console.error("Erro ao tentar atualizar metadados:", error);
      }
      
      // Verificar se deseja redefinir a senha
      setPendingFormData(clientData);
      setShowPasswordResetConfirm(true);
    } catch (error) {
      console.error("Erro ao processar email existente:", error);
      toast.error("Erro ao processar o email existente");
    }
  };

  // Função principal para adicionar um novo cliente
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Verificar se o cliente está criando credenciais de acesso e tem senha definida
      if (data.createLoginCredentials && (!data.loginEmail || !data.loginPassword)) {
        toast.error("É necessário informar email e senha de login para criar credenciais de acesso");
        setIsLoading(false);
        return;
      }
      
      // VALIDAÇÃO: Verificar se CNPJ já existe
      const { data: existingClient, error: cnpjCheckError } = await supabase
        .from('clients')
        .select('id, name, cnpj')
        .eq('cnpj', data.cnpj)
        .maybeSingle();
      
      if (cnpjCheckError && cnpjCheckError.code !== 'PGRST116') {
        console.error('Erro ao verificar CNPJ:', cnpjCheckError);
        toast.error('Erro ao verificar CNPJ. Tente novamente.');
        setIsLoading(false);
        return;
      }
      
      if (existingClient) {
        toast.error(`CNPJ ${data.cnpj} já está cadastrado para o cliente: ${existingClient.name}`);
        setIsLoading(false);
        return;
      }
      
      // VALIDAÇÃO: Verificar se email já existe (se fornecido)
      if (data.createLoginCredentials && data.loginEmail) {
        const { data: existingEmailClient, error: emailCheckError } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('email', data.loginEmail)
          .maybeSingle();
        
        if (emailCheckError && emailCheckError.code !== 'PGRST116') {
          console.error('Erro ao verificar email:', emailCheckError);
          toast.error('Erro ao verificar email. Tente novamente.');
          setIsLoading(false);
          return;
        }
        
        if (existingEmailClient) {
          toast.error(`Email ${data.loginEmail} já está cadastrado para o cliente: ${existingEmailClient.name}`);
          setIsLoading(false);
          return;
        }
      }
      
      // Gerar ID do cliente antes de criar credenciais
      const clientId = crypto.randomUUID();
      
      const newClient = {
        id: clientId,
        cnpj: data.cnpj,
        name: data.name,
        password: data.createLoginCredentials ? data.loginPassword! : '', // Usa a senha de login como senha do cliente
        email: data.createLoginCredentials ? data.loginEmail! : null,
        maintenanceDate: data.maintenanceDate,
        isBlocked: false,
        documents: [],
        userRole: 'client',
        userEmail: data.createLoginCredentials ? data.loginEmail! : null,
      };
      
      // Se o cliente deseja criar credenciais de acesso
      if (data.createLoginCredentials) {
        try {
          // Importar a função de criação/atualização de usuário
          const { signUpOrUpdateUser } = await import('@/lib/clientService');
          
          // Tentar registrar o usuário no Supabase
          const { success, operation } = await signUpOrUpdateUser(
            data.loginEmail!,
            data.loginPassword!,
            {
              name: data.name,
              cnpj: data.cnpj,
              clientId: clientId // Importante: usar o ID do cliente para associação
            }
          );
          
          if (!success) {
            // Se o processo falhar ao tentar criar/atualizar o usuário
            toast.error("Erro ao criar credenciais de acesso. O cliente foi criado, mas não terá acesso ao sistema.");
          } else {
            // Se o usuário foi criado ou atualizado com sucesso
            if (operation === 'created') {
              toast.success("Credenciais de acesso criadas com sucesso. Um email de confirmação foi enviado.");
            } else if (operation === 'updated') {
              toast.success("Credenciais de acesso atualizadas com sucesso.");
            }
          }
        } catch (error) {
          console.error("Erro ao criar credenciais:", error);
          toast.error("Erro ao criar credenciais de acesso. O cliente foi criado, mas não terá acesso ao sistema.");
        }
      }
      
      // Adicionar o cliente independentemente do sucesso da criação de credenciais
      addClient(newClient);
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error("Erro ao adicionar cliente");
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input 
                id="cnpj"
                placeholder="Digite o CNPJ (apenas números)"
                {...register("cnpj")}
              />
              {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input 
                id="name"
                placeholder="Digite o nome da empresa"
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
              
              {/* Criar credenciais de login */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="createLoginCredentials" 
                  checked={createLoginCredentials}
                  onCheckedChange={handleCheckboxChange}
                  {...register("createLoginCredentials")}
                />
                <Label htmlFor="createLoginCredentials">Criar credenciais de acesso para este cliente</Label>
              </div>

              {createLoginCredentials && (
                <>
            <div className="grid gap-2">
                    <Label htmlFor="loginEmail">Email de login</Label>
              <Input 
                      id="loginEmail"
                      type="email"
                      placeholder="Digite o email de login"
                      {...register("loginEmail")}
                    />
                    {errors.loginEmail && <p className="text-xs text-red-500">{errors.loginEmail.message}</p>}
            </div>
            <div className="grid gap-2">
                    <Label htmlFor="loginPassword">Senha de login</Label>
              <Input 
                      id="loginPassword"
                      type="password"
                      placeholder="Digite a senha de login"
                      {...register("loginPassword")}
                    />
                    {errors.loginPassword && <p className="text-xs text-red-500">{errors.loginPassword.message}</p>}
                    <p className="text-xs text-gray-500">
                      Se este email já foi registrado anteriormente, o sistema irá solicitar a atualização das credenciais. 
                      Esta ação funciona como uma redefinição de senha feita pelo administrador.
                    </p>
            </div>
                </>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isLoading ? "Adicionando..." : "Adicionar"}
              </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      {/* Diálogo de confirmação para redefinição de senha */}
      <AlertDialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este email já está registrado</AlertDialogTitle>
            <AlertDialogDescription>
              O email informado já possui uma conta, mas com senha diferente. 
              Deseja atualizar as credenciais e continuar com a adição do cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLoading(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePasswordResetConfirm}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Sim, atualizar credenciais"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddClientDialog;
