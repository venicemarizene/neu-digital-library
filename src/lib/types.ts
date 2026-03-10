import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  program: string;
  isAdmin: boolean;
  isBlocked: boolean;
}

export interface Document {
  id: string;
  filename: string;
  downloadURL: string;
  category: string;
  uploadedAt: Timestamp;
  uploaderId: string;
}

export interface DownloadLog {
  id: string;
  userId: string;
  documentId: string;
  downloadedAt: Timestamp;
  documentName?: string;
  userEmail?: string;
}
