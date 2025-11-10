export interface Folder {
  id: string;
  clientId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

