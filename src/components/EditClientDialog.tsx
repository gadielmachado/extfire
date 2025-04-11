
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClientContext } from '@/contexts/ClientContext';
import { toast } from 'sonner';

const formSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ deve ter no mínimo 14 caracteres').regex(/^\d+$/, 'CNPJ deve conter apenas números'),
  name: z.string().min(3, 'Nome da empresa deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal(''))
});

type FormData = z.infer<typeof formSchema>;

interface EditClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditClientDialog: React.FC<EditClientDialogProps> = ({ isOpen, onClose }) => {
  const { updateClient, currentClientToEdit } = useClientContext();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: '',
      name: '',
      email: ''
    }
  });

  useEffect(() => {
    if (currentClientToEdit && isOpen) {
      reset({
        cnpj: currentClientToEdit.cnpj,
        name: currentClientToEdit.name,
        email: currentClientToEdit.email || ''
      });
    }
  }, [currentClientToEdit, isOpen, reset]);

  const onSubmit = (data: FormData) => {
    if (!currentClientToEdit) return;
    
    updateClient({
      ...currentClientToEdit,
      cnpj: data.cnpj,
      name: data.name,
      email: data.email || null
    });
    
    toast.success('Cliente atualizado com sucesso!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
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
            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input 
                id="email"
                type="email"
                placeholder="Digite o email"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
