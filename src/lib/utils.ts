import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import type { Document as DocumentType } from "@/types/document"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para fazer upload de arquivo para o Supabase Storage
export async function uploadFileToStorage(file: File, clientId: string): Promise<string | null> {
  try {
    // Criar um nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    // Remover 'documents/' pois o bucket já se chama 'documents'
    const filePath = fileName

    // Fazer upload para o bucket "documents"
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Erro ao fazer upload do arquivo:', uploadError)
      toast.error('Erro ao fazer upload do arquivo')
      return null
    }

    // Gerar URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Erro ao processar o arquivo:', error)
    toast.error('Erro ao processar o arquivo')
    return null
  }
}

// Função para deletar um arquivo do Storage
export async function deleteFileFromStorage(fileUrl: string): Promise<boolean> {
  try {
    // Extrair o caminho do arquivo da URL pública
    const url = new URL(fileUrl)
    const path = url.pathname.split('/').slice(2).join('/')
    
    // Deletar o arquivo
    const { error } = await supabase.storage
      .from('documents')
      .remove([path])
    
    if (error) {
      console.error('Erro ao deletar arquivo:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return false
  }
}

// Função para obter uma URL de download assinada
export async function getSignedUrl(fileUrl: string): Promise<string | null> {
  try {
    console.log('URL original:', fileUrl);
    
    // Extração mais robusta do caminho
    let path;
    try {
      const url = new URL(fileUrl);
      console.log('URL parseada:', url.toString());
      console.log('Pathname:', url.pathname);
      
      // Remover 'storage/v1/object/public' do início do pathname
      if (url.pathname.includes('storage/v1/object/public')) {
        path = url.pathname.split('storage/v1/object/public/')[1];
      } else {
        // Fallback para a extração anterior
        path = url.pathname.split('/').slice(2).join('/');
      }
      
      console.log('Caminho extraído:', path);
    } catch (e) {
      console.error('Erro ao extrair caminho da URL:', e);
      
      // Abordagem alternativa se a URL não puder ser analisada
      const parts = fileUrl.split('/');
      const bucketIndex = parts.indexOf('documents');
      if (bucketIndex >= 0) {
        path = parts.slice(bucketIndex).join('/');
      } else {
        console.error('Não foi possível determinar o caminho do arquivo');
        return null;
      }
    }
    
    // Tentar obter URL assinada
    console.log('Solicitando URL assinada para:', path);
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 3600); // URL válida por 1 hora
    
    if (error) {
      console.error('Erro ao criar URL assinada:', error);
      return null;
    }
    
    console.log('URL assinada gerada:', data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Erro geral ao obter URL assinada:', error);
    return null;
  }
}

// Alternativa de download direto
export async function downloadFile(fileUrl: string, fileName: string): Promise<boolean> {
  try {
    console.log('URL para download direto:', fileUrl);
    
    // Extrair o caminho
    let path;
    try {
      const url = new URL(fileUrl);
      if (url.pathname.includes('storage/v1/object/public')) {
        path = url.pathname.split('storage/v1/object/public/')[1];
      } else {
        path = url.pathname.split('/').slice(2).join('/');
      }
    } catch (e) {
      const parts = fileUrl.split('/');
      const bucketIndex = parts.indexOf('documents');
      if (bucketIndex >= 0) {
        path = parts.slice(bucketIndex).join('/');
      } else {
        return false;
      }
    }
    
    console.log('Caminho para download:', path);
    
    // Baixar arquivo diretamente
    const { data, error } = await supabase.storage
      .from('documents')
      .download(path);
    
    if (error) {
      console.error('Erro ao baixar arquivo:', error);
      return false;
    }
    
    // Criar blob e iniciar download
    const blob = new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Erro geral ao baixar arquivo:', error);
    return false;
  }
}

// Nova função simplificada de download (adicione ao final do arquivo)
export async function downloadFileDirectly(doc: DocumentType): Promise<boolean> {
  try {
    console.clear(); // Limpa os logs anteriores para depuração mais clara
    console.log('Iniciando download direto para:', doc.name);
    
    // Extrair o clientId e o nome do arquivo da URL
    const fileUrl = doc.fileUrl;
    console.log('URL do arquivo:', fileUrl);
    
    // Padrão esperado em fileUrl: https://[supabase-url]/storage/v1/object/public/documents/[clientId]/[timestamp]-[random].[ext]
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1]; // Pega apenas o nome do arquivo
    
    // Encontrar 'documents' no caminho para extrair o restante do caminho
    const documentsIndex = urlParts.indexOf('documents');
    if (documentsIndex === -1) {
      console.error('Estrutura da URL não reconhecida');
      return false;
    }
    
    // Construir o caminho do arquivo (documents/clientId/filename)
    const filePath = urlParts.slice(documentsIndex).join('/');
    console.log('Caminho extraído para download:', filePath);
    
    // Usar o método download do Supabase diretamente
    const { data, error } = await supabase.storage
      .from('') // bucket vazio - o bucket já está incluído no filePath
      .download(filePath);
    
    if (error) {
      console.error('Erro Supabase ao baixar:', error);
      return false;
    }
    
    // Criar blob e iniciar download no navegador
    const blob = new Blob([data]);
    const downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar a URL do objeto após o download
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    
    return true;
  } catch (error) {
    console.error('Erro fatal durante o download:', error);
    return false;
  }
}
