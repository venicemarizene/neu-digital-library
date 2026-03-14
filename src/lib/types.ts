import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  program: string;
  isAdmin: boolean;
  isBlocked: boolean;
  onboardingComplete: boolean;
  createdAt?: Timestamp;
}

export interface Document {
  id: string;
  filename: string;
  downloadURL: string;
  category: string;
  uploadedAt: Timestamp;
  uploaderId: string;
  visibility?: 'ALL_CICS' | 'PROGRAM_SPECIFIC';
  targetProgram?: string;
  description?: string;
  storagePath?: string;
}

export interface DownloadLog {
  id: string;
  userId: string;
  documentId: string;
  downloadedAt: Timestamp;
  documentName?: string;
  userEmail?: string;
  action?: 'view' | 'download';
}
