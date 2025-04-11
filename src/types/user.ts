export interface User {
  id: string;
  cnpj: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  clientId: string | null;
}
