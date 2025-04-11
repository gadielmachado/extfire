import { Document } from './document';

export interface Client {
  id: string;
  cnpj: string;
  name: string;
  password: string;
  email: string | null;
  maintenanceDate: Date | null;
  isBlocked: boolean;
  documents: Document[];
  userRole?: 'admin' | 'client';
  userEmail?: string | null;
}
